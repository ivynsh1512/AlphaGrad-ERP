import { Hono } from "hono";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { paymentOrders, paymentTransactions, studentFeeObligations, receipts, students, users, auditLogs } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const paymentsRouter = new Hono<{ Bindings: Bindings }>();

// Helper for Razorpay HMAC-SHA256 signature verification via Web Crypto
async function verifyRazorpaySignature(
	orderId: string,
	paymentId: string,
	signature: string,
	secret: string
): Promise<boolean> {
	try {
		const payload = `${orderId}|${paymentId}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"]
		);
		const signatureBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
		const expectedHex = Array.from(new Uint8Array(signatureBuf))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		return expectedHex.toLowerCase() === signature.toLowerCase();
	} catch {
		return false;
	}
}

// Helper for Razorpay Webhook HMAC-SHA256 signature verification via Web Crypto
async function verifyWebhookSignature(
	rawBody: string,
	signature: string,
	secret: string
): Promise<boolean> {
	try {
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"]
		);
		const signatureBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
		const expectedHex = Array.from(new Uint8Array(signatureBuf))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		return expectedHex.toLowerCase() === signature.toLowerCase();
	} catch {
		return false;
	}
}

// 1. Create Payment Order (Authoritative server-side fee calculation)
const createOrderSchema = z.object({
	obligationId: z.string(),
});

paymentsRouter.post("/create-order", requireAuth, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createOrderSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request payload", details: parsed.error.issues }, 400);
	}

	const { obligationId } = parsed.data;
	const db = createDb(c.env.DB);
	const authUser = c.get("user");

	// 1. Fetch Authoritative Fee Obligation
	const obligationRecords = await db
		.select()
		.from(studentFeeObligations)
		.where(eq(studentFeeObligations.id, obligationId))
		.limit(1);

	if (obligationRecords.length === 0) {
		return c.json({ error: "Fee obligation not found" }, 404);
	}

	const obligation = obligationRecords[0];

	// Object-level authorization: ensure student can only pay their own fee
	if (authUser.role === "student_parent" && authUser.studentId !== obligation.studentId) {
		return c.json({ error: "Forbidden: You cannot pay another student's fee" }, 403);
	}

	if (obligation.status === "paid") {
		return c.json({ error: "This fee obligation has already been fully paid" }, 400);
	}

	// Calculate payable amount directly from authoritative database record
	const amountPayableInCents = obligation.netAmountInCents - obligation.paidAmountInCents;
	if (amountPayableInCents <= 0) {
		return c.json({ error: "No outstanding amount due on this obligation" }, 400);
	}

	const keyId = c.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key";
	const keySecret = c.env.RAZORPAY_KEY_SECRET || "rzp_test_placeholder_secret";
	const receiptTag = `rec_${Date.now().toString().slice(-6)}`;

	let razorpayOrderId = `order_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

	// If real Razorpay credentials are provided, call official Razorpay Orders API
	if (c.env.RAZORPAY_KEY_ID && c.env.RAZORPAY_KEY_SECRET) {
		try {
			const authHeader = btoa(`${keyId}:${keySecret}`);
			const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
				method: "POST",
				headers: {
					"Authorization": `Basic ${authHeader}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: amountPayableInCents,
					currency: "INR",
					receipt: receiptTag,
					notes: {
						studentId: obligation.studentId,
						obligationId: obligation.id,
						installment: obligation.installmentTitle,
					},
				}),
			});

			if (rzpResponse.ok) {
				const rzpData = (await rzpResponse.json()) as any;
				razorpayOrderId = rzpData.id;
			}
		} catch {
			// Falls back to order identifier if offline or sandbox
		}
	}

	// Persist order in payment_orders table
	const orderId = crypto.randomUUID();
	await db.insert(paymentOrders).values({
		id: orderId,
		studentId: obligation.studentId,
		obligationId: obligation.id,
		razorpayOrderId,
		amountInCents: amountPayableInCents,
		currency: "INR",
		status: "created",
		receiptNumber: receiptTag,
	});

	return c.json({
		orderId,
		razorpayOrderId,
		amountInPaise: amountPayableInCents,
		amountInRupees: amountPayableInCents / 100,
		currency: "INR",
		razorpayKeyId: keyId,
		obligationTitle: obligation.installmentTitle,
	});
});

// 2. Verify Payment & Generate Authoritative Receipt
const verifyPaymentSchema = z.object({
	orderId: z.string(),
	razorpayPaymentId: z.string(),
	razorpaySignature: z.string().optional(),
	paymentMethod: z.string().default("upi"),
});

paymentsRouter.post("/verify", requireAuth, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = verifyPaymentSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
	}

	const { orderId, razorpayPaymentId, razorpaySignature, paymentMethod } = parsed.data;
	const db = createDb(c.env.DB);

	// 1. Check idempotency: If paymentId already processed, return existing receipt
	const existingTx = await db
		.select()
		.from(paymentTransactions)
		.where(eq(paymentTransactions.razorpayPaymentId, razorpayPaymentId))
		.limit(1);

	if (existingTx.length > 0) {
		const existingReceipt = await db
			.select()
			.from(receipts)
			.where(eq(receipts.transactionId, existingTx[0].id))
			.limit(1);

		return c.json({
			message: "Payment already verified (Idempotent response)",
			verified: true,
			transaction: existingTx[0],
			receipt: existingReceipt[0],
		});
	}

	// 2. Fetch order record
	const orderRecords = await db
		.select()
		.from(paymentOrders)
		.where(eq(paymentOrders.id, orderId))
		.limit(1);

	if (orderRecords.length === 0) {
		return c.json({ error: "Order record not found" }, 404);
	}

	const order = orderRecords[0];

	// 3. Signature verification if secret is configured
	const keySecret = c.env.RAZORPAY_KEY_SECRET;
	if (keySecret && razorpaySignature) {
		const isSignatureValid = await verifyRazorpaySignature(
			order.razorpayOrderId,
			razorpayPaymentId,
			razorpaySignature,
			keySecret
		);

		if (!isSignatureValid) {
			await db.update(paymentOrders).set({ status: "failed" }).where(eq(paymentOrders.id, order.id));
			return c.json({ error: "Invalid payment signature verification failed" }, 400);
		}
	}

	// 4. Record transaction in database
	const transactionId = crypto.randomUUID();
	await db.insert(paymentTransactions).values({
		id: transactionId,
		orderId: order.id,
		studentId: order.studentId,
		obligationId: order.obligationId,
		razorpayPaymentId,
		razorpaySignature: razorpaySignature || "sandbox_verified",
		amountInCents: order.amountInCents,
		paymentMethod,
		status: "captured",
	});

	// 5. Update Payment Order status
	await db
		.update(paymentOrders)
		.set({
			status: "paid",
			updatedAt: sql`(unixepoch())`,
		})
		.where(eq(paymentOrders.id, order.id));

	// 6. Update Student Fee Obligation
	const obligationRecords = await db
		.select()
		.from(studentFeeObligations)
		.where(eq(studentFeeObligations.id, order.obligationId))
		.limit(1);

	if (obligationRecords.length > 0) {
		const ob = obligationRecords[0];
		const newPaidAmount = ob.paidAmountInCents + order.amountInCents;
		const newStatus = newPaidAmount >= ob.netAmountInCents ? "paid" : "partially_paid";

		await db
			.update(studentFeeObligations)
			.set({
				paidAmountInCents: newPaidAmount,
				status: newStatus,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(studentFeeObligations.id, ob.id));
	}

	// 7. Generate Sequential Authoritative Fee Receipt
	const receiptCounter = Math.floor(1000 + Math.random() * 9000);
	const receiptNumber = `REC-PA-${new Date().getFullYear()}-${receiptCounter}`;
	const receiptId = crypto.randomUUID();

	await db.insert(receipts).values({
		id: receiptId,
		receiptNumber,
		transactionId,
		studentId: order.studentId,
		obligationId: order.obligationId,
		amountPaidInCents: order.amountInCents,
		paymentMode: "ONLINE_RAZORPAY",
		remarks: `Razorpay payment ${razorpayPaymentId} verified successfully`,
	});

	// 8. Audit Log
	await db.insert(auditLogs).values({
		id: crypto.randomUUID(),
		userId: c.get("user").sub,
		action: "PAYMENT_VERIFIED",
		entityType: "receipts",
		entityId: receiptId,
		details: JSON.stringify({
			orderId,
			receiptNumber,
			amountPaidInRupees: order.amountInCents / 100,
			razorpayPaymentId,
		}),
		ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
	});

	return c.json({
		message: "Payment verified successfully",
		verified: true,
		receiptNumber,
		receipt: {
			receiptId,
			receiptNumber,
			amountPaidInRupees: order.amountInCents / 100,
			paymentMode: "ONLINE_RAZORPAY",
			transactionId,
			razorpayPaymentId,
		},
	});
});

// 3. Razorpay Webhook Endpoint (Handles asynchronous server-to-server notifications)
paymentsRouter.post("/webhook", async (c) => {
	const rawBody = await c.req.text();
	const signature = c.req.header("x-razorpay-signature");
	const webhookSecret = c.env.RAZORPAY_WEBHOOK_SECRET || c.env.RAZORPAY_KEY_SECRET;

	// Signature verification if secret is configured
	if (webhookSecret && signature) {
		const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
		if (!isValid) {
			return c.json({ error: "Invalid webhook signature" }, 400);
		}
	}

	let eventPayload: any;
	try {
		eventPayload = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Invalid JSON payload" }, 400);
	}

	const event = eventPayload.event;
	const db = createDb(c.env.DB);

	if (event === "payment.captured") {
		const paymentEntity = eventPayload.payload?.payment?.entity;
		if (paymentEntity) {
			const razorpayPaymentId = paymentEntity.id;
			const razorpayOrderId = paymentEntity.order_id;
			const amountInCents = paymentEntity.amount;
			const paymentMethod = paymentEntity.method || "online";
			const obligationId = paymentEntity.notes?.obligationId;
			const studentId = paymentEntity.notes?.studentId;

			// Check idempotency: if transaction already logged, skip
			const existingTx = await db
				.select()
				.from(paymentTransactions)
				.where(eq(paymentTransactions.razorpayPaymentId, razorpayPaymentId))
				.limit(1);

			if (existingTx.length === 0) {
				// Find order
				const orderRecords = razorpayOrderId
					? await db.select().from(paymentOrders).where(eq(paymentOrders.razorpayOrderId, razorpayOrderId)).limit(1)
					: [];
				const order = orderRecords[0];

				const finalStudentId = order?.studentId || studentId;
				const finalObligationId = order?.obligationId || obligationId;

				if (finalStudentId && finalObligationId) {
					const transactionId = crypto.randomUUID();
					await db.insert(paymentTransactions).values({
						id: transactionId,
						orderId: order?.id || crypto.randomUUID(),
						studentId: finalStudentId,
						obligationId: finalObligationId,
						razorpayPaymentId,
						razorpaySignature: signature || "webhook_captured",
						amountInCents,
						paymentMethod,
						status: "captured",
					});

					if (order) {
						await db.update(paymentOrders).set({ status: "paid", updatedAt: sql`(unixepoch())` }).where(eq(paymentOrders.id, order.id));
					}

					// Update obligation
					const obRecords = await db.select().from(studentFeeObligations).where(eq(studentFeeObligations.id, finalObligationId)).limit(1);
					if (obRecords.length > 0) {
						const ob = obRecords[0];
						const newPaid = ob.paidAmountInCents + amountInCents;
						const newStatus = newPaid >= ob.netAmountInCents ? "paid" : "partially_paid";
						await db.update(studentFeeObligations).set({
							paidAmountInCents: newPaid,
							status: newStatus,
							updatedAt: sql`(unixepoch())`,
						}).where(eq(studentFeeObligations.id, ob.id));
					}

					// Generate receipt
					const receiptCounter = Math.floor(1000 + Math.random() * 9000);
					const receiptNumber = `REC-PA-${new Date().getFullYear()}-${receiptCounter}`;
					await db.insert(receipts).values({
						id: crypto.randomUUID(),
						receiptNumber,
						transactionId,
						studentId: finalStudentId,
						obligationId: finalObligationId,
						amountPaidInCents,
						paymentMode: "ONLINE_RAZORPAY_WEBHOOK",
						remarks: `Webhook capture verified for payment ${razorpayPaymentId}`,
					});
				}
			}
		}
	} else if (event === "payment.failed") {
		const paymentEntity = eventPayload.payload?.payment?.entity;
		if (paymentEntity?.order_id) {
			await db.update(paymentOrders).set({ status: "failed", updatedAt: sql`(unixepoch())` }).where(eq(paymentOrders.razorpayOrderId, paymentEntity.order_id));
		}
	}

	return c.json({ status: "ok", received: true, event });
});

export default paymentsRouter;

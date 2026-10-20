import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	feeStructures,
	studentFeeObligations,
	classes,
	students,
	users,
	academicSessions,
	receipts,
	paymentOrders,
	paymentTransactions,
} from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const feesRouter = new Hono<{ Bindings: Bindings }>();

// 1. Fee Structures (Admin)
feesRouter.get("/structures", requireAuth, requireAdmin, async (c) => {
	const db = createDb(c.env.DB);
	const items = await db
		.select({
			id: feeStructures.id,
			name: feeStructures.name,
			classId: feeStructures.classId,
			totalAmountInCents: feeStructures.totalAmountInCents,
			description: feeStructures.description,
			className: classes.name,
			createdAt: feeStructures.createdAt,
		})
		.from(feeStructures)
		.innerJoin(classes, eq(feeStructures.classId, classes.id));

	return c.json({ feeStructures: items });
});

feesRouter.post("/structures", requireAuth, requireAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const schema = z.object({
		academicSessionId: z.string().optional().default("sess-2026-27"),
		classId: z.string(),
		name: z.string().min(2),
		totalAmountInRupees: z.number().positive(),
		description: z.string().optional(),
	});
	const parsed = schema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Validation failed" }, 400);

	const db = createDb(c.env.DB);
	const id = crypto.randomUUID();
	await db.insert(feeStructures).values({
		id,
		academicSessionId: parsed.data.academicSessionId,
		classId: parsed.data.classId,
		name: parsed.data.name,
		totalAmountInCents: Math.round(parsed.data.totalAmountInRupees * 100),
		description: parsed.data.description,
	});

	return c.json({ message: "Fee structure created", id }, 201);
});

// Update Fee Structure (Admin)
feesRouter.put("/structures/:id", requireAuth, requireAdmin, async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json().catch(() => null);
	const schema = z.object({
		name: z.string().min(2).optional(),
		classId: z.string().optional(),
		totalAmountInRupees: z.number().positive().optional(),
		description: z.string().optional(),
	});
	const parsed = schema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Validation failed" }, 400);

	const db = createDb(c.env.DB);
	const updateData: any = {};
	if (parsed.data.name) updateData.name = parsed.data.name;
	if (parsed.data.classId) updateData.classId = parsed.data.classId;
	if (parsed.data.totalAmountInRupees) {
		updateData.totalAmountInCents = Math.round(parsed.data.totalAmountInRupees * 100);
	}
	if (parsed.data.description !== undefined) {
		updateData.description = parsed.data.description;
	}

	await db.update(feeStructures).set(updateData).where(eq(feeStructures.id, id));
	return c.json({ message: "Fee structure updated successfully" });
});

// Delete Fee Structure (Admin)
feesRouter.delete("/structures/:id", requireAuth, requireAdmin, async (c) => {
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	// Check if obligations exist
	const linked = await db.select().from(studentFeeObligations).where(eq(studentFeeObligations.feeStructureId, id)).limit(1);
	if (linked.length > 0) {
		return c.json({ error: "Cannot delete fee structure: active student obligations are linked to it. Delete obligations first." }, 400);
	}

	await db.delete(feeStructures).where(eq(feeStructures.id, id));
	return c.json({ message: "Fee structure deleted successfully" });
});

// List All Student Fee Obligations (Admin)
feesRouter.get("/obligations", requireAuth, requireAdmin, async (c) => {
	const db = createDb(c.env.DB);
	const items = await db
		.select({
			id: studentFeeObligations.id,
			studentId: studentFeeObligations.studentId,
			fullName: users.fullName,
			username: users.username,
			admissionNumber: students.admissionNumber,
			feeStructureId: studentFeeObligations.feeStructureId,
			structureName: feeStructures.name,
			installmentTitle: studentFeeObligations.installmentTitle,
			dueDate: studentFeeObligations.dueDate,
			baseAmountInCents: studentFeeObligations.baseAmountInCents,
			concessionAmountInCents: studentFeeObligations.concessionAmountInCents,
			netAmountInCents: studentFeeObligations.netAmountInCents,
			paidAmountInCents: studentFeeObligations.paidAmountInCents,
			status: studentFeeObligations.status,
			createdAt: studentFeeObligations.createdAt,
		})
		.from(studentFeeObligations)
		.innerJoin(students, eq(studentFeeObligations.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.leftJoin(feeStructures, eq(studentFeeObligations.feeStructureId, feeStructures.id))
		.orderBy(desc(studentFeeObligations.createdAt));

	const todayStr = new Date().toISOString().split("T")[0];

	return c.json({
		obligations: items.map((o) => {
			const balanceInRupees = (o.netAmountInCents - o.paidAmountInCents) / 100;
			const isDueNow = Boolean(balanceInRupees > 0 && o.dueDate && o.dueDate <= todayStr);
			const isUpcoming = Boolean(balanceInRupees > 0 && o.dueDate && o.dueDate > todayStr);
			return {
				...o,
				structureName: o.structureName || "Standard Academic Plan",
				baseAmountInRupees: o.baseAmountInCents / 100,
				concessionAmountInRupees: o.concessionAmountInCents / 100,
				netAmountInRupees: o.netAmountInCents / 100,
				paidAmountInRupees: o.paidAmountInCents / 100,
				balanceInRupees,
				isDueNow,
				isUpcoming,
				effectiveStatus: balanceInRupees <= 0 ? "paid" : isDueNow ? "overdue" : "upcoming",
			};
		}),
	});
});

// 2. Assign Fee Obligation to Student (Admin)
const createObligationSchema = z.object({
	studentId: z.string(),
	feeStructureId: z.string().optional(),
	academicSessionId: z.string().optional(),
	installmentTitle: z.string().min(2),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	baseAmountInRupees: z.number().positive(),
	concessionAmountInRupees: z.number().nonnegative().default(0),
});

feesRouter.post("/obligations", requireAuth, requireAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createObligationSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);

	const data = parsed.data;
	const db = createDb(c.env.DB);

	let feeStructureId = data.feeStructureId;
	let academicSessionId = data.academicSessionId;

	if (!feeStructureId || !academicSessionId) {
		const existing = await db.select().from(feeStructures).limit(1);
		if (existing.length > 0) {
			feeStructureId = feeStructureId || existing[0].id;
			academicSessionId = academicSessionId || existing[0].academicSessionId;
		} else {
			feeStructureId = feeStructureId || "fee-struct-general";
			academicSessionId = academicSessionId || "session-2026-2027";
		}
	}

	const id = crypto.randomUUID();
	const baseCents = Math.round(data.baseAmountInRupees * 100);
	const concessionCents = Math.round(data.concessionAmountInRupees * 100);
	const netCents = Math.max(0, baseCents - concessionCents);

	await db.insert(studentFeeObligations).values({
		id,
		studentId: data.studentId,
		feeStructureId,
		academicSessionId,
		installmentTitle: data.installmentTitle,
		dueDate: data.dueDate,
		baseAmountInCents: baseCents,
		concessionAmountInCents: concessionCents,
		netAmountInCents: netCents,
		paidAmountInCents: 0,
		status: "pending",
	});

	return c.json({ message: "Fee obligation assigned", id }, 201);
});

// 3. Update Fee Obligation (Admin)
const updateObligationSchema = z.object({
	installmentTitle: z.string().min(2).optional(),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	baseAmountInRupees: z.number().positive().optional(),
	concessionAmountInRupees: z.number().nonnegative().optional(),
});

feesRouter.put("/obligations/:id", requireAuth, requireAdmin, async (c) => {
	const obligationId = c.req.param("id");
	const body = await c.req.json().catch(() => null);
	const parsed = updateObligationSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Validation failed" }, 400);

	const db = createDb(c.env.DB);
	const existingList = await db.select().from(studentFeeObligations).where(eq(studentFeeObligations.id, obligationId)).limit(1);
	if (existingList.length === 0) {
		return c.json({ error: "Fee obligation not found" }, 404);
	}
	const existing = existingList[0];

	let baseCents = existing.baseAmountInCents;
	let concessionCents = existing.concessionAmountInCents;

	if (parsed.data.baseAmountInRupees !== undefined) {
		baseCents = Math.round(parsed.data.baseAmountInRupees * 100);
	}
	if (parsed.data.concessionAmountInRupees !== undefined) {
		concessionCents = Math.round(parsed.data.concessionAmountInRupees * 100);
	}

	const netCents = Math.max(0, baseCents - concessionCents);
	let newStatus = existing.status;
	if (existing.paidAmountInCents >= netCents && netCents > 0) {
		newStatus = "paid";
	} else if (existing.paidAmountInCents > 0) {
		newStatus = "partially_paid";
	} else {
		newStatus = "pending";
	}

	await db
		.update(studentFeeObligations)
		.set({
			installmentTitle: parsed.data.installmentTitle ?? existing.installmentTitle,
			dueDate: parsed.data.dueDate ?? existing.dueDate,
			baseAmountInCents: baseCents,
			concessionAmountInCents: concessionCents,
			netAmountInCents: netCents,
			status: newStatus,
			updatedAt: Math.floor(Date.now() / 1000),
		})
		.where(eq(studentFeeObligations.id, obligationId));

	return c.json({ message: "Fee obligation updated successfully" });
});

// 4. Delete Fee Obligation (Admin)
feesRouter.delete("/obligations/:id", requireAuth, requireAdmin, async (c) => {
	const obligationId = c.req.param("id");
	const db = createDb(c.env.DB);

	await db.delete(receipts).where(eq(receipts.obligationId, obligationId));
	await db.delete(paymentTransactions).where(eq(paymentTransactions.obligationId, obligationId));
	await db.delete(paymentOrders).where(eq(paymentOrders.obligationId, obligationId));
	await db.delete(studentFeeObligations).where(eq(studentFeeObligations.id, obligationId));

	return c.json({ message: "Fee obligation deleted successfully" });
});

// 5. View Student Fee Details & Obligations (Parent/Student App & Admin)
feesRouter.get("/student/:studentId", requireAuth, async (c) => {
	const studentId = c.req.param("studentId");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser.role === "student_parent" && authUser.studentId !== studentId) {
		return c.json({ error: "Forbidden: You cannot access another student's fee details" }, 403);
	}

	const obligations = await db
		.select({
			id: studentFeeObligations.id,
			installmentTitle: studentFeeObligations.installmentTitle,
			dueDate: studentFeeObligations.dueDate,
			baseAmountInCents: studentFeeObligations.baseAmountInCents,
			concessionAmountInCents: studentFeeObligations.concessionAmountInCents,
			netAmountInCents: studentFeeObligations.netAmountInCents,
			paidAmountInCents: studentFeeObligations.paidAmountInCents,
			status: studentFeeObligations.status,
			structureName: feeStructures.name,
		})
		.from(studentFeeObligations)
		.leftJoin(feeStructures, eq(studentFeeObligations.feeStructureId, feeStructures.id))
		.where(eq(studentFeeObligations.studentId, studentId))
		.orderBy(studentFeeObligations.dueDate);

	const todayStr = new Date().toISOString().split("T")[0];
	let totalNetCents = 0;
	let totalPaidCents = 0;
	let dueNowCents = 0;
	let upcomingCents = 0;

	for (const ob of obligations) {
		totalNetCents += ob.netAmountInCents;
		totalPaidCents += ob.paidAmountInCents;
		const balance = Math.max(0, ob.netAmountInCents - ob.paidAmountInCents);
		if (balance > 0) {
			if (ob.dueDate && ob.dueDate <= todayStr) {
				dueNowCents += balance;
			} else {
				upcomingCents += balance;
			}
		}
	}

	const totalOutstandingCents = Math.max(0, totalNetCents - totalPaidCents);

	// Fetch receipts with installment details
	const studentReceipts = await db
		.select({
			id: receipts.id,
			receiptNumber: receipts.receiptNumber,
			obligationId: receipts.obligationId,
			amountPaidInCents: receipts.amountPaidInCents,
			paymentMode: receipts.paymentMode,
			remarks: receipts.remarks,
			generatedAt: receipts.generatedAt,
			installmentTitle: studentFeeObligations.installmentTitle,
			dueDate: studentFeeObligations.dueDate,
			structureName: feeStructures.name,
		})
		.from(receipts)
		.leftJoin(studentFeeObligations, eq(receipts.obligationId, studentFeeObligations.id))
		.leftJoin(feeStructures, eq(studentFeeObligations.feeStructureId, feeStructures.id))
		.where(eq(receipts.studentId, studentId))
		.orderBy(desc(receipts.generatedAt));

	return c.json({
		summary: {
			totalFeesInRupees: totalNetCents / 100,
			totalPaidInRupees: totalPaidCents / 100,
			outstandingBalanceInRupees: totalOutstandingCents / 100,
			dueNowBalanceInRupees: dueNowCents / 100,
			upcomingBalanceInRupees: upcomingCents / 100,
			hasDuesCurrentlyDue: dueNowCents > 0,
		},
		obligations: obligations.map((o) => {
			const balanceInRupees = (o.netAmountInCents - o.paidAmountInCents) / 100;
			const isDueNow = Boolean(balanceInRupees > 0 && o.dueDate && o.dueDate <= todayStr);
			const isUpcoming = Boolean(balanceInRupees > 0 && o.dueDate && o.dueDate > todayStr);
			return {
				...o,
				structureName: o.structureName || "Standard Academic Plan",
				netAmountInRupees: o.netAmountInCents / 100,
				paidAmountInRupees: o.paidAmountInCents / 100,
				balanceInRupees,
				isDueNow,
				isUpcoming,
				effectiveStatus: balanceInRupees <= 0 ? "paid" : isDueNow ? "overdue" : "upcoming",
			};
		}),
		receipts: studentReceipts.map((r) => ({
			...r,
			amountPaidInRupees: r.amountPaidInCents / 100,
			installmentTitle: r.installmentTitle || "Tuition Fee Installment",
			structureName: r.structureName || "Standard Academic Plan",
		})),
	});
});

export default feesRouter;

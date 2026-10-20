import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	users,
	students,
	guardians,
	studentEnrollments,
	batches,
	classes,
	studentFeeObligations,
	feeStructures,
	paymentOrders,
	paymentTransactions,
	receipts,
	attendanceRecords,
	homeworkSubmissions,
	teacherRemarks,
	complaints,
	complaintResponses,
	auditLogs,
	notifications,
	teachers,
	teacherAssignments,
} from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { generateNextUsername } from "../auth/username";
import { hashPassword, generateProventusPassword } from "../auth/passwords";

const studentsRouter = new Hono<{ Bindings: Bindings }>();

// 1. List students (Admin or Teacher)
studentsRouter.get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const search = c.req.query("search")?.toLowerCase();
	const batchParam = c.req.query("batchId");

	const results = await db
		.select({
			id: students.id,
			userId: students.userId,
			admissionNumber: students.admissionNumber,
			rollNumber: students.rollNumber,
			dob: students.dob,
			gender: students.gender,
			targetExam: students.targetExam,
			status: students.status,
			fullName: users.fullName,
			username: users.username,
			phone: users.phone,
			email: users.email,
			password: users.plainPassword,
			createdAt: students.createdAt,
		})
		.from(students)
		.innerJoin(users, eq(students.userId, users.id))
		.orderBy(desc(students.createdAt));

	// Fetch all enrollments to attach batch information
	const allEnrollments = await db
		.select({
			studentId: studentEnrollments.studentId,
			batchId: batches.id,
			batchName: batches.name,
			className: classes.name,
		})
		.from(studentEnrollments)
		.innerJoin(batches, eq(studentEnrollments.batchId, batches.id))
		.innerJoin(classes, eq(batches.classId, classes.id));

	const enrollmentMap: Record<string, { batchId: string; batchName: string; className: string }> = {};
	for (const e of allEnrollments) {
		enrollmentMap[e.studentId] = {
			batchId: e.batchId,
			batchName: e.batchName,
			className: e.className,
		};
	}

	// Fetch fee obligations summary for each student
	const allObligations = await db
		.select({
			studentId: studentFeeObligations.studentId,
			netAmountInCents: studentFeeObligations.netAmountInCents,
			paidAmountInCents: studentFeeObligations.paidAmountInCents,
			status: studentFeeObligations.status,
			dueDate: studentFeeObligations.dueDate,
		})
		.from(studentFeeObligations);

	const feeMap: Record<string, { totalNet: number; totalPaid: number; balance: number; nextDueDate?: string }> = {};
	for (const o of allObligations) {
		if (!feeMap[o.studentId]) {
			feeMap[o.studentId] = { totalNet: 0, totalPaid: 0, balance: 0, nextDueDate: o.dueDate };
		}
		feeMap[o.studentId].totalNet += o.netAmountInCents / 100;
		feeMap[o.studentId].totalPaid += o.paidAmountInCents / 100;
		feeMap[o.studentId].balance += (o.netAmountInCents - o.paidAmountInCents) / 100;
	}

	const studentsWithDetails = results.map((s) => ({
		...s,
		enrollment: enrollmentMap[s.id] || null,
		feeSummary: feeMap[s.id] || { totalNet: 0, totalPaid: 0, balance: 0 },
	}));

	let filtered = studentsWithDetails;

	// Faculty Scoping: Teachers strictly only view students enrolled in their assigned batches
	if (user && user.role === "teacher") {
		let teacherId = user.teacherId;
		if (!teacherId) {
			const t = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.sub)).limit(1);
			teacherId = t[0]?.id;
		}

		if (teacherId) {
			const myAssignments = await db
				.select({ batchId: teacherAssignments.batchId })
				.from(teacherAssignments)
				.where(eq(teacherAssignments.teacherId, teacherId));

			const assignedBatchIds = new Set(myAssignments.map((a) => a.batchId));

			if (batchParam) {
				if (!assignedBatchIds.has(batchParam)) {
					return c.json({ students: [] });
				}
				filtered = filtered.filter((s) => s.enrollment && s.enrollment.batchId === batchParam);
			} else {
				filtered = filtered.filter((s) => s.enrollment && assignedBatchIds.has(s.enrollment.batchId));
			}
		} else {
			return c.json({ students: [] });
		}

		// Security: Redact plain text password for non-admin viewers
		filtered = filtered.map((s) => ({ ...s, password: null }));
	} else if (batchParam) {
		filtered = filtered.filter((s) => s.enrollment && s.enrollment.batchId === batchParam);
	}

	if (search) {
		filtered = filtered.filter(
			(s) =>
				s.fullName.toLowerCase().includes(search) ||
				s.username.toLowerCase().includes(search) ||
				s.admissionNumber.toLowerCase().includes(search)
		);
	}

	return c.json({ students: filtered });
});

// 2. Create student profile
const createStudentSchema = z.object({
	fullName: z.string().trim().min(2, "Full Name must be at least 2 characters"),
	email: z.string().trim().email().or(z.literal("")).optional(),
	phone: z.string().trim().or(z.literal("")).optional(),
	dob: z.string().trim().optional(),
	gender: z.string().trim().optional(),
	address: z.string().trim().optional(),
	targetExam: z.string().trim().default("General / Board"),
	rollNumber: z.string().trim().optional(),
	batchId: z.string().trim().optional(),
	monthlyFeeAmountInRupees: z.number().optional(),
	monthlyDueDay: z.number().min(1).max(31).default(5),
	guardian: z
		.object({
			name: z.string().trim().min(2),
			relation: z.string().trim().default("Parent"),
			phone: z.string().trim().optional(),
			email: z.string().trim().email().or(z.literal("")).optional(),
			occupation: z.string().trim().optional(),
		})
		.optional(),
});

studentsRouter.post("/", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const parsed = createStudentSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const data = parsed.data;
		const db = createDb(c.env.DB);

		const username = await generateNextUsername(db);
		const defaultPassword = generateProventusPassword();
		const hashedPassword = await hashPassword(defaultPassword);

		const userId = crypto.randomUUID();
		const studentId = crypto.randomUUID();
		const admissionNumber = `PA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

		const email =
			data.email && data.email.trim() !== ""
				? data.email.trim()
				: `${username.toLowerCase()}@proventusacademy.internal`;
		const phone = data.phone && data.phone.trim() !== "" ? data.phone.trim() : null;

		// 1. Create User
		await db.insert(users).values({
			id: userId,
			username,
			email,
			passwordHash: hashedPassword,
			plainPassword: defaultPassword,
			roleId: "student_parent",
			fullName: data.fullName,
			phone,
			status: "active",
			mustChangePassword: 0,
		});

		// 2. Create Student
		await db.insert(students).values({
			id: studentId,
			userId,
			admissionNumber,
			rollNumber: data.rollNumber || null,
			dob: data.dob || null,
			gender: data.gender || null,
			address: data.address || null,
			targetExam: data.targetExam,
			status: "active",
		});

		// 3. Create Guardian if provided
		if (data.guardian && data.guardian.name) {
			await db.insert(guardians).values({
				id: crypto.randomUUID(),
				studentId,
				name: data.guardian.name,
				relation: data.guardian.relation || "Parent",
				phone: data.guardian.phone || phone || "9108396010",
				email: data.guardian.email || null,
				occupation: data.guardian.occupation || null,
				isPrimaryContact: 1,
			});
		}

		// 4. Enroll in batch if valid batch exists
		if (data.batchId && data.batchId.trim() !== "") {
			const targetBatch = await db.select({ id: batches.id }).from(batches).where(eq(batches.id, data.batchId.trim())).limit(1);
			if (targetBatch.length > 0) {
				await db.insert(studentEnrollments).values({
					id: crypto.randomUUID(),
					studentId,
					batchId: data.batchId.trim(),
					rollNumber: data.rollNumber || null,
					status: "active",
				});
			}
		}

		// 5. If monthly fee amount provided, create an initial fee obligation
		if (data.monthlyFeeAmountInRupees && data.monthlyFeeAmountInRupees > 0) {
			const existingStructures = await db.select().from(feeStructures).limit(1);
			const feeStructureId = existingStructures.length > 0 ? existingStructures[0].id : "fee-struct-general";
			const academicSessionId = existingStructures.length > 0 ? existingStructures[0].academicSessionId : "session-2026-2027";

			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const day = String(data.monthlyDueDay).padStart(2, "0");
			const dueDate = `${year}-${month}-${day}`;

			const baseCents = Math.round(data.monthlyFeeAmountInRupees * 100);

			await db.insert(studentFeeObligations).values({
				id: crypto.randomUUID(),
				studentId,
				feeStructureId,
				academicSessionId,
				installmentTitle: `Monthly Tuition Fee (${now.toLocaleString("default", { month: "long" })} ${year})`,
				dueDate,
				baseAmountInCents: baseCents,
				concessionAmountInCents: 0,
				netAmountInCents: baseCents,
				paidAmountInCents: 0,
				status: "pending",
			});
		}

		// 6. Audit Log
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: c.get("user").sub,
			action: "CREATE",
			entityType: "students",
			entityId: studentId,
			details: JSON.stringify({ username, admissionNumber, fullName: data.fullName }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		return c.json(
			{
				message: "Student created successfully",
				student: {
					id: studentId,
					userId,
					username,
					fullName: data.fullName,
					admissionNumber,
					status: "active",
				},
				credentials: {
					username,
					password: defaultPassword,
					temporaryPassword: defaultPassword,
					notice: "Student and parent account created with secure assigned credentials.",
				},
			},
			201
		);
	} catch (err: any) {
		return c.json({ error: "Failed to create student: " + (err?.message || "Internal error") }, 500);
	}
});

// 3. Get single student details
studentsRouter.get("/:id", requireAuth, async (c) => {
	const studentId = c.req.param("id");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser.role === "student_parent" && authUser.studentId !== studentId) {
		return c.json({ error: "Forbidden: You cannot access another student's profile" }, 403);
	}

	const studentRecords = await db
		.select({
			id: students.id,
			userId: students.userId,
			admissionNumber: students.admissionNumber,
			rollNumber: students.rollNumber,
			dob: students.dob,
			gender: students.gender,
			address: students.address,
			emergencyContact: students.emergencyContact,
			targetExam: students.targetExam,
			status: students.status,
			fullName: users.fullName,
			username: users.username,
			phone: users.phone,
			email: users.email,
			createdAt: students.createdAt,
		})
		.from(students)
		.innerJoin(users, eq(students.userId, users.id))
		.where(eq(students.id, studentId))
		.limit(1);

	if (studentRecords.length === 0) {
		return c.json({ error: "Student not found" }, 404);
	}

	const guardianRecords = await db.select().from(guardians).where(eq(guardians.studentId, studentId));

	const enrollments = await db
		.select({
			enrollmentId: studentEnrollments.id,
			batchId: batches.id,
			batchName: batches.name,
			batchCode: batches.code,
			className: classes.name,
			status: studentEnrollments.status,
		})
		.from(studentEnrollments)
		.innerJoin(batches, eq(studentEnrollments.batchId, batches.id))
		.innerJoin(classes, eq(batches.classId, classes.id))
		.where(eq(studentEnrollments.studentId, studentId));

	return c.json({
		student: studentRecords[0],
		guardians: guardianRecords,
		enrollments,
	});
});

// 4. Assign / Update student batch (Admin)
const assignBatchSchema = z.object({
	batchId: z.string().trim().optional(),
	targetExam: z.string().trim().optional(),
});

studentsRouter.post("/:id/batch", requireAuth, requireAdmin, async (c) => {
	const studentId = c.req.param("id");
	const body = await c.req.json().catch(() => ({}));
	const parsed = assignBatchSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
	}

	const db = createDb(c.env.DB);
	const studentRecords = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
	if (studentRecords.length === 0) {
		return c.json({ error: "Student not found" }, 404);
	}

	const { batchId, targetExam } = parsed.data;

	if (batchId && batchId.trim() !== "") {
		const batchRecords = await db.select().from(batches).where(eq(batches.id, batchId.trim())).limit(1);
		if (batchRecords.length === 0) {
			return c.json({ error: "Selected batch not found" }, 404);
		}

		await db.delete(studentEnrollments).where(eq(studentEnrollments.studentId, studentId));
		await db.insert(studentEnrollments).values({
			id: crypto.randomUUID(),
			studentId,
			batchId: batchId.trim(),
			status: "active",
		});
	} else if (batchId === "" || batchId === null) {
		await db.delete(studentEnrollments).where(eq(studentEnrollments.studentId, studentId));
	}

	if (targetExam) {
		await db.update(students).set({ targetExam, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(students.id, studentId));
	}

	return c.json({ message: "Student batch updated successfully" });
});

// 5. Delete student (Admin)
studentsRouter.delete("/:id", requireAuth, requireAdmin, async (c) => {
	const studentId = c.req.param("id");
	const db = createDb(c.env.DB);

	const studentList = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
	if (studentList.length === 0) {
		return c.json({ error: "Student not found" }, 404);
	}
	const student = studentList[0];

	try {
		await db.delete(receipts).where(eq(receipts.studentId, studentId));
		await db.delete(paymentTransactions).where(eq(paymentTransactions.studentId, studentId));
		await db.delete(paymentOrders).where(eq(paymentOrders.studentId, studentId));
		await db.delete(studentFeeObligations).where(eq(studentFeeObligations.studentId, studentId));
		await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, studentId));
		await db.delete(attendanceRecords).where(eq(attendanceRecords.studentId, studentId));
		await db.delete(teacherRemarks).where(eq(teacherRemarks.studentId, studentId));

		const cmpList = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.studentId, studentId));
		for (const cmp of cmpList) {
			await db.delete(complaintResponses).where(eq(complaintResponses.complaintId, cmp.id));
		}
		await db.delete(complaints).where(eq(complaints.studentId, studentId));

		await db.delete(guardians).where(eq(guardians.studentId, studentId));
		await db.delete(studentEnrollments).where(eq(studentEnrollments.studentId, studentId));
		await db.delete(students).where(eq(students.id, studentId));
		await db.delete(notifications).where(eq(notifications.userId, student.userId));
		await db.delete(auditLogs).where(eq(auditLogs.userId, student.userId));
		await db.delete(users).where(eq(users.id, student.userId));

		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: c.get("user").sub,
			action: "DELETE",
			entityType: "students",
			entityId: studentId,
			details: JSON.stringify({ admissionNumber: student.admissionNumber }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		return c.json({ message: "Student deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete student: " + (err?.message || "Internal error") }, 500);
	}
});

export default studentsRouter;

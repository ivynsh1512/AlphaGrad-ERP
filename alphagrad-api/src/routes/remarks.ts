import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { teacherRemarks, teachers, users, subjects, teacherAssignments } from "../db/schema";
import { requireAuth, requireTeacher } from "../middleware/auth";

const remarksRouter = new Hono<{ Bindings: Bindings }>();

// 1. Add Teacher Remark (Teacher or Admin)
const createRemarkSchema = z.object({
	studentId: z.string(),
	batchId: z.string(),
	subjectId: z.string().optional(),
	category: z.enum(["academic", "behavioral", "attendance", "general"]).default("academic"),
	remarkText: z.string().min(3),
});

remarksRouter.post("/", requireAuth, requireTeacher, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createRemarkSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
	}

	const data = parsed.data;
	const db = createDb(c.env.DB);
	const authUser = c.get("user");

	if (authUser.role === "teacher") {
		let teacherId = authUser.teacherId;
		if (!teacherId) {
			const t = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, authUser.sub)).limit(1);
			teacherId = t[0]?.id;
		}
		if (teacherId) {
			const assign = await db
				.select({ id: teacherAssignments.id })
				.from(teacherAssignments)
				.where(and(eq(teacherAssignments.teacherId, teacherId), eq(teacherAssignments.batchId, data.batchId)))
				.limit(1);
			if (assign.length === 0) {
				return c.json({ error: "Forbidden: You are not assigned to this batch" }, 403);
			}
		} else {
			return c.json({ error: "Forbidden: Faculty profile not found" }, 403);
		}
	}

	const teacherId = authUser.teacherId || "admin-system";
	const id = crypto.randomUUID();

	await db.insert(teacherRemarks).values({
		id,
		studentId: data.studentId,
		teacherId,
		batchId: data.batchId,
		subjectId: data.subjectId,
		category: data.category,
		remarkText: data.remarkText,
	});

	return c.json({ message: "Remark recorded successfully", id }, 201);
});

// 2. Get Remarks for a Student (Parent/Student App & Admin)
remarksRouter.get("/student/:studentId", requireAuth, async (c) => {
	const studentId = c.req.param("studentId");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser.role === "student_parent" && authUser.studentId !== studentId) {
		return c.json({ error: "Forbidden: You cannot access another student's remarks" }, 403);
	}

	const remarksList = await db
		.select({
			id: teacherRemarks.id,
			category: teacherRemarks.category,
			remarkText: teacherRemarks.remarkText,
			createdAt: teacherRemarks.createdAt,
			teacherName: users.fullName,
		})
		.from(teacherRemarks)
		.innerJoin(teachers, eq(teacherRemarks.teacherId, teachers.id))
		.innerJoin(users, eq(teachers.userId, users.id))
		.where(eq(teacherRemarks.studentId, studentId))
		.orderBy(desc(teacherRemarks.createdAt));

	return c.json({ remarks: remarksList });
});

export default remarksRouter;

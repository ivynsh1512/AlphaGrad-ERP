import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { homework, homeworkSubmissions, subjects, teachers, users, teacherAssignments } from "../db/schema";
import { requireAuth, requireTeacher } from "../middleware/auth";

const homeworkRouter = new Hono<{ Bindings: Bindings }>();

// 1. Create and Publish Homework (Teacher or Admin)
const createHomeworkSchema = z.object({
	batchId: z.string(),
	subjectId: z.string(),
	title: z.string().min(2),
	description: z.string().min(5),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	attachmentUrl: z.string().optional(),
});

homeworkRouter.post("/", requireAuth, requireTeacher, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createHomeworkSchema.safeParse(body);
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

	await db.insert(homework).values({
		id,
		batchId: data.batchId,
		subjectId: data.subjectId,
		teacherId,
		title: data.title,
		description: data.description,
		dueDate: data.dueDate,
		attachmentUrl: data.attachmentUrl,
		status: "published",
	});

	return c.json({ message: "Homework published successfully", id }, 201);
});

// 2. Get Homework for a Batch (for Teachers & Students)
homeworkRouter.get("/batch/:batchId", requireAuth, async (c) => {
	const batchId = c.req.param("batchId");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser && authUser.role === "teacher") {
		let teacherId = authUser.teacherId;
		if (!teacherId) {
			const t = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, authUser.sub)).limit(1);
			teacherId = t[0]?.id;
		}
		if (teacherId) {
			const assign = await db
				.select({ id: teacherAssignments.id })
				.from(teacherAssignments)
				.where(and(eq(teacherAssignments.teacherId, teacherId), eq(teacherAssignments.batchId, batchId)))
				.limit(1);
			if (assign.length === 0) {
				return c.json({ error: "Forbidden: You are not assigned to this batch" }, 403);
			}
		} else {
			return c.json({ error: "Forbidden: Faculty profile not found" }, 403);
		}
	}

	const items = await db
		.select({
			id: homework.id,
			title: homework.title,
			description: homework.description,
			dueDate: homework.dueDate,
			attachmentUrl: homework.attachmentUrl,
			status: homework.status,
			subjectId: subjects.id,
			subjectName: subjects.name,
			createdAt: homework.createdAt,
		})
		.from(homework)
		.innerJoin(subjects, eq(homework.subjectId, subjects.id))
		.where(eq(homework.batchId, batchId))
		.orderBy(desc(homework.createdAt));

	return c.json({ homework: items });
});

// 3. Submit Homework (Student)
const submitHomeworkSchema = z.object({
	submissionText: z.string().optional(),
	fileUrl: z.string().optional(),
});

homeworkRouter.post("/:id/submit", requireAuth, async (c) => {
	const homeworkId = c.req.param("id");
	const authUser = c.get("user");
	if (authUser.role !== "student_parent" || !authUser.studentId) {
		return c.json({ error: "Only students can submit homework" }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = submitHomeworkSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed" }, 400);
	}

	const db = createDb(c.env.DB);
	const existing = await db
		.select()
		.from(homeworkSubmissions)
		.where(
			and(
				eq(homeworkSubmissions.homeworkId, homeworkId),
				eq(homeworkSubmissions.studentId, authUser.studentId)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		// Update submission
		await db
			.update(homeworkSubmissions)
			.set({
				submissionText: parsed.data.submissionText,
				fileUrl: parsed.data.fileUrl,
				status: "submitted",
				submittedAt: sql`(unixepoch())`,
			})
			.where(eq(homeworkSubmissions.id, existing[0].id));
		return c.json({ message: "Homework resubmitted successfully" });
	}

	// Create new submission
	await db.insert(homeworkSubmissions).values({
		id: crypto.randomUUID(),
		homeworkId,
		studentId: authUser.studentId,
		submissionText: parsed.data.submissionText,
		fileUrl: parsed.data.fileUrl,
		status: "submitted",
	});

	return c.json({ message: "Homework submitted successfully" }, 201);
});

// 4. Get Student's Submissions and Feedback
homeworkRouter.get("/student/:studentId", requireAuth, async (c) => {
	const studentId = c.req.param("studentId");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser.role === "student_parent" && authUser.studentId !== studentId) {
		return c.json({ error: "Forbidden: You cannot access another student's homework" }, 403);
	}

	const submissions = await db
		.select({
			submissionId: homeworkSubmissions.id,
			homeworkId: homework.id,
			title: homework.title,
			dueDate: homework.dueDate,
			subjectName: subjects.name,
			status: homeworkSubmissions.status,
			feedback: homeworkSubmissions.teacherFeedback,
			score: homeworkSubmissions.score,
			submittedAt: homeworkSubmissions.submittedAt,
		})
		.from(homeworkSubmissions)
		.innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
		.innerJoin(subjects, eq(homework.subjectId, subjects.id))
		.where(eq(homeworkSubmissions.studentId, studentId))
		.orderBy(desc(homeworkSubmissions.submittedAt));

	return c.json({ submissions });
});

export default homeworkRouter;

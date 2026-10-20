import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { attendanceSessions, attendanceRecords, students, users, batches, subjects, teachers, teacherAssignments } from "../db/schema";
import { requireAuth, requireTeacher } from "../middleware/auth";

const attendanceRouter = new Hono<{ Bindings: Bindings }>();

// 1. Mark Attendance for a Batch
const markAttendanceSchema = z.object({
	batchId: z.string(),
	subjectId: z.string().optional(),
	sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
	records: z.array(
		z.object({
			studentId: z.string(),
			status: z.enum(["present", "absent", "late", "excused"]),
			remarks: z.string().optional(),
		})
	),
});

attendanceRouter.post("/sessions", requireAuth, requireTeacher, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = markAttendanceSchema.safeParse(body);
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

	// Create Attendance Session
	const sessionId = crypto.randomUUID();
	await db.insert(attendanceSessions).values({
		id: sessionId,
		batchId: data.batchId,
		subjectId: data.subjectId,
		teacherId,
		sessionDate: data.sessionDate,
	});

	// Insert Student Records
	for (const rec of data.records) {
		await db.insert(attendanceRecords).values({
			id: crypto.randomUUID(),
			sessionId,
			studentId: rec.studentId,
			status: rec.status,
			remarks: rec.remarks,
		});
	}

	return c.json({
		message: "Attendance recorded successfully",
		sessionId,
		totalMarked: data.records.length,
	}, 201);
});

// 2. View Batch Attendance Sessions & Records
attendanceRouter.get("/batch/:batchId", requireAuth, requireTeacher, async (c) => {
	const batchId = c.req.param("batchId");
	const authUser = c.get("user");
	const date = c.req.query("date");
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

	let query = db
		.select({
			id: attendanceSessions.id,
			sessionDate: attendanceSessions.sessionDate,
			subjectId: attendanceSessions.subjectId,
			createdAt: attendanceSessions.createdAt,
		})
		.from(attendanceSessions)
		.where(eq(attendanceSessions.batchId, batchId))
		.orderBy(desc(attendanceSessions.sessionDate));

	const sessions = await query;
	return c.json({ sessions });
});

// 3. View Student Attendance History and Summary (for Parent/Student App & Admin)
attendanceRouter.get("/student/:studentId", requireAuth, async (c) => {
	const studentId = c.req.param("studentId");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	// Object-level authorization
	if (authUser.role === "student_parent" && authUser.studentId !== studentId) {
		return c.json({ error: "Forbidden: You cannot access another student's attendance" }, 403);
	}

	const records = await db
		.select({
			id: attendanceRecords.id,
			status: attendanceRecords.status,
			remarks: attendanceRecords.remarks,
			sessionDate: attendanceSessions.sessionDate,
			batchId: attendanceSessions.batchId,
		})
		.from(attendanceRecords)
		.innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
		.where(eq(attendanceRecords.studentId, studentId))
		.orderBy(desc(attendanceSessions.sessionDate));

	// Calculate attendance metrics
	const total = records.length;
	const present = records.filter(r => r.status === "present").length;
	const absent = records.filter(r => r.status === "absent").length;
	const late = records.filter(r => r.status === "late").length;
	const excused = records.filter(r => r.status === "excused").length;
	const attendancePercentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

	return c.json({
		summary: {
			totalSessions: total,
			present,
			absent,
			late,
			excused,
			attendancePercentage,
		},
		records,
	});
});

export default attendanceRouter;

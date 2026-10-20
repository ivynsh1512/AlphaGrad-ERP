import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	users,
	teachers,
	teacherAssignments,
	batches,
	subjects,
	timetables,
	attendanceSessions,
	attendanceRecords,
	homework,
	homeworkSubmissions,
	teacherRemarks,
	complaints,
	auditLogs,
	notifications,
	teacherAttendance,
	syllabusChapters,
} from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { generateNextUsername } from "../auth/username";
import { hashPassword, generateProventusPassword } from "../auth/passwords";

const teachersRouter = new Hono<{ Bindings: Bindings }>();

// 1. List teachers (Admin or Teacher)
teachersRouter.get("/", requireAuth, async (c) => {
	const db = createDb(c.env.DB);
	const results = await db
		.select({
			id: teachers.id,
			userId: teachers.userId,
			employeeId: teachers.employeeId,
			designation: teachers.designation,
			specialization: teachers.specialization,
			qualifications: teachers.qualifications,
			monthlySalaryInRupees: teachers.monthlySalaryInRupees,
			status: teachers.status,
			fullName: users.fullName,
			username: users.username,
			email: users.email,
			phone: users.phone,
			password: users.plainPassword,
			createdAt: teachers.createdAt,
		})
		.from(teachers)
		.innerJoin(users, eq(teachers.userId, users.id))
		.orderBy(desc(teachers.createdAt));

	// Fetch all assignments for quick mapping
	const allAssignments = await db
		.select({
			id: teacherAssignments.id,
			teacherId: teacherAssignments.teacherId,
			batchId: teacherAssignments.batchId,
			batchName: batches.name,
			batchCode: batches.code,
			subjectId: teacherAssignments.subjectId,
			subjectName: subjects.name,
			isClassTeacher: teacherAssignments.isClassTeacher,
		})
		.from(teacherAssignments)
		.innerJoin(batches, eq(teacherAssignments.batchId, batches.id))
		.innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id));

	const assignmentsByTeacher: Record<string, any[]> = {};
	for (const a of allAssignments) {
		if (!assignmentsByTeacher[a.teacherId]) assignmentsByTeacher[a.teacherId] = [];
		assignmentsByTeacher[a.teacherId].push(a);
	}

	const teachersWithAssignments = results.map((t) => ({
		...t,
		assignments: assignmentsByTeacher[t.id] || [],
	}));

	return c.json({ teachers: teachersWithAssignments });
});

function resolveBatchesForGroups(gradeGroups: string[], allBatches: Array<{ id: string; name: string; code?: string | null }>): string[] {
	const result = new Set<string>();

	for (const group of gradeGroups) {
		const g = group.trim().toLowerCase();
		if (g === "1-4" || g === "grade 1-4") {
			for (let i = 1; i <= 4; i++) {
				const b = allBatches.find(
					(x) =>
						x.id === `batch-g${i}` ||
						x.name.toLowerCase() === `grade ${i}` ||
						(x.code && x.code.toLowerCase().startsWith(`g${i}`))
				);
				if (b) result.add(b.id);
			}
		} else if (g === "5-8" || g === "grade 5-8") {
			for (let i = 5; i <= 8; i++) {
				const b = allBatches.find(
					(x) =>
						x.id === `batch-g${i}` ||
						x.name.toLowerCase() === `grade ${i}` ||
						(x.code && x.code.toLowerCase().startsWith(`g${i}`))
				);
				if (b) result.add(b.id);
			}
		} else if (g === "9-12" || g === "grade 9-12") {
			for (let i = 9; i <= 12; i++) {
				const b = allBatches.find(
					(x) =>
						!x.name.toLowerCase().includes("nios") &&
						!(x.code && x.code.toLowerCase().includes("nios")) &&
						(x.id === `batch-g${i}` ||
							x.name.toLowerCase() === `grade ${i}` ||
							(x.code && x.code.toLowerCase().startsWith(`g${i}`)))
				);
				if (b) result.add(b.id);
			}
		} else if (g === "9-12 nios" || g === "nios" || g === "grade 9-12 nios") {
			for (const b of allBatches) {
				if (
					b.id.toLowerCase().includes("nios") ||
					b.name.toLowerCase().includes("nios") ||
					(b.code && b.code.toLowerCase().includes("nios"))
				) {
					result.add(b.id);
				}
			}
		} else {
			const b = allBatches.find((x) => x.id === group || x.name.toLowerCase() === g);
			if (b) result.add(b.id);
		}
	}

	return Array.from(result);
}

// 2. Create teacher profile
const createTeacherSchema = z.object({
	fullName: z.string().trim().min(2, "Full Name must be at least 2 characters"),
	email: z.string().trim().email().or(z.literal("")).optional(),
	phone: z.string().trim().or(z.literal("")).optional(),
	designation: z.string().trim().default("Subject Faculty"),
	specialization: z.string().trim().optional(),
	qualifications: z.string().trim().optional(),
	monthlySalaryInRupees: z.coerce.number().min(0).default(0),
	batchId: z.string().trim().optional(),
	batchIds: z.array(z.string()).optional(),
	gradeGroups: z.array(z.string()).optional(),
	subjectId: z.string().trim().optional(),
	subjectIds: z.array(z.string()).optional(),
	isClassTeacher: z.boolean().optional(),
});

teachersRouter.post("/", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const parsed = createTeacherSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const data = parsed.data;
		const db = createDb(c.env.DB);

		const username = await generateNextUsername(db);
		const defaultPassword = generateProventusPassword();
		const hashedPassword = await hashPassword(defaultPassword);

		const userId = crypto.randomUUID();
		const teacherId = crypto.randomUUID();
		const employeeId = `TCH-${Math.floor(100 + Math.random() * 900)}`;

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
			roleId: "teacher",
			fullName: data.fullName,
			phone,
			status: "active",
			mustChangePassword: 0,
		});

		// 2. Create Teacher
		await db.insert(teachers).values({
			id: teacherId,
			userId,
			employeeId,
			designation: data.designation || "Subject Faculty",
			specialization: data.specialization || "General Faculty",
			qualifications: data.qualifications,
			monthlySalaryInRupees: data.monthlySalaryInRupees || 0,
			status: "active",
		});

		// 3. Assign batches (support single batchId, multiple batchIds, or grouped grades 1-4, 5-8, 9-12, 9-12 NIOS)
		const targetBatchIds = new Set<string>();
		if (data.batchId && data.batchId.trim() !== "") targetBatchIds.add(data.batchId.trim());
		if (Array.isArray(data.batchIds)) {
			for (const b of data.batchIds) if (b && b.trim() !== "") targetBatchIds.add(b.trim());
		}
		if (Array.isArray(data.gradeGroups) && data.gradeGroups.length > 0) {
			const allBatches = await db.select({ id: batches.id, name: batches.name, code: batches.code }).from(batches);
			const resolved = resolveBatchesForGroups(data.gradeGroups, allBatches);
			for (const b of resolved) targetBatchIds.add(b);
		}

		const targetSubjectIds = new Set<string>();
		if (data.subjectId && data.subjectId.trim() !== "") targetSubjectIds.add(data.subjectId.trim());
		if (Array.isArray(data.subjectIds)) {
			for (const s of data.subjectIds) if (s && s.trim() !== "") targetSubjectIds.add(s.trim());
		}

		if (targetBatchIds.size > 0) {
			if (targetSubjectIds.size === 0) {
				const firstSub = await db.select({ id: subjects.id }).from(subjects).limit(1);
				if (firstSub.length > 0) targetSubjectIds.add(firstSub[0].id);
			}

			for (const bId of targetBatchIds) {
				for (const sId of targetSubjectIds) {
					await db
						.insert(teacherAssignments)
						.values({
							id: crypto.randomUUID(),
							teacherId,
							batchId: bId,
							subjectId: sId,
							isClassTeacher: data.isClassTeacher ? 1 : 0,
						})
						.onConflictDoNothing();
				}
			}
		}

		// 4. Audit Log
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: c.get("user").sub,
			action: "CREATE",
			entityType: "teachers",
			entityId: teacherId,
			details: JSON.stringify({ username, employeeId, fullName: data.fullName, batchId: data.batchId, subjectId: data.subjectId }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		return c.json(
			{
				message: "Teacher profile created successfully",
				teacher: {
					id: teacherId,
					userId,
					username,
					fullName: data.fullName,
					employeeId,
				},
				credentials: {
					username,
					password: defaultPassword,
					temporaryPassword: defaultPassword,
					notice: "Share these credentials with the faculty member.",
				},
			},
			201
		);
	} catch (err: any) {
		return c.json({ error: "Failed to create teacher profile: " + (err?.message || "Internal error") }, 500);
	}
});

// Update teacher details including salary
const updateTeacherSchema = z.object({
	fullName: z.string().trim().min(2).optional(),
	designation: z.string().trim().optional(),
	specialization: z.string().trim().optional(),
	qualifications: z.string().trim().optional(),
	monthlySalaryInRupees: z.coerce.number().min(0).optional(),
	phone: z.string().trim().or(z.literal("")).optional(),
});

teachersRouter.put("/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const teacherId = c.req.param("id");
		const body = await c.req.json().catch(() => null);
		const parsed = updateTeacherSchema.safeParse(body);
		if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);

		const db = createDb(c.env.DB);
		const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
		if (!teacher[0]) return c.json({ error: "Teacher not found" }, 404);

		if (parsed.data.fullName || parsed.data.phone !== undefined) {
			await db.update(users).set({
				...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
				...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
			}).where(eq(users.id, teacher[0].userId));
		}

		await db.update(teachers).set({
			...(parsed.data.designation ? { designation: parsed.data.designation } : {}),
			...(parsed.data.specialization ? { specialization: parsed.data.specialization } : {}),
			...(parsed.data.qualifications ? { qualifications: parsed.data.qualifications } : {}),
			...(parsed.data.monthlySalaryInRupees !== undefined ? { monthlySalaryInRupees: parsed.data.monthlySalaryInRupees } : {}),
			updatedAt: sql`(unixepoch())`,
		}).where(eq(teachers.id, teacherId));

		return c.json({ message: "Faculty profile updated successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to update teacher: " + (err?.message || "Internal error") }, 500);
	}
});

// 3. Assign teacher to batches and subjects (supports multi-select & grouped grades)
const assignSchema = z.object({
	teacherId: z.string(),
	batchId: z.string().optional(),
	batchIds: z.array(z.string()).optional(),
	gradeGroups: z.array(z.string()).optional(),
	subjectId: z.string().optional(),
	subjectIds: z.array(z.string()).optional(),
	isClassTeacher: z.boolean().default(false),
});

teachersRouter.post("/assign", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const parsed = assignSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const data = parsed.data;
		const db = createDb(c.env.DB);

		const tExists = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, data.teacherId)).limit(1);
		if (tExists.length === 0) return c.json({ error: "Teacher record not found" }, 404);

		const targetBatchIds = new Set<string>();
		if (data.batchId && data.batchId.trim() !== "") targetBatchIds.add(data.batchId.trim());
		if (Array.isArray(data.batchIds)) {
			for (const b of data.batchIds) if (b && b.trim() !== "") targetBatchIds.add(b.trim());
		}
		if (Array.isArray(data.gradeGroups) && data.gradeGroups.length > 0) {
			const allBatches = await db.select({ id: batches.id, name: batches.name, code: batches.code }).from(batches);
			const resolved = resolveBatchesForGroups(data.gradeGroups, allBatches);
			for (const b of resolved) targetBatchIds.add(b);
		}

		const targetSubjectIds = new Set<string>();
		if (data.subjectId && data.subjectId.trim() !== "") targetSubjectIds.add(data.subjectId.trim());
		if (Array.isArray(data.subjectIds)) {
			for (const s of data.subjectIds) if (s && s.trim() !== "") targetSubjectIds.add(s.trim());
		}

		if (targetBatchIds.size === 0) {
			return c.json({ error: "Please select at least one Grade / Class" }, 400);
		}

		if (targetSubjectIds.size === 0) {
			const firstSub = await db.select({ id: subjects.id }).from(subjects).limit(1);
			if (firstSub.length > 0) targetSubjectIds.add(firstSub[0].id);
		}

		let createdCount = 0;
		for (const bId of targetBatchIds) {
			for (const sId of targetSubjectIds) {
				await db
					.insert(teacherAssignments)
					.values({
						id: crypto.randomUUID(),
						teacherId: data.teacherId,
						batchId: bId,
						subjectId: sId,
						isClassTeacher: data.isClassTeacher ? 1 : 0,
					})
					.onConflictDoNothing();
				createdCount++;
			}
		}

		return c.json({ message: `Teacher assigned successfully to ${createdCount} class/subject mappings` }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to assign teacher: " + (err?.message || "Internal error") }, 500);
	}
});

// 4. Remove single assignment
teachersRouter.delete("/assign/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const assignmentId = c.req.param("id");
		const db = createDb(c.env.DB);
		await db.delete(teacherAssignments).where(eq(teacherAssignments.id, assignmentId));
		return c.json({ message: "Teacher assignment removed successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to remove assignment: " + (err?.message || "Internal error") }, 500);
	}
});

// 5. Bulk remove assignments (e.g. for removing an entire grouped grade)
teachersRouter.post("/assign/bulk-delete", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const ids = body?.assignmentIds;
		if (!Array.isArray(ids) || ids.length === 0) {
			return c.json({ error: "assignmentIds must be a non-empty array" }, 400);
		}
		const db = createDb(c.env.DB);
		for (const id of ids) {
			await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
		}
		return c.json({ message: "Assignments removed successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to remove assignments: " + (err?.message || "Internal error") }, 500);
	}
});

// 5. Get teacher's assignments
teachersRouter.get("/:id/assignments", requireAuth, async (c) => {
	const teacherId = c.req.param("id");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	if (authUser.role === "teacher" && authUser.teacherId !== teacherId) {
		return c.json({ error: "Forbidden: You cannot view another faculty's assignments" }, 403);
	}

	const assignments = await db
		.select({
			id: teacherAssignments.id,
			batchId: batches.id,
			batchName: batches.name,
			batchCode: batches.code,
			subjectId: subjects.id,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			isClassTeacher: teacherAssignments.isClassTeacher,
		})
		.from(teacherAssignments)
		.innerJoin(batches, eq(teacherAssignments.batchId, batches.id))
		.innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
		.where(eq(teacherAssignments.teacherId, teacherId));

	return c.json({ assignments });
});

// 6. Delete teacher
teachersRouter.delete("/:id", requireAuth, requireAdmin, async (c) => {
	const teacherId = c.req.param("id");
	const db = createDb(c.env.DB);

	const teacherList = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
	if (teacherList.length === 0) {
		return c.json({ error: "Teacher not found" }, 404);
	}
	const teacher = teacherList[0];

	try {
		// Clean up related records
		await db.update(complaints).set({ assignedToTeacherId: null }).where(eq(complaints.assignedToTeacherId, teacherId));
		await db.delete(teacherAssignments).where(eq(teacherAssignments.teacherId, teacherId));
		await db.delete(timetables).where(eq(timetables.teacherId, teacherId));
		await db.delete(teacherRemarks).where(eq(teacherRemarks.teacherId, teacherId));

		const hwList = await db.select({ id: homework.id }).from(homework).where(eq(homework.teacherId, teacherId));
		for (const hw of hwList) {
			await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, hw.id));
		}
		await db.delete(homework).where(eq(homework.teacherId, teacherId));

		const sessList = await db.select({ id: attendanceSessions.id }).from(attendanceSessions).where(eq(attendanceSessions.teacherId, teacherId));
		for (const sess of sessList) {
			await db.delete(attendanceRecords).where(eq(attendanceRecords.sessionId, sess.id));
		}
		await db.delete(attendanceSessions).where(eq(attendanceSessions.teacherId, teacherId));

		await db.delete(teachers).where(eq(teachers.id, teacherId));
		await db.delete(notifications).where(eq(notifications.userId, teacher.userId));
		await db.delete(auditLogs).where(eq(auditLogs.userId, teacher.userId));
		await db.delete(users).where(eq(users.id, teacher.userId));

		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: c.get("user").sub,
			action: "DELETE",
			entityType: "teachers",
			entityId: teacherId,
			details: JSON.stringify({ employeeId: teacher.employeeId }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		return c.json({ message: "Teacher deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete teacher: " + (err?.message || "Internal error") }, 500);
	}
});

// 7. Get Teacher Attendance Records
teachersRouter.get("/:id/attendance", requireAuth, async (c) => {
	const teacherId = c.req.param("id");
	const db = createDb(c.env.DB);

	const records = await db
		.select()
		.from(teacherAttendance)
		.where(eq(teacherAttendance.teacherId, teacherId))
		.orderBy(desc(teacherAttendance.attendanceDate));

	return c.json({ teacherId, attendance: records });
});

// 8. Mark / Update Teacher Attendance (Admin)
teachersRouter.post("/:id/attendance", requireAuth, requireAdmin, async (c) => {
	const teacherId = c.req.param("id");
	const db = createDb(c.env.DB);
	const body = await c.req.json();

	const {
		attendanceDate = new Date().toISOString().split("T")[0],
		status = "present", // 'present', 'absent', 'on_leave', 'half_day'
		remarks,
		checkInTime,
		checkOutTime,
	} = body;

	const existing = await db
		.select()
		.from(teacherAttendance)
		.where(
			and(
				eq(teacherAttendance.teacherId, teacherId),
				eq(teacherAttendance.attendanceDate, attendanceDate)
			)
		)
		.limit(1);

	if (existing[0]) {
		await db
			.update(teacherAttendance)
			.set({
				status,
				remarks: remarks || null,
				checkInTime: checkInTime || existing[0].checkInTime,
				checkOutTime: checkOutTime || existing[0].checkOutTime,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(teacherAttendance.id, existing[0].id));
	} else {
		const id = `tatt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		await db.insert(teacherAttendance).values({
			id,
			teacherId,
			attendanceDate,
			status,
			remarks: remarks || null,
			checkInTime: checkInTime || null,
			checkOutTime: checkOutTime || null,
		});
	}

	return c.json({ message: "Teacher attendance recorded successfully" });
});

// 9. Teacher Syllabus & Chapters Progress Oversight (Admin inspection)
// "I must be able to see if the teachers are doing the chapters for the students"
teachersRouter.get("/:id/chapters", requireAuth, async (c) => {
	const teacherId = c.req.param("id");
	const db = createDb(c.env.DB);

	// Get teacher's batch and subject assignments
	const assignments = await db
		.select({
			batchId: batches.id,
			batchName: batches.name,
			batchCode: batches.code,
			subjectId: subjects.id,
			subjectName: subjects.name,
			subjectCode: subjects.code,
		})
		.from(teacherAssignments)
		.innerJoin(batches, eq(teacherAssignments.batchId, batches.id))
		.innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
		.where(eq(teacherAssignments.teacherId, teacherId));

	// Fetch all chapters across these batches and subjects
	const report: any[] = [];
	for (const a of assignments) {
		const chs = await db
			.select()
			.from(syllabusChapters)
			.where(
				and(
					eq(syllabusChapters.batchId, a.batchId),
					eq(syllabusChapters.subjectId, a.subjectId)
				)
			)
			.orderBy(syllabusChapters.chapterNumber);

		const total = chs.length;
		const completed = chs.filter((c: any) => c.status === "completed").length;
		const inProgress = chs.filter((c: any) => c.status === "in_progress").length;
		const pending = chs.filter((c: any) => c.status === "pending").length;

		report.push({
			...a,
			totalChapters: total,
			completed,
			inProgress,
			pending,
			percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
			chapters: chs,
		});
	}

	return c.json({ teacherId, curriculumOversight: report });
});

export default teachersRouter;


import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	classes,
	batches,
	subjects,
	academicSessions,
	timetables,
	studentEnrollments,
	students,
	users,
	teachers,
	teacherAssignments,
	attendanceSessions,
	attendanceRecords,
	homework,
	homeworkSubmissions,
	teacherRemarks,
	notices,
	auditLogs,
	syllabusChapters,
	feeStructures,
} from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

async function getEffectiveTeacherId(db: ReturnType<typeof createDb>, user: any): Promise<string | null> {
	if (user.teacherId) return user.teacherId;
	if (user.role === "teacher") {
		const tRec = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.sub)).limit(1);
		return tRec[0]?.id || null;
	}
	return null;
}

const DEFAULT_SUBJECTS = [
	{ id: "sub-mat", name: "Mathematics", code: "MATH", description: "Pure & Applied Mathematics" },
	{ id: "sub-sci", name: "General Science", code: "SCI", description: "General Science (Physics, Chemistry, Biology)" },
	{ id: "sub-phy", name: "Physics", code: "PHY", description: "Physics for Secondary & Senior Secondary" },
	{ id: "sub-che", name: "Chemistry", code: "CHE", description: "Chemistry (Organic, Inorganic & Physical)" },
	{ id: "sub-bio", name: "Biology", code: "BIO", description: "Botany, Zoology & Life Sciences" },
	{ id: "sub-eng", name: "English Language & Lit", code: "ENG", description: "English Language, Grammar & Literature" },
	{ id: "sub-soc", name: "Social Studies", code: "SST", description: "History, Civics, Geography & Economics" },
	{ id: "sub-com", name: "Computer Science & IT", code: "CS", description: "Computer Science, Coding & Applications" },
	{ id: "sub-fre", name: "French", code: "FRE", description: "French Language & Literature" },
	{ id: "sub-skt", name: "Sanskrit", code: "SKT", description: "Sanskrit Language & Grammar" },
	{ id: "sub-hin", name: "Hindi", code: "HIN", description: "Hindi Language & Literature" },
	{ id: "sub-eco", name: "Economics", code: "ECO", description: "Micro & Macro Economics, Development" },
	{ id: "sub-psy", name: "Psychology", code: "PSY", description: "Psychology & Behavioral Studies" },
	{ id: "sub-bst", name: "Business Studies", code: "BST", description: "Principles of Business & Management" },
	{ id: "sub-acc", name: "Accountancy", code: "ACC", description: "Financial Accounting & Bookkeeping" },
];

async function ensureDefaultGradesAndSubjects(db: ReturnType<typeof createDb>) {
	try {
		// 1. Ensure Standard Subjects
		const existingSubjects = await db.select({ code: subjects.code }).from(subjects);
		const existingSubjectCodes = new Set(existingSubjects.map((s) => s.code.toUpperCase()));
		for (const sub of DEFAULT_SUBJECTS) {
			if (!existingSubjectCodes.has(sub.code.toUpperCase())) {
				await db
					.insert(subjects)
					.values({
						id: sub.id,
						name: sub.name,
						code: sub.code,
						description: sub.description,
					})
					.catch(() => {});
			}
		}

		// 2. Ensure Active Academic Session
		const activeSession = await db.select().from(academicSessions).where(eq(academicSessions.isCurrent, 1)).limit(1);
		const targetSessionId = activeSession[0]?.id || "sess-2026-27";
		if (!activeSession[0]) {
			await db
				.insert(academicSessions)
				.values({
					id: targetSessionId,
					name: "2026-2027",
					startDate: "2026-04-01",
					endDate: "2027-03-31",
					isCurrent: 1,
				})
				.catch(() => {});
		}

		// 3. Ensure NIOS Open School Class & Batch exist
		const existingClasses = await db.select().from(classes);
		const existingClassCodes = new Set(existingClasses.map((c) => c.code.toUpperCase()));

		if (!existingClassCodes.has("NIOS-9-10")) {
			await db
				.insert(classes)
				.values({
					id: "cls-nios",
					name: "NIOS Open School (9th & 10th)",
					code: "NIOS-9-10",
					description: "NIOS Open Schooling Morning Program (9:00 AM - 12:30 PM)",
				})
				.catch(() => {});

			await db
				.insert(batches)
				.values({
					id: "batch-nios",
					classId: "cls-nios",
					academicSessionId: targetSessionId,
					name: "NIOS Open School (9th & 10th)",
					code: "NIOS-MORN",
					capacity: 35,
				})
				.catch(() => {});
		}

		// 4. Ensure Grades 1st to 12th exist
		for (let i = 1; i <= 12; i++) {
			const suffix = i === 1 ? "st" : i === 2 ? "nd" : i === 3 ? "rd" : "th";
			const code = `G${i}`;
			const name = `Grade ${i}`;
			const classId = `cls-g${i}`;
			const batchId = `batch-g${i}`;

			if (!existingClassCodes.has(code.toUpperCase())) {
				await db
					.insert(classes)
					.values({
						id: classId,
						name,
						code,
						description: `Grade ${i} (${i}${suffix}) CBSE & ICSE Academic Program`,
					})
					.catch(() => {});

				await db
					.insert(batches)
					.values({
						id: batchId,
						classId,
						academicSessionId: targetSessionId,
						name,
						code: `G${i}-SEC`,
						capacity: 40,
					})
					.catch(() => {});
			} else {
				// Normalize existing class and batch names to clean "Grade i"
				await db
					.update(classes)
					.set({ name })
					.where(eq(classes.code, code))
					.catch(() => {});
				await db
					.update(batches)
					.set({ name })
					.where(eq(batches.id, batchId))
					.catch(() => {});
			}
		}

		// 5. Clean up obsolete grouped classes so ONLY Grade 1-12 and NIOS remain
		const obsoleteClasses = existingClasses.filter((c) => {
			const codeUpper = (c.code || "").toUpperCase();
			const nameLower = (c.name || "").toLowerCase();
			return (
				codeUpper === "G1-4" ||
				codeUpper === "G5-8" ||
				codeUpper === "G9-12" ||
				codeUpper === "ALL-GRADE" ||
				nameLower.includes("grade 1 to 4") ||
				nameLower.includes("grade 5 to 8") ||
				nameLower.includes("grade 9 to 12") ||
				nameLower.includes("all grade")
			);
		});

		for (const obs of obsoleteClasses) {
			// Clean fee_structures
			await db.delete(feeStructures).where(eq(feeStructures.classId, obs.id)).catch(() => {});

			// Clean batches
			const obsBatches = await db.select({ id: batches.id }).from(batches).where(eq(batches.classId, obs.id));
			for (const ob of obsBatches) {
				await db.delete(teacherAssignments).where(eq(teacherAssignments.batchId, ob.id)).catch(() => {});
				await db.delete(timetables).where(eq(timetables.batchId, ob.id)).catch(() => {});
				await db.update(studentEnrollments).set({ batchId: "batch-g1" }).where(eq(studentEnrollments.batchId, ob.id)).catch(() => {});
				await db.delete(batches).where(eq(batches.id, ob.id)).catch(() => {});
			}

			// Delete class
			await db.delete(classes).where(eq(classes.id, obs.id)).catch(() => {});
		}
	} catch (e) {
		// Ignore auto-seed errors non-destructively
	}
}

function sortGradesAndClasses(list: any[]) {
	return [...list].sort((a, b) => {
		const getGradeNum = (name: string, code: string) => {
			const m = (name || "").match(/Grade\s*(\d+)/i) || (code || "").match(/^G(\d+)$/i);
			if (m) return parseInt(m[1], 10);
			if ((name || "").toLowerCase().includes("nios")) return 99;
			return 100;
		};
		const numA = getGradeNum(a.name || "", a.code || "");
		const numB = getGradeNum(b.name || "", b.code || "");
		if (numA !== numB) return numA - numB;
		return (a.name || "").localeCompare(b.name || "");
	});
}

const academicRouter = new Hono<{ Bindings: Bindings }>();

// 1. Classes
academicRouter.get("/classes", requireAuth, async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DB);
		await ensureDefaultGradesAndSubjects(db);
		const all = await db.select().from(classes);

		if (user && user.role === "teacher") {
			const teacherId = await getEffectiveTeacherId(db, user);
			if (teacherId) {
				const myAssignments = await db
					.select({ classId: batches.classId })
					.from(teacherAssignments)
					.innerJoin(batches, eq(teacherAssignments.batchId, batches.id))
					.where(eq(teacherAssignments.teacherId, teacherId));

				const assignedClassIds = new Set(myAssignments.map((a) => a.classId).filter(Boolean));
				if (assignedClassIds.size > 0) {
					const filtered = all.filter((cls) => assignedClassIds.has(cls.id));
					const sorted = sortGradesAndClasses(filtered);
					return c.json({ classes: sorted });
				} else {
					return c.json({ classes: [] });
				}
			} else {
				return c.json({ classes: [] });
			}
		}

		const sorted = sortGradesAndClasses(all);
		return c.json({ classes: sorted });
	} catch (err: any) {
		return c.json({ error: "Failed to load classes: " + (err?.message || "Internal error") }, 500);
	}
});

academicRouter.post("/classes", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const schema = z.object({
			name: z.string().trim().min(1, "Class name is required"),
			code: z.string().trim().min(1, "Class code is required"),
			description: z.string().trim().or(z.literal("")).optional(),
		});
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const db = createDb(c.env.DB);
		const id = crypto.randomUUID();
		await db.insert(classes).values({
			id,
			name: parsed.data.name,
			code: parsed.data.code,
			description: parsed.data.description || null,
		});
		return c.json({ message: "Class created successfully", id }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to create class: " + (err?.message || "Internal error") }, 500);
	}
});

academicRouter.delete("/classes/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const classId = c.req.param("id");
		const db = createDb(c.env.DB);

		// Clean fee structures referencing this class
		await db.delete(feeStructures).where(eq(feeStructures.classId, classId)).catch(() => {});

		// Cascade delete batches referencing this class
		const batchList = await db.select({ id: batches.id }).from(batches).where(eq(batches.classId, classId));
		for (const b of batchList) {
			await db.delete(teacherAssignments).where(eq(teacherAssignments.batchId, b.id)).catch(() => {});
			await db.delete(timetables).where(eq(timetables.batchId, b.id)).catch(() => {});
			await db.delete(studentEnrollments).where(eq(studentEnrollments.batchId, b.id)).catch(() => {});
			await db.delete(batches).where(eq(batches.id, b.id)).catch(() => {});
		}

		await db.delete(classes).where(eq(classes.id, classId));
		return c.json({ message: "Class deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete class: " + (err?.message || "Internal error") }, 500);
	}
});

// 2. Batches
academicRouter.get("/batches", requireAuth, async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DB);
		await ensureDefaultGradesAndSubjects(db);
		const classId = c.req.query("classId");
		const requestedTeacherId = c.req.query("teacherId");

		const all = await db
			.select({
				id: batches.id,
				classId: batches.classId,
				className: classes.name,
				academicSessionId: batches.academicSessionId,
				name: batches.name,
				code: batches.code,
				capacity: batches.capacity,
			})
			.from(batches)
			.leftJoin(classes, eq(batches.classId, classes.id));

		// Get count of students enrolled in each batch
		const allEnrollments = await db.select({ batchId: studentEnrollments.batchId }).from(studentEnrollments);
		const enrollmentCounts: Record<string, number> = {};
		for (const e of allEnrollments) {
			enrollmentCounts[e.batchId] = (enrollmentCounts[e.batchId] || 0) + 1;
		}

		let batchesWithCounts = all.map((b) => ({
			...b,
			className: b.className || "General",
			enrolledCount: enrollmentCounts[b.id] || 0,
		}));

		// Faculty scoping: Teachers only see their assigned batches
		if (user && user.role === "teacher") {
			const teacherId = await getEffectiveTeacherId(db, user);
			if (teacherId) {
				const myAssignments = await db
					.select({ batchId: teacherAssignments.batchId })
					.from(teacherAssignments)
					.where(eq(teacherAssignments.teacherId, teacherId));

				const assignedBatchIds = new Set(myAssignments.map((a) => a.batchId));
				batchesWithCounts = batchesWithCounts.filter((b) => assignedBatchIds.has(b.id));
			} else {
				batchesWithCounts = [];
			}
		} else if (user && user.role === "admin" && requestedTeacherId) {
			const myAssignments = await db
				.select({ batchId: teacherAssignments.batchId })
				.from(teacherAssignments)
				.where(eq(teacherAssignments.teacherId, requestedTeacherId));

			const assignedBatchIds = new Set(myAssignments.map((a) => a.batchId));
			batchesWithCounts = batchesWithCounts.filter((b) => assignedBatchIds.has(b.id));
		}

		const filtered = classId ? batchesWithCounts.filter((b) => b.classId === classId) : batchesWithCounts;
		const sorted = sortGradesAndClasses(filtered);
		return c.json({ batches: sorted });
	} catch (err: any) {
		return c.json({ error: "Failed to load batches: " + (err?.message || "Internal error") }, 500);
	}
});

academicRouter.post("/batches", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const schema = z.object({
			classId: z.string().trim().min(1, "Target class is required"),
			academicSessionId: z.string().trim().or(z.literal("")).optional(),
			name: z.string().trim().min(1, "Batch name is required"),
			code: z.string().trim().or(z.literal("")).optional(),
			capacity: z.coerce.number().min(1).default(40),
		});
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const db = createDb(c.env.DB);

		// Verify target class exists
		const classRows = await db.select().from(classes).where(eq(classes.id, parsed.data.classId)).limit(1);
		if (classRows.length === 0) {
			return c.json({ error: "Selected class does not exist" }, 400);
		}

		// Auto-resolve valid academicSessionId
		let targetSessionId = parsed.data.academicSessionId;
		if (!targetSessionId) {
			const active = await db.select().from(academicSessions).where(eq(academicSessions.isCurrent, 1)).limit(1);
			targetSessionId = active.length > 0 ? active[0].id : "session-2026-2027";
		} else {
			const existing = await db.select().from(academicSessions).where(eq(academicSessions.id, targetSessionId)).limit(1);
			if (existing.length === 0) {
				const active = await db.select().from(academicSessions).where(eq(academicSessions.isCurrent, 1)).limit(1);
				targetSessionId = active.length > 0 ? active[0].id : "session-2026-2027";
			}
		}

		const id = crypto.randomUUID();
		await db.insert(batches).values({
			id,
			classId: parsed.data.classId,
			academicSessionId: targetSessionId,
			name: parsed.data.name,
			code: parsed.data.code ? parsed.data.code : null,
			capacity: parsed.data.capacity,
		});

		return c.json({ message: "Batch created successfully", id }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to create batch: " + (err?.message || "Internal error") }, 500);
	}
});

// Delete Batch (Admin)
academicRouter.delete("/batches/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const batchId = c.req.param("id");
		const db = createDb(c.env.DB);

		// Cascade cleanup batch dependencies:
		await db.delete(teacherAssignments).where(eq(teacherAssignments.batchId, batchId));
		await db.delete(timetables).where(eq(timetables.batchId, batchId));
		await db.delete(studentEnrollments).where(eq(studentEnrollments.batchId, batchId));

		const hwList = await db.select({ id: homework.id }).from(homework).where(eq(homework.batchId, batchId));
		for (const hw of hwList) {
			await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, hw.id));
		}
		await db.delete(homework).where(eq(homework.batchId, batchId));

		const sessList = await db.select({ id: attendanceSessions.id }).from(attendanceSessions).where(eq(attendanceSessions.batchId, batchId));
		for (const sess of sessList) {
			await db.delete(attendanceRecords).where(eq(attendanceRecords.sessionId, sess.id));
		}
		await db.delete(attendanceSessions).where(eq(attendanceSessions.batchId, batchId));

		await db.delete(teacherRemarks).where(eq(teacherRemarks.batchId, batchId));
		await db.update(notices).set({ batchId: null }).where(eq(notices.batchId, batchId));

		await db.delete(batches).where(eq(batches.id, batchId));

		return c.json({ message: "Batch deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete batch: " + (err?.message || "Internal error") }, 500);
	}
});

// 3. Subjects
academicRouter.get("/subjects", requireAuth, async (c) => {
	try {
		const db = createDb(c.env.DB);
		await ensureDefaultGradesAndSubjects(db);
		const all = await db.select().from(subjects).orderBy(subjects.name);
		return c.json({ subjects: all });
	} catch (err: any) {
		return c.json({ error: "Failed to load subjects: " + (err?.message || "Internal error") }, 500);
	}
});

academicRouter.post("/subjects", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const schema = z.object({
			name: z.string().trim().min(1, "Subject name is required"),
			code: z.string().trim().min(1, "Subject code is required"),
			description: z.string().trim().or(z.literal("")).optional(),
		});
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			const errorMsg = parsed.error.issues.map((i) => i.message).join(", ") || "Validation failed";
			return c.json({ error: errorMsg }, 400);
		}

		const db = createDb(c.env.DB);
		const codeUpper = parsed.data.code.toUpperCase();

		// Check if subject code already exists
		const existingCode = await db.select().from(subjects).where(eq(subjects.code, codeUpper)).limit(1);
		if (existingCode.length > 0) {
			return c.json({ error: `Subject code '${codeUpper}' is already registered for '${existingCode[0].name}'.` }, 400);
		}

		const id = crypto.randomUUID();
		await db.insert(subjects).values({
			id,
			name: parsed.data.name,
			code: codeUpper,
			description: parsed.data.description || null,
		});
		return c.json({ message: `Subject "${parsed.data.name}" created successfully`, id }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to create subject: " + (err?.message || "Internal error") }, 500);
	}
});

academicRouter.delete("/subjects/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const subjectId = c.req.param("id");
		const db = createDb(c.env.DB);

		// Clean up assignments, timetables, and syllabus chapters
		await db.delete(teacherAssignments).where(eq(teacherAssignments.subjectId, subjectId));
		await db.delete(timetables).where(eq(timetables.subjectId, subjectId));
		await db.delete(syllabusChapters).where(eq(syllabusChapters.subjectId, subjectId));
		await db.delete(subjects).where(eq(subjects.id, subjectId));

		return c.json({ message: "Subject deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete subject: " + (err?.message || "Internal error") }, 500);
	}
});

// 4. Batch Roster
academicRouter.get("/batches/:id/students", requireAuth, async (c) => {
	const batchId = c.req.param("id");
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user && user.role === "teacher") {
		const teacherId = await getEffectiveTeacherId(db, user);
		if (teacherId) {
			const myAssignments = await db
				.select({ batchId: teacherAssignments.batchId })
				.from(teacherAssignments)
				.where(and(eq(teacherAssignments.teacherId, teacherId), eq(teacherAssignments.batchId, batchId)))
				.limit(1);

			if (myAssignments.length === 0) {
				return c.json({ error: "Forbidden: You are not assigned to this batch" }, 403);
			}
		} else {
			return c.json({ error: "Forbidden: Faculty profile not found" }, 403);
		}
	}

	const enrolled = await db
		.select({
			enrollmentId: studentEnrollments.id,
			studentId: students.id,
			admissionNumber: students.admissionNumber,
			rollNumber: studentEnrollments.rollNumber,
			fullName: users.fullName,
			username: users.username,
			status: studentEnrollments.status,
		})
		.from(studentEnrollments)
		.innerJoin(students, eq(studentEnrollments.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.where(eq(studentEnrollments.batchId, batchId));

	return c.json({ students: enrolled });
});

// 5. Timetables
academicRouter.get("/timetables/batch/:batchId", requireAuth, async (c) => {
	const batchId = c.req.param("batchId");
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user && user.role === "teacher") {
		const teacherId = await getEffectiveTeacherId(db, user);
		if (teacherId) {
			const myAssignments = await db
				.select({ batchId: teacherAssignments.batchId })
				.from(teacherAssignments)
				.where(and(eq(teacherAssignments.teacherId, teacherId), eq(teacherAssignments.batchId, batchId)))
				.limit(1);

			if (myAssignments.length === 0) {
				return c.json({ error: "Forbidden: You are not assigned to this batch" }, 403);
			}
		} else {
			return c.json({ error: "Forbidden: Faculty profile not found" }, 403);
		}
	}

	const slots = await db
		.select({
			id: timetables.id,
			dayOfWeek: timetables.dayOfWeek,
			startTime: timetables.startTime,
			endTime: timetables.endTime,
			roomNumber: timetables.roomNumber,
			subjectName: subjects.name,
			subjectCode: subjects.code,
		})
		.from(timetables)
		.innerJoin(subjects, eq(timetables.subjectId, subjects.id))
		.where(eq(timetables.batchId, batchId));

	return c.json({ timetables: slots });
});

export default academicRouter;

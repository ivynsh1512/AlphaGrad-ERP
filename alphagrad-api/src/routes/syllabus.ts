import { Hono } from "hono";
import { eq, and, or, isNull, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { syllabusChapters, subjects, batches, studentEnrollments, students, users, teachers, teacherAssignments } from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const syllabusRouter = new Hono();

// Helper: Calculate progress percentage based on chapter status
function normalizeChapterProgress(status: string, progressPercentage?: number): number {
	if (status === "completed") return 100;
	if (status === "pending") return 0;
	if (typeof progressPercentage === "number" && progressPercentage >= 0 && progressPercentage <= 100) {
		return progressPercentage;
	}
	return 50; // default for in_progress
}

// Helper: Merge master chapters and student-specific chapters
function mergeStudentChapters(masterChapters: any[], studentChapters: any[]) {
	const studentMap = new Map<string, any>();
	for (const sc of studentChapters) {
		// Key by subjectId + chapterNumber or id
		const key = `${sc.subjectId}___${(sc.chapterNumber || "").trim().toLowerCase()}`;
		studentMap.set(key, sc);
	}

	const merged: any[] = [];
	const usedStudentKeys = new Set<string>();

	for (const mc of masterChapters) {
		const key = `${mc.subjectId}___${(mc.chapterNumber || "").trim().toLowerCase()}`;
		if (studentMap.has(key)) {
			merged.push(studentMap.get(key));
			usedStudentKeys.add(key);
		} else {
			merged.push(mc);
		}
	}

	// Add any student-specific chapters that weren't in master template
	for (const sc of studentChapters) {
		const key = `${sc.subjectId}___${(sc.chapterNumber || "").trim().toLowerCase()}`;
		if (!usedStudentKeys.has(key)) {
			merged.push(sc);
		}
	}

	return merged;
}

// 1. Get syllabus and portion completion for a batch (supports ?studentId=...)
syllabusRouter.get("/batch/:batchId", requireAuth, async (c) => {
	const user = c.get("user");
	const db = getDb(c.env.DB);
	const batchId = c.req.param("batchId");
	const studentId = c.req.query("studentId");

	if (user && user.role === "teacher") {
		let teacherId = user.teacherId;
		if (!teacherId) {
			const t = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.sub)).limit(1);
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

	let chapters: any[] = [];

	if (studentId) {
		// Fetch master chapters for batch
		const masterChapters = await db
			.select({
				id: syllabusChapters.id,
				batchId: syllabusChapters.batchId,
				studentId: syllabusChapters.studentId,
				subjectId: syllabusChapters.subjectId,
				subjectName: subjects.name,
				subjectCode: subjects.code,
				chapterNumber: syllabusChapters.chapterNumber,
				chapterTitle: syllabusChapters.chapterTitle,
				status: syllabusChapters.status,
				progressPercentage: syllabusChapters.progressPercentage,
				targetCompletionDate: syllabusChapters.targetCompletionDate,
				completedAt: syllabusChapters.completedAt,
				notes: syllabusChapters.notes,
				createdAt: syllabusChapters.createdAt,
				updatedAt: syllabusChapters.updatedAt,
			})
			.from(syllabusChapters)
			.leftJoin(subjects, eq(syllabusChapters.subjectId, subjects.id))
			.where(and(eq(syllabusChapters.batchId, batchId), isNull(syllabusChapters.studentId)))
			.orderBy(subjects.name, syllabusChapters.chapterNumber);

		// Fetch student-specific chapters
		const studentChapters = await db
			.select({
				id: syllabusChapters.id,
				batchId: syllabusChapters.batchId,
				studentId: syllabusChapters.studentId,
				subjectId: syllabusChapters.subjectId,
				subjectName: subjects.name,
				subjectCode: subjects.code,
				chapterNumber: syllabusChapters.chapterNumber,
				chapterTitle: syllabusChapters.chapterTitle,
				status: syllabusChapters.status,
				progressPercentage: syllabusChapters.progressPercentage,
				targetCompletionDate: syllabusChapters.targetCompletionDate,
				completedAt: syllabusChapters.completedAt,
				notes: syllabusChapters.notes,
				createdAt: syllabusChapters.createdAt,
				updatedAt: syllabusChapters.updatedAt,
			})
			.from(syllabusChapters)
			.leftJoin(subjects, eq(syllabusChapters.subjectId, subjects.id))
			.where(and(eq(syllabusChapters.batchId, batchId), eq(syllabusChapters.studentId, studentId)))
			.orderBy(subjects.name, syllabusChapters.chapterNumber);

		chapters = mergeStudentChapters(masterChapters, studentChapters);
	} else {
		// All batch chapters (master default)
		chapters = await db
			.select({
				id: syllabusChapters.id,
				batchId: syllabusChapters.batchId,
				studentId: syllabusChapters.studentId,
				subjectId: syllabusChapters.subjectId,
				subjectName: subjects.name,
				subjectCode: subjects.code,
				chapterNumber: syllabusChapters.chapterNumber,
				chapterTitle: syllabusChapters.chapterTitle,
				status: syllabusChapters.status,
				progressPercentage: syllabusChapters.progressPercentage,
				targetCompletionDate: syllabusChapters.targetCompletionDate,
				completedAt: syllabusChapters.completedAt,
				notes: syllabusChapters.notes,
				createdAt: syllabusChapters.createdAt,
				updatedAt: syllabusChapters.updatedAt,
			})
			.from(syllabusChapters)
			.leftJoin(subjects, eq(syllabusChapters.subjectId, subjects.id))
			.where(eq(syllabusChapters.batchId, batchId))
			.orderBy(subjects.name, syllabusChapters.chapterNumber);
	}
	chapters = chapters.map((ch) => ({
		...ch,
		title: ch.chapterTitle || ch.title || "Untitled Chapter",
		chapterTitle: ch.chapterTitle || ch.title || "Untitled Chapter",
	}));

	const total = chapters.length;
	const completed = chapters.filter((ch) => ch.status === "completed").length;
	const inProgress = chapters.filter((ch) => ch.status === "in_progress").length;
	const pending = chapters.filter((ch) => ch.status === "pending").length;

	const overallPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

	// Subject breakdown
	const subjectMap: Record<string, { id: string; name: string; code: string; subjectId: string; subjectName: string; subjectCode: string; chapters: typeof chapters; total: number; completed: number; inProgress: number; pending: number; percentage: number }> = {};

	for (const ch of chapters) {
		const sId = ch.subjectId || "general";
		if (!subjectMap[sId]) {
			subjectMap[sId] = {
				id: sId,
				name: ch.subjectName || "Subject",
				code: ch.subjectCode || "SUB",
				subjectId: sId,
				subjectName: ch.subjectName || "Subject",
				subjectCode: ch.subjectCode || "SUB",
				chapters: [],
				total: 0,
				completed: 0,
				inProgress: 0,
				pending: 0,
				percentage: 0,
			};
		}
		subjectMap[sId].chapters.push(ch);
		subjectMap[sId].total++;
		if (ch.status === "completed") subjectMap[sId].completed++;
		else if (ch.status === "in_progress") subjectMap[sId].inProgress++;
		else subjectMap[sId].pending++;
	}

	for (const key of Object.keys(subjectMap)) {
		const sub = subjectMap[key];
		sub.percentage = sub.total > 0 ? Math.round((sub.completed / sub.total) * 100) : 0;
	}

	return c.json({
		batchId,
		studentId: studentId || null,
		summary: {
			total,
			completed,
			inProgress,
			pending,
			overallPercentage,
		},
		subjects: Object.values(subjectMap),
		chapters,
	});
});

// 2. Get syllabus and portion completion for a student
syllabusRouter.get("/student/:studentId", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const studentId = c.req.param("studentId");

	// Get student's enrolled batch
	const enrollment = await db
		.select({
			batchId: studentEnrollments.batchId,
			batchName: batches.name,
		})
		.from(studentEnrollments)
		.leftJoin(batches, eq(studentEnrollments.batchId, batches.id))
		.where(eq(studentEnrollments.studentId, studentId))
		.limit(1);

	let batchId = enrollment[0]?.batchId;

	// Fallback to default batch if enrollment is not found
	if (!batchId) {
		const defaultBatch = await db.select({ id: batches.id, name: batches.name }).from(batches).limit(1);
		batchId = defaultBatch[0]?.id || "batch-jee-11";
	}

	// Fetch master chapters for batch
	const masterChapters = await db
		.select({
			id: syllabusChapters.id,
			batchId: syllabusChapters.batchId,
			studentId: syllabusChapters.studentId,
			subjectId: syllabusChapters.subjectId,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			chapterNumber: syllabusChapters.chapterNumber,
			chapterTitle: syllabusChapters.chapterTitle,
			status: syllabusChapters.status,
			progressPercentage: syllabusChapters.progressPercentage,
			targetCompletionDate: syllabusChapters.targetCompletionDate,
			completedAt: syllabusChapters.completedAt,
			notes: syllabusChapters.notes,
			createdAt: syllabusChapters.createdAt,
			updatedAt: syllabusChapters.updatedAt,
		})
		.from(syllabusChapters)
		.leftJoin(subjects, eq(syllabusChapters.subjectId, subjects.id))
		.where(and(eq(syllabusChapters.batchId, batchId), isNull(syllabusChapters.studentId)))
		.orderBy(subjects.name, syllabusChapters.chapterNumber);

	// Fetch student-specific chapters
	const studentChapters = await db
		.select({
			id: syllabusChapters.id,
			batchId: syllabusChapters.batchId,
			studentId: syllabusChapters.studentId,
			subjectId: syllabusChapters.subjectId,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			chapterNumber: syllabusChapters.chapterNumber,
			chapterTitle: syllabusChapters.chapterTitle,
			status: syllabusChapters.status,
			progressPercentage: syllabusChapters.progressPercentage,
			targetCompletionDate: syllabusChapters.targetCompletionDate,
			completedAt: syllabusChapters.completedAt,
			notes: syllabusChapters.notes,
			createdAt: syllabusChapters.createdAt,
			updatedAt: syllabusChapters.updatedAt,
		})
		.from(syllabusChapters)
		.leftJoin(subjects, eq(syllabusChapters.subjectId, subjects.id))
		.where(eq(syllabusChapters.studentId, studentId))
		.orderBy(subjects.name, syllabusChapters.chapterNumber);

	const chapters = mergeStudentChapters(masterChapters, studentChapters).map((ch) => ({
		...ch,
		title: ch.chapterTitle || ch.title || "Untitled Chapter",
		chapterTitle: ch.chapterTitle || ch.title || "Untitled Chapter",
	}));

	const total = chapters.length;
	const completed = chapters.filter((ch) => ch.status === "completed").length;
	const inProgress = chapters.filter((ch) => ch.status === "in_progress").length;
	const pending = chapters.filter((ch) => ch.status === "pending").length;
	const overallPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

	// Subject breakdown
	const subjectMap: Record<string, { id: string; name: string; code: string; subjectId: string; subjectName: string; subjectCode: string; chapters: typeof chapters; total: number; completed: number; inProgress: number; pending: number; percentage: number }> = {};

	for (const ch of chapters) {
		const sId = ch.subjectId || "general";
		if (!subjectMap[sId]) {
			subjectMap[sId] = {
				id: sId,
				name: ch.subjectName || "Subject",
				code: ch.subjectCode || "SUB",
				subjectId: sId,
				subjectName: ch.subjectName || "Subject",
				subjectCode: ch.subjectCode || "SUB",
				chapters: [],
				total: 0,
				completed: 0,
				inProgress: 0,
				pending: 0,
				percentage: 0,
			};
		}
		subjectMap[sId].chapters.push(ch);
		subjectMap[sId].total++;
		if (ch.status === "completed") subjectMap[sId].completed++;
		else if (ch.status === "in_progress") subjectMap[sId].inProgress++;
		else subjectMap[sId].pending++;
	}

	for (const key of Object.keys(subjectMap)) {
		const sub = subjectMap[key];
		sub.percentage = sub.total > 0 ? Math.round((sub.completed / sub.total) * 100) : 0;
	}

	let returnedSubjects = Object.values(subjectMap);
	if (returnedSubjects.length === 0) {
		try {
			const allAcademicSubjects = await db
				.select({ id: subjects.id, name: subjects.name, code: subjects.code })
				.from(subjects)
				.orderBy(subjects.name);

			returnedSubjects = allAcademicSubjects.map((s) => ({
				id: s.id,
				name: s.name,
				code: s.code,
				subjectId: s.id,
				subjectName: s.name,
				subjectCode: s.code,
				chapters: [],
				total: 0,
				completed: 0,
				inProgress: 0,
				pending: 0,
				percentage: 0,
			}));
		} catch (subErr) {
			console.error("Failed to fallback subjects for student syllabus:", subErr);
		}
	}

	return c.json({
		studentId,
		batchId,
		batchName: enrollment[0]?.batchName || "Enrolled Batch",
		summary: {
			total,
			completed,
			inProgress,
			pending,
			overallPercentage,
		},
		subjects: returnedSubjects,
		chapters,
	});
});

// 3. Create a new chapter (admin or teacher, supports optional studentId)
syllabusRouter.post("/", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can add syllabus chapters." }, 403);
	}

	const db = getDb(c.env.DB);
	const body = await c.req.json();

	const {
		batchId,
		subjectId,
		chapterNumber,
		status = "pending",
		progressPercentage,
		targetCompletionDate,
		notes,
		studentId,
	} = body;
	const chapterTitle = body.chapterTitle || body.title;

	if (!batchId || !subjectId || !chapterTitle) {
		return c.json({ error: "batchId, subjectId, and chapterTitle are required." }, 400);
	}

	const id = `syl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const normalizedProgress = normalizeChapterProgress(status, progressPercentage);
	const completedAt = status === "completed" ? Math.floor(Date.now() / 1000) : null;

	await db.insert(syllabusChapters).values({
		id,
		batchId,
		subjectId,
		teacherId: user.teacherId || null,
		studentId: studentId || null,
		chapterNumber: chapterNumber || "Chapter",
		chapterTitle,
		status,
		progressPercentage: normalizedProgress,
		targetCompletionDate: targetCompletionDate || null,
		completedAt,
		notes: notes || null,
	});

	const created = await db
		.select()
		.from(syllabusChapters)
		.where(eq(syllabusChapters.id, id))
		.limit(1);

	return c.json({ message: "Chapter added successfully", chapter: created[0] }, 201);
});

// 4. Update chapter status, progress %, target date, and notes (supports student-specific tracking)
syllabusRouter.patch("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can update syllabus progress." }, 403);
	}

	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const body = await c.req.json();

	const existing = await db
		.select()
		.from(syllabusChapters)
		.where(eq(syllabusChapters.id, id))
		.limit(1);

	if (!existing[0]) {
		return c.json({ error: "Chapter not found." }, 404);
	}

	const targetStudentId = body.studentId || null;

	// If updating a master chapter for a specific student, clone it to student-specific record
	if (targetStudentId && !existing[0].studentId) {
		// Check if student already has a record for this chapterNumber and subjectId
		const studentExisting = await db
			.select()
			.from(syllabusChapters)
			.where(
				and(
					eq(syllabusChapters.batchId, existing[0].batchId),
					eq(syllabusChapters.subjectId, existing[0].subjectId),
					eq(syllabusChapters.chapterNumber, existing[0].chapterNumber),
					eq(syllabusChapters.studentId, targetStudentId)
				)
			)
			.limit(1);

		const updatedStatus = body.status !== undefined ? body.status : existing[0].status;
		const updatedProgress =
			body.status !== undefined
				? normalizeChapterProgress(body.status, body.progressPercentage)
				: body.progressPercentage !== undefined
				? body.progressPercentage
				: existing[0].progressPercentage;

		const completedAt = updatedStatus === "completed" ? Math.floor(Date.now() / 1000) : null;

		if (studentExisting[0]) {
			await db
				.update(syllabusChapters)
				.set({
					status: updatedStatus,
					progressPercentage: updatedProgress,
					completedAt,
					targetCompletionDate:
						body.targetCompletionDate !== undefined
							? body.targetCompletionDate
							: studentExisting[0].targetCompletionDate,
					notes: body.notes !== undefined ? body.notes : studentExisting[0].notes,
					chapterTitle: body.chapterTitle || studentExisting[0].chapterTitle,
					updatedAt: sql`(unixepoch())`,
				})
				.where(eq(syllabusChapters.id, studentExisting[0].id));

			const updated = await db
				.select()
				.from(syllabusChapters)
				.where(eq(syllabusChapters.id, studentExisting[0].id))
				.limit(1);

			return c.json({ message: "Student chapter progress updated", chapter: updated[0] });
		} else {
			const newId = `syl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
			await db.insert(syllabusChapters).values({
				id: newId,
				batchId: existing[0].batchId,
				subjectId: existing[0].subjectId,
				teacherId: user.teacherId || existing[0].teacherId,
				studentId: targetStudentId,
				chapterNumber: body.chapterNumber || existing[0].chapterNumber,
				chapterTitle: body.chapterTitle || existing[0].chapterTitle,
				status: updatedStatus,
				progressPercentage: updatedProgress,
				targetCompletionDate:
					body.targetCompletionDate !== undefined ? body.targetCompletionDate : existing[0].targetCompletionDate,
				completedAt,
				notes: body.notes !== undefined ? body.notes : existing[0].notes,
			});

			const created = await db
				.select()
				.from(syllabusChapters)
				.where(eq(syllabusChapters.id, newId))
				.limit(1);

			return c.json({ message: "Student chapter progress saved", chapter: created[0] });
		}
	}

	// Normal in-place update for existing record
	const updateData: any = {
		updatedAt: sql`(unixepoch())`,
	};

	if (body.chapterNumber !== undefined) updateData.chapterNumber = body.chapterNumber;
	if (body.chapterTitle !== undefined) updateData.chapterTitle = body.chapterTitle;
	if (body.targetCompletionDate !== undefined) updateData.targetCompletionDate = body.targetCompletionDate;
	if (body.notes !== undefined) updateData.notes = body.notes;

	if (body.status !== undefined) {
		updateData.status = body.status;
		updateData.progressPercentage = normalizeChapterProgress(body.status, body.progressPercentage);
		if (body.status === "completed") {
			updateData.completedAt = Math.floor(Date.now() / 1000);
		} else {
			updateData.completedAt = null;
		}
	} else if (body.progressPercentage !== undefined) {
		updateData.progressPercentage = body.progressPercentage;
		if (body.progressPercentage >= 100) {
			updateData.status = "completed";
			updateData.completedAt = Math.floor(Date.now() / 1000);
		} else if (body.progressPercentage > 0) {
			updateData.status = "in_progress";
			updateData.completedAt = null;
		} else {
			updateData.status = "pending";
			updateData.completedAt = null;
		}
	}

	await db.update(syllabusChapters).set(updateData).where(eq(syllabusChapters.id, id));

	const updated = await db
		.select()
		.from(syllabusChapters)
		.where(eq(syllabusChapters.id, id))
		.limit(1);

	return c.json({ message: "Chapter updated successfully", chapter: updated[0] });
});

// 5. Delete chapter
syllabusRouter.delete("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can delete syllabus chapters." }, 403);
	}

	const db = getDb(c.env.DB);
	const id = c.req.param("id");

	await db.delete(syllabusChapters).where(eq(syllabusChapters.id, id));

	return c.json({ message: "Chapter deleted successfully" });
});

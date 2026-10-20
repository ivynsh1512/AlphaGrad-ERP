import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { monthlyAssessments, assessmentMarks, subjects, batches, students, users, studentEnrollments, teachers, teacherAssignments } from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const assessmentsRouter = new Hono();

// Helper: Calculate grade based on percentage
function calculateGrade(marks: number, maxMarks: number): string {
	if (maxMarks <= 0) return "N/A";
	const percentage = (marks / maxMarks) * 100;
	if (percentage >= 90) return "A+";
	if (percentage >= 80) return "A";
	if (percentage >= 70) return "B+";
	if (percentage >= 60) return "B";
	if (percentage >= 50) return "C";
	return "D";
}

// 1. List all assessments for a batch (supports ?studentId=... and ?subjectId=...)
assessmentsRouter.get("/batch/:batchId", requireAuth, async (c) => {
	const user = c.get("user");
	const db = getDb(c.env.DB);
	const batchId = c.req.param("batchId");
	const studentId = c.req.query("studentId");
	const subjectId = c.req.query("subjectId");

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

	if (studentId) {
		const conditions = [eq(monthlyAssessments.batchId, batchId)];
		if (subjectId) {
			conditions.push(eq(monthlyAssessments.subjectId, subjectId));
		}

		const list = await db
			.select({
				id: monthlyAssessments.id,
				batchId: monthlyAssessments.batchId,
				subjectId: monthlyAssessments.subjectId,
				subjectName: subjects.name,
				subjectCode: subjects.code,
				title: monthlyAssessments.title,
				month: monthlyAssessments.month,
				assessmentDate: monthlyAssessments.assessmentDate,
				maxMarks: monthlyAssessments.maxMarks,
				passingMarks: monthlyAssessments.passingMarks,
				status: monthlyAssessments.status,
				description: monthlyAssessments.description,
				createdAt: monthlyAssessments.createdAt,
				// Student specific fields
				marksObtained: assessmentMarks.marksObtained,
				grade: assessmentMarks.grade,
				rank: assessmentMarks.rank,
				remarks: assessmentMarks.remarks,
			})
			.from(monthlyAssessments)
			.leftJoin(subjects, eq(monthlyAssessments.subjectId, subjects.id))
			.leftJoin(
				assessmentMarks,
				and(
					eq(assessmentMarks.assessmentId, monthlyAssessments.id),
					eq(assessmentMarks.studentId, studentId)
				)
			)
			.where(and(...conditions))
			.orderBy(desc(monthlyAssessments.assessmentDate));

		return c.json({ batchId, studentId, assessments: list });
	}

	const conditions = [eq(monthlyAssessments.batchId, batchId)];
	if (subjectId) {
		conditions.push(eq(monthlyAssessments.subjectId, subjectId));
	}

	const list = await db
		.select({
			id: monthlyAssessments.id,
			batchId: monthlyAssessments.batchId,
			subjectId: monthlyAssessments.subjectId,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			title: monthlyAssessments.title,
			month: monthlyAssessments.month,
			assessmentDate: monthlyAssessments.assessmentDate,
			maxMarks: monthlyAssessments.maxMarks,
			passingMarks: monthlyAssessments.passingMarks,
			status: monthlyAssessments.status,
			description: monthlyAssessments.description,
			createdAt: monthlyAssessments.createdAt,
		})
		.from(monthlyAssessments)
		.leftJoin(subjects, eq(monthlyAssessments.subjectId, subjects.id))
		.where(and(...conditions))
		.orderBy(desc(monthlyAssessments.assessmentDate));

	return c.json({ batchId, assessments: list });
});

// 2. Get single assessment with all student scores
assessmentsRouter.get("/:id", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");

	const record = await db
		.select({
			id: monthlyAssessments.id,
			batchId: monthlyAssessments.batchId,
			batchName: batches.name,
			subjectId: monthlyAssessments.subjectId,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			title: monthlyAssessments.title,
			month: monthlyAssessments.month,
			assessmentDate: monthlyAssessments.assessmentDate,
			maxMarks: monthlyAssessments.maxMarks,
			passingMarks: monthlyAssessments.passingMarks,
			status: monthlyAssessments.status,
			description: monthlyAssessments.description,
		})
		.from(monthlyAssessments)
		.leftJoin(subjects, eq(monthlyAssessments.subjectId, subjects.id))
		.leftJoin(batches, eq(monthlyAssessments.batchId, batches.id))
		.where(eq(monthlyAssessments.id, id))
		.limit(1);

	if (!record[0]) {
		return c.json({ error: "Assessment not found" }, 404);
	}

	// Fetch student marks for this assessment
	const marks = await db
		.select({
			id: assessmentMarks.id,
			studentId: assessmentMarks.studentId,
			studentName: users.fullName,
			studentAdmissionNumber: students.admissionNumber,
			marksObtained: assessmentMarks.marksObtained,
			grade: assessmentMarks.grade,
			rank: assessmentMarks.rank,
			remarks: assessmentMarks.remarks,
		})
		.from(assessmentMarks)
		.innerJoin(students, eq(assessmentMarks.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.where(eq(assessmentMarks.assessmentId, id))
		.orderBy(desc(assessmentMarks.marksObtained));

	return c.json({
		assessment: record[0],
		marks,
	});
});

// 3. Get monthly assessments for a specific student
assessmentsRouter.get("/student/:studentId", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const studentId = c.req.param("studentId");

	// Get student's enrolled batch
	const enrollment = await db
		.select({ batchId: studentEnrollments.batchId, batchName: batches.name })
		.from(studentEnrollments)
		.leftJoin(batches, eq(studentEnrollments.batchId, batches.id))
		.where(eq(studentEnrollments.studentId, studentId))
		.limit(1);

	let batchId = enrollment[0]?.batchId;
	if (!batchId) {
		const defaultBatch = await db.select({ id: batches.id }).from(batches).limit(1);
		batchId = defaultBatch[0]?.id || "batch-jee-11";
	}

	// Fetch all assessments for this batch and join student's marks if available
	const allAssessments = await db
		.select({
			id: monthlyAssessments.id,
			title: monthlyAssessments.title,
			month: monthlyAssessments.month,
			assessmentDate: monthlyAssessments.assessmentDate,
			maxMarks: monthlyAssessments.maxMarks,
			passingMarks: monthlyAssessments.passingMarks,
			subjectId: monthlyAssessments.subjectId,
			subjectName: subjects.name,
			subjectCode: subjects.code,
			marksObtained: assessmentMarks.marksObtained,
			grade: assessmentMarks.grade,
			rank: assessmentMarks.rank,
			remarks: assessmentMarks.remarks,
		})
		.from(monthlyAssessments)
		.leftJoin(subjects, eq(monthlyAssessments.subjectId, subjects.id))
		.leftJoin(
			assessmentMarks,
			and(
				eq(assessmentMarks.assessmentId, monthlyAssessments.id),
				eq(assessmentMarks.studentId, studentId)
			)
		)
		.where(eq(monthlyAssessments.batchId, batchId))
		.orderBy(desc(monthlyAssessments.assessmentDate));

	// Compute student stats
	const gradedAssessments = allAssessments.filter((a) => a.marksObtained !== null && a.marksObtained !== undefined);
	const totalTaken = gradedAssessments.length;

	let totalPercentage = 0;
	let highestPercentage = 0;

	for (const a of gradedAssessments) {
		const pct = a.maxMarks > 0 ? ((a.marksObtained || 0) / a.maxMarks) * 100 : 0;
		totalPercentage += pct;
		if (pct > highestPercentage) highestPercentage = pct;
	}

	const averagePercentage = totalTaken > 0 ? Math.round(totalPercentage / totalTaken) : 0;
	const overallGrade = calculateGrade(averagePercentage, 100);

	return c.json({
		studentId,
		batchId,
		batchName: enrollment[0]?.batchName || "Cohort",
		summary: {
			totalTaken,
			totalAvailable: allAssessments.length,
			averagePercentage,
			highestPercentage: Math.round(highestPercentage),
			overallGrade,
		},
		assessments: allAssessments,
	});
});

// 4. Create a new monthly assessment (admin or teacher)
assessmentsRouter.post("/", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can create monthly assessments." }, 403);
	}

	const db = getDb(c.env.DB);
	const body = await c.req.json();

	const {
		batchId,
		subjectId,
		title,
		month,
		assessmentDate,
		maxMarks = 100,
		passingMarks = 40,
		description,
	} = body;

	if (!batchId || !subjectId || !title || !assessmentDate) {
		return c.json({ error: "batchId, subjectId, title, and assessmentDate are required." }, 400);
	}

	const id = `asmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const formattedMonth = month || new Date(assessmentDate).toLocaleString("en-US", { month: "long", year: "numeric" });

	await db.insert(monthlyAssessments).values({
		id,
		batchId,
		subjectId,
		teacherId: user.teacherId || null,
		title,
		month: formattedMonth,
		assessmentDate,
		maxMarks: Number(maxMarks) || 100,
		passingMarks: Number(passingMarks) || 40,
		status: "published",
		description: description || null,
	});

	const created = await db
		.select()
		.from(monthlyAssessments)
		.where(eq(monthlyAssessments.id, id))
		.limit(1);

	return c.json({ message: "Assessment created successfully", assessment: created[0] }, 201);
});

// 5. Enter/Batch-update student marks
assessmentsRouter.post("/:id/marks", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can submit marks." }, 403);
	}

	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const body = await c.req.json();
	const { marks } = body;

	if (!Array.isArray(marks) || marks.length === 0) {
		return c.json({ error: "marks array is required." }, 400);
	}

	// Verify assessment exists
	const assessment = await db
		.select()
		.from(monthlyAssessments)
		.where(eq(monthlyAssessments.id, id))
		.limit(1);

	if (!assessment[0]) {
		return c.json({ error: "Assessment not found." }, 404);
	}

	const maxMarks = assessment[0].maxMarks || 100;

	for (const item of marks) {
		const studentId = item.studentId;
		const marksObtained = Number(item.marksObtained) || 0;
		const grade = item.grade || calculateGrade(marksObtained, maxMarks);
		const remarks = item.remarks || null;

		// Check if record exists
		const existing = await db
			.select({ id: assessmentMarks.id })
			.from(assessmentMarks)
			.where(
				and(
					eq(assessmentMarks.assessmentId, id),
					eq(assessmentMarks.studentId, studentId)
				)
			)
			.limit(1);

		if (existing[0]) {
			await db
				.update(assessmentMarks)
				.set({
					marksObtained,
					grade,
					remarks,
					updatedAt: sql`(unixepoch())`,
				})
				.where(eq(assessmentMarks.id, existing[0].id));
		} else {
			const markId = `mrk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
			await db.insert(assessmentMarks).values({
				id: markId,
				assessmentId: id,
				studentId,
				marksObtained,
				grade,
				remarks,
			});
		}
	}

	return c.json({ message: "Marks recorded successfully", count: marks.length });
});

// 6. Direct assessment and grade submission for a specific child (staff allotted subject)
assessmentsRouter.post("/student-mark", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can record student assessments." }, 403);
	}

	const db = getDb(c.env.DB);
	const body = await c.req.json();
	const {
		batchId,
		studentId,
		subjectId,
		title,
		month,
		assessmentDate,
		maxMarks = 100,
		passingMarks = 40,
		marksObtained,
		grade,
		remarks,
		description,
	} = body;

	let effectiveBatchId = batchId;
	if (!effectiveBatchId && studentId) {
		const enrollment = await db
			.select({ batchId: studentEnrollments.batchId })
			.from(studentEnrollments)
			.where(eq(studentEnrollments.studentId, studentId))
			.limit(1);
		effectiveBatchId = enrollment[0]?.batchId;
	}

	const effectiveDate = assessmentDate || new Date().toISOString().split("T")[0];

	if (!effectiveBatchId || !studentId || !subjectId || !title || marksObtained === undefined) {
		return c.json({ error: "batchId, studentId, subjectId, title, and marksObtained are required." }, 400);
	}

	const max = Number(maxMarks) || 100;
	const pass = Number(passingMarks) || 40;
	const formattedMonth = month || new Date(effectiveDate).toLocaleString("en-US", { month: "long", year: "numeric" });

	// Find or create assessment
	let assessmentId = "";
	const existingAsmt = await db
		.select({ id: monthlyAssessments.id })
		.from(monthlyAssessments)
		.where(
			and(
				eq(monthlyAssessments.batchId, effectiveBatchId),
				eq(monthlyAssessments.subjectId, subjectId),
				eq(monthlyAssessments.title, title)
			)
		)
		.limit(1);

	if (existingAsmt[0]) {
		assessmentId = existingAsmt[0].id;
	} else {
		assessmentId = `asmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		await db.insert(monthlyAssessments).values({
			id: assessmentId,
			batchId: effectiveBatchId,
			subjectId,
			teacherId: user.teacherId || null,
			title,
			month: formattedMonth,
			assessmentDate: effectiveDate,
			maxMarks: max,
			passingMarks: pass,
			status: "published",
			description: description || null,
		});
	}

	const numMarks = Number(marksObtained) || 0;
	const calculatedGrade = grade || calculateGrade(numMarks, max);

	const existingMark = await db
		.select({ id: assessmentMarks.id })
		.from(assessmentMarks)
		.where(
			and(
				eq(assessmentMarks.assessmentId, assessmentId),
				eq(assessmentMarks.studentId, studentId)
			)
		)
		.limit(1);

	if (existingMark[0]) {
		await db
			.update(assessmentMarks)
			.set({
				marksObtained: numMarks,
				grade: calculatedGrade,
				remarks: remarks || null,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(assessmentMarks.id, existingMark[0].id));
	} else {
		const markId = `mrk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		await db.insert(assessmentMarks).values({
			id: markId,
			assessmentId,
			studentId,
			marksObtained: numMarks,
			grade: calculatedGrade,
			remarks: remarks || null,
		});
	}

	return c.json({
		message: "Student monthly assessment & grade saved successfully",
		assessmentId,
		studentId,
		marksObtained: numMarks,
		grade: calculatedGrade,
	}, 201);
});

// 7. Delete assessment
assessmentsRouter.delete("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	if (user.role !== "admin" && user.role !== "teacher") {
		return c.json({ error: "Only faculty or administrators can delete assessments." }, 403);
	}

	const db = getDb(c.env.DB);
	const id = c.req.param("id");

	await db.delete(monthlyAssessments).where(eq(monthlyAssessments.id, id));

	return c.json({ message: "Assessment deleted successfully" });
});

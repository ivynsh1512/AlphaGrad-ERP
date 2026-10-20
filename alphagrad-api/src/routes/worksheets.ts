import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	worksheets,
	worksheetAssignments,
	worksheetSubmissions,
	subjects,
	classes,
	batches,
	students,
	users,
	teachers,
	teacherAssignments,
	studentEnrollments,
	notifications,
	aiUsageRecords,
} from "../db/schema";
import { requireAuth, requireTeacher, requireAdmin } from "../middleware/auth";
import { callGroqChat, extractJsonFromResponse } from "../ai/groq";
import { getStudentAcademicProfile, getAiConfiguration } from "../ai/service";

export const worksheetsRouter = new Hono<{ Bindings: Bindings }>();

// 1. Generate Worksheet via Groq AI
const generateSchema = z.object({
	subjectId: z.string().min(1, "Subject is required"),
	classId: z.string().optional(),
	chapter: z.string().optional(),
	topics: z.array(z.string()).default([]),
	difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("medium"),
	questionCount: z.number().min(1).max(20).default(5),
	questionTypes: z.array(z.string()).default(["mcq", "short_answer", "numerical"]),
	includeHints: z.boolean().default(true),
	includeSolutions: z.boolean().default(true),
	board: z.enum(["CBSE", "ICSE", "NIOS", "State"]).default("CBSE").optional(),
	language: z.string().default("English"),
	customInstructions: z.string().optional(),
});

worksheetsRouter.post("/generate", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const config = await getAiConfiguration(db);

	if (!config.isWorksheetGenEnabled) {
		return c.json({ error: "AI Worksheet Generator is currently disabled by institute administration." }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = generateSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid parameters", details: parsed.error.format() }, 400);
	}

	const {
		subjectId,
		chapter,
		topics,
		difficulty,
		questionCount,
		questionTypes,
		includeHints,
		includeSolutions,
		customInstructions,
	} = parsed.data;

	// Resolve Grade and Subject with Authoritative Server Verification
	let targetClassId = parsed.data.classId;
	let gradeName = "Senior Secondary";
	let isStudent = user.role === "student_parent";

	if (isStudent) {
		if (!user.studentId) return c.json({ error: "Student ID missing from session" }, 403);
		const profile = await getStudentAcademicProfile(db, user.studentId);
		if (!profile) return c.json({ error: "Student profile not found" }, 404);
		targetClassId = profile.classId;
		gradeName = profile.className;
	} else if (user.role === "teacher") {
		if (!user.teacherId) return c.json({ error: "Teacher ID missing from session" }, 403);
		// Check that teacher is assigned to teach this subject and class!
		if (targetClassId) {
			const teacherBatches = await db
				.select({ batchId: teacherAssignments.batchId, classId: batches.classId })
				.from(teacherAssignments)
				.innerJoin(batches, eq(teacherAssignments.batchId, batches.id))
				.where(
					and(
						eq(teacherAssignments.teacherId, user.teacherId),
						eq(teacherAssignments.subjectId, subjectId)
					)
				);

			const authorizedClassIds = new Set(teacherBatches.map((b) => b.classId));
			if (!authorizedClassIds.has(targetClassId) && teacherBatches.length > 0) {
				return c.json({
					error: "Forbidden: You are not assigned to teach this grade and subject combination.",
				}, 403);
			}
		}

		if (targetClassId) {
			const cl = await db.select().from(classes).where(eq(classes.id, targetClassId)).limit(1);
			if (cl.length) gradeName = cl[0].name;
		}
	} else if (targetClassId) {
		const cl = await db.select().from(classes).where(eq(classes.id, targetClassId)).limit(1);
		if (cl.length) gradeName = cl[0].name;
	}

	// Verify Subject
	const subRecord = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
	if (!subRecord.length) return c.json({ error: "Subject not found" }, 404);
	const subjectName = subRecord[0].name;
	const selectedBoard = parsed.data.board || "CBSE";

	// Prompt Generation for Groq
	const prompt = `Generate a rigorous, curriculum-aligned academic practice worksheet for Proventus Academy.
Board / Curriculum: ${selectedBoard}
Grade / Level: ${gradeName}
Subject: ${subjectName}
Chapter: ${chapter || "Comprehensive Subject Concepts"}
Topics: ${topics.length > 0 ? topics.join(", ") : "Key curriculum topics"}
Difficulty: ${difficulty.toUpperCase()}
Total Questions: ${questionCount}
Accepted Question Types: ${questionTypes.join(", ")}
Include Hints: ${includeHints}
Include Detailed Solutions: ${includeSolutions}
${customInstructions ? `Special Instructions: ${customInstructions}` : ""}

Return ONLY a valid JSON object matching this exact schema:
{
  "worksheetTitle": "Title of Worksheet",
  "instructions": "Clear guidelines for the student (e.g. time limit, formulas, calculator policy)",
  "estimatedMinutes": 35,
  "totalMarks": 25,
  "questions": [
    {
      "questionNumber": 1,
      "type": "mcq" | "short_answer" | "numerical" | "structured",
      "marks": 2,
      "questionText": "Question statement using proper markdown. Math formulas formatted in KaTeX ($...$ or $$...$$)",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only if type is mcq
      "hint": "Helpful conceptual hint",
      "correctAnswer": "Exact correct answer or option text",
      "detailedSolution": "Step-by-step mathematical working or conceptual explanation"
    }
  ]
}`;

	try {
		const aiResult = await callGroqChat({
			apiKey: c.env.GROQ_API_KEY,
			model: config.defaultModel,
			messages: [
				{
					role: "system",
					content:
						"You are the Proventus Academy Exam Assessment Engine. Create rigorous, error-free academic questions adhering to CBSE, ICSE, and NIOS board standards with precise mathematical notation ($...$ and $$...$$). Output pure JSON.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.2,
			response_format: { type: "json_object" },
		});

		const parsedJson = extractJsonFromResponse<any>(aiResult.content);

		const worksheetId = `ws-${crypto.randomUUID()}`;
		const title = parsedJson.worksheetTitle || `${subjectName} - ${chapter || "Practice"} Worksheet`;
		const totalMarks = Number(parsedJson.totalMarks || questionCount * 4);
		const estimatedMinutes = Number(parsedJson.estimatedMinutes || questionCount * 6);
		const instructions = parsedJson.instructions || "Attempt all questions within the allocated time.";
		const questionsData = JSON.stringify(parsedJson.questions || []);

		// Insert Worksheet into database
		const effectiveUserId = user.sub || user.userId;
		await db.insert(worksheets).values({
			id: worksheetId,
			title,
			description: `Board: ${selectedBoard} | Curriculum: ${gradeName} | Subject: ${subjectName} | Difficulty: ${difficulty}`,
			createdByUserId: effectiveUserId,
			teacherId: user.teacherId || null,
			studentId: user.studentId || null,
			classId: targetClassId || null,
			subjectId,
			chapter: chapter || null,
			topics: JSON.stringify(topics),
			difficulty,
			questionCount,
			totalMarks,
			estimatedMinutes,
			instructions,
			questionsData,
			isTeacherCreated: user.role === "teacher" || user.role === "admin" ? 1 : 0,
			status: "published",
		});

		// Record AI usage
		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: effectiveUserId,
			role: user.role,
			studentId: user.studentId || null,
			actionType: "worksheet_gen",
			model: aiResult.model,
			promptTokens: aiResult.usage.promptTokens,
			completionTokens: aiResult.usage.completionTokens,
			totalTokens: aiResult.usage.totalTokens,
			estimatedCostInUsd: aiResult.estimatedCostUsd,
			status: "success",
		});

		return c.json({
			message: "Worksheet generated successfully",
			worksheet: {
				id: worksheetId,
				title,
				subjectName,
				gradeName,
				chapter,
				difficulty,
				questionCount,
				totalMarks,
				estimatedMinutes,
				instructions,
				questions: parsedJson.questions,
			},
		});
	} catch (error: any) {
		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: user.sub || user.userId,
			role: user.role,
			studentId: user.studentId || null,
			actionType: "worksheet_gen",
			model: config.defaultModel,
			status: "failed",
			errorMessage: error?.message,
		});

		return c.json({ error: error?.message || "Failed to generate worksheet" }, 500);
	}
});

// 2. List Worksheets (Filtered by Role and Privacy)
worksheetsRouter.get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user.role === "student_parent") {
		if (!user.studentId) return c.json({ worksheets: [] });

		// Student gets worksheets they personally generated
		const myWorksheets = await db
			.select({
				id: worksheets.id,
				title: worksheets.title,
				subjectId: worksheets.subjectId,
				chapter: worksheets.chapter,
				difficulty: worksheets.difficulty,
				questionCount: worksheets.questionCount,
				totalMarks: worksheets.totalMarks,
				estimatedMinutes: worksheets.estimatedMinutes,
				isTeacherCreated: worksheets.isTeacherCreated,
				createdAt: worksheets.createdAt,
			})
			.from(worksheets)
			.where(eq(worksheets.studentId, user.studentId))
			.orderBy(desc(worksheets.createdAt))
			.limit(50);

		return c.json({ worksheets: myWorksheets });
	}

	if (user.role === "teacher") {
		if (!user.teacherId) return c.json({ worksheets: [] });

		// Teacher gets worksheets they created
		const teacherWorksheets = await db
			.select({
				id: worksheets.id,
				title: worksheets.title,
				subjectId: worksheets.subjectId,
				classId: worksheets.classId,
				chapter: worksheets.chapter,
				difficulty: worksheets.difficulty,
				questionCount: worksheets.questionCount,
				totalMarks: worksheets.totalMarks,
				estimatedMinutes: worksheets.estimatedMinutes,
				createdAt: worksheets.createdAt,
			})
			.from(worksheets)
			.where(eq(worksheets.teacherId, user.teacherId))
			.orderBy(desc(worksheets.createdAt))
			.limit(100);

		return c.json({ worksheets: teacherWorksheets });
	}

	// Admin: all worksheets
	const all = await db
		.select({
			id: worksheets.id,
			title: worksheets.title,
			subjectId: worksheets.subjectId,
			classId: worksheets.classId,
			chapter: worksheets.chapter,
			difficulty: worksheets.difficulty,
			questionCount: worksheets.questionCount,
			totalMarks: worksheets.totalMarks,
			isTeacherCreated: worksheets.isTeacherCreated,
			createdAt: worksheets.createdAt,
		})
		.from(worksheets)
		.orderBy(desc(worksheets.createdAt))
		.limit(100);

	return c.json({ worksheets: all });
});

// 3. Get Single Worksheet Details (Secured: Protects answer keys if part of an unsubmitted assignment)
worksheetsRouter.get("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	const row = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
	if (!row.length) return c.json({ error: "Worksheet not found" }, 404);

	const ws = row[0];
	let questions = [];
	try {
		questions = JSON.parse(ws.questionsData || "[]");
	} catch {}

	// If this worksheet was assigned to a student as homework/assessment, check if student has submitted before showing answers!
	if (user.role === "student_parent" && ws.isTeacherCreated) {
		const submission = await db
			.select()
			.from(worksheetSubmissions)
			.where(
				and(
					eq(worksheetSubmissions.worksheetId, id),
					eq(worksheetSubmissions.studentId, user.studentId || "")
				)
			)
			.limit(1);

		const isSubmitted = submission.length > 0 && submission[0].status !== "draft";

		if (!isSubmitted) {
			// Redact answers and solutions so student cannot inspect them
			questions = questions.map((q: any) => ({
				questionNumber: q.questionNumber,
				type: q.type,
				marks: q.marks,
				questionText: q.questionText,
				options: q.options,
				hint: q.hint,
				correctAnswer: undefined,
				detailedSolution: undefined,
			}));
		}
	}

	// Attach subject details
	const sub = await db.select().from(subjects).where(eq(subjects.id, ws.subjectId)).limit(1);

	return c.json({
		worksheet: {
			...ws,
			subjectName: sub[0]?.name || "Subject",
			questions,
		},
	});
});

// 4. Update / Edit Worksheet (Teacher or Admin)
worksheetsRouter.put("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	const existing = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
	if (!existing.length) return c.json({ error: "Worksheet not found" }, 404);

	if (user.role !== "admin" && existing[0].createdByUserId !== (user.sub || user.userId)) {
		return c.json({ error: "Forbidden: You cannot edit this worksheet" }, 403);
	}

	const body = await c.req.json().catch(() => ({}));
	const { title, instructions, estimatedMinutes, totalMarks, questions } = body;

	await db
		.update(worksheets)
		.set({
			title: title || existing[0].title,
			instructions: instructions ?? existing[0].instructions,
			estimatedMinutes: estimatedMinutes ?? existing[0].estimatedMinutes,
			totalMarks: totalMarks ?? existing[0].totalMarks,
			questionsData: questions ? JSON.stringify(questions) : existing[0].questionsData,
			updatedAt: sql`(unixepoch())`,
		})
		.where(eq(worksheets.id, id));

	return c.json({ message: "Worksheet updated successfully" });
});

// 5. Regenerate Individual Question by Index (One-Click Teacher Control)
worksheetsRouter.post("/:id/regenerate-question", requireAuth, async (c) => {
	const user = c.get("user");
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	const existing = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
	if (!existing.length) return c.json({ error: "Worksheet not found" }, 404);

	const { questionIndex } = await c.req.json().catch(() => ({}));
	if (questionIndex === undefined || typeof questionIndex !== "number") {
		return c.json({ error: "Valid questionIndex is required" }, 400);
	}

	let questions: any[] = [];
	try {
		questions = JSON.parse(existing[0].questionsData || "[]");
	} catch {}

	if (!questions[questionIndex]) {
		return c.json({ error: "Question index out of bounds" }, 400);
	}

	const targetQ = questions[questionIndex];
	const sub = await db.select().from(subjects).where(eq(subjects.id, existing[0].subjectId)).limit(1);

	const prompt = `Regenerate a replacement question for an academic worksheet.
Subject: ${sub[0]?.name || "Science"}
Chapter: ${existing[0].chapter || "General"}
Question Type: ${targetQ.type || "mcq"}
Difficulty: ${existing[0].difficulty}
Marks: ${targetQ.marks || 2}

Return pure JSON matching this exact structure:
{
  "questionNumber": ${targetQ.questionNumber || questionIndex + 1},
  "type": "${targetQ.type || "mcq"}",
  "marks": ${targetQ.marks || 2},
  "questionText": "Rigorous new question with mathematical notation in LaTeX ($...$)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "hint": "Insightful hint",
  "correctAnswer": "Exact correct answer",
  "detailedSolution": "Worked step-by-step solution"
}`;

	try {
		const aiResult = await callGroqChat({
			apiKey: c.env.GROQ_API_KEY,
			messages: [
				{
					role: "system",
					content: "You are the Proventus Academy Exam Engine. Output pure JSON for the single replacement question.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.3,
			response_format: { type: "json_object" },
		});

		const newQuestion = extractJsonFromResponse<any>(aiResult.content);
		questions[questionIndex] = newQuestion;

		await db
			.update(worksheets)
			.set({
				questionsData: JSON.stringify(questions),
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(worksheets.id, id));

		return c.json({
			message: "Question regenerated successfully",
			updatedQuestion: newQuestion,
			questions,
		});
	} catch (err: any) {
		return c.json({ error: err?.message || "Failed to regenerate question" }, 500);
	}
});

// 6. Assign Worksheet to Students / Batch (One-Click Teacher Publishing)
const assignSchema = z.object({
	worksheetId: z.string().min(1, "Worksheet ID is required"),
	batchId: z.string().min(1, "Batch is required"),
	title: z.string().min(1, "Assignment title is required"),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD"),
	instructions: z.string().optional(),
});

worksheetsRouter.post("/assign", requireTeacher, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	const body = await c.req.json().catch(() => null);
	const parsed = assignSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid assignment parameters", details: parsed.error.format() }, 400);
	}

	const { worksheetId, batchId, title, dueDate, instructions } = parsed.data;

	// Verify teacher authorization for this batch
	if (user.role === "teacher") {
		if (!user.teacherId) return c.json({ error: "Teacher ID missing from session" }, 403);
		const assigned = await db
			.select()
			.from(teacherAssignments)
			.where(
				and(
					eq(teacherAssignments.teacherId, user.teacherId),
					eq(teacherAssignments.batchId, batchId)
				)
			)
			.limit(1);

		if (!assigned.length) {
			return c.json({ error: "Forbidden: You are not assigned to teach this batch." }, 403);
		}
	}

	// Verify worksheet exists
	const ws = await db.select().from(worksheets).where(eq(worksheets.id, worksheetId)).limit(1);
	if (!ws.length) return c.json({ error: "Worksheet not found" }, 404);

	// Prevent duplicate assignment if clicked repeatedly within 30 seconds
	const recentSame = await db
		.select()
		.from(worksheetAssignments)
		.where(
			and(
				eq(worksheetAssignments.worksheetId, worksheetId),
				eq(worksheetAssignments.batchId, batchId),
				eq(worksheetAssignments.dueDate, dueDate)
			)
		)
		.limit(1);

	if (recentSame.length) {
		return c.json({
			message: "Assignment was already published.",
			assignmentId: recentSame[0].id,
		});
	}

	const assignmentId = `asgn-${crypto.randomUUID()}`;
	const teacherId = user.teacherId || null;

	// Insert Assignment
	await db.insert(worksheetAssignments).values({
		id: assignmentId,
		worksheetId,
		teacherId,
		batchId,
		title,
		instructions: instructions || "Complete all problems before the deadline.",
		dueDate,
		status: "active",
	});

	// Get enrolled students in batch to dispatch in-app notifications
	const enrolled = await db
		.select({
			studentId: studentEnrollments.studentId,
			userId: students.userId,
		})
		.from(studentEnrollments)
		.innerJoin(students, eq(studentEnrollments.studentId, students.id))
		.where(eq(studentEnrollments.batchId, batchId));

	for (const s of enrolled) {
		await db
			.insert(notifications)
			.values({
				id: `notif-${crypto.randomUUID()}`,
				userId: s.userId,
				title: `New Assignment: ${title}`,
				message: `Your teacher assigned a practice worksheet due on ${dueDate}.`,
				type: "homework",
				link: `/portal/assignments`,
			})
			.catch(() => {});
	}

	return c.json({
		message: `Successfully assigned worksheet to ${enrolled.length} students in the cohort!`,
		assignmentId,
		assignedCount: enrolled.length,
	});
});

// 7. Teacher Assignment Monitoring: List published assignments with completion stats
worksheetsRouter.get("/assignments/teacher", requireTeacher, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	let assignmentQuery = db
		.select({
			id: worksheetAssignments.id,
			worksheetId: worksheetAssignments.worksheetId,
			title: worksheetAssignments.title,
			dueDate: worksheetAssignments.dueDate,
			status: worksheetAssignments.status,
			batchId: worksheetAssignments.batchId,
			batchName: batches.name,
			worksheetTitle: worksheets.title,
			totalMarks: worksheets.totalMarks,
			createdAt: worksheetAssignments.createdAt,
		})
		.from(worksheetAssignments)
		.innerJoin(batches, eq(worksheetAssignments.batchId, batches.id))
		.innerJoin(worksheets, eq(worksheetAssignments.worksheetId, worksheets.id))
		.orderBy(desc(worksheetAssignments.createdAt));

	const allAssignments = user.role === "admin"
		? await assignmentQuery.limit(100)
		: await assignmentQuery.where(eq(worksheetAssignments.teacherId, user.teacherId || "")).limit(50);

	// Fetch student counts and submission counts for each assignment
	const enriched = await Promise.all(
		allAssignments.map(async (a) => {
			const totalEnrolled = await db
				.select({ count: sql<number>`count(*)` })
				.from(studentEnrollments)
				.where(eq(studentEnrollments.batchId, a.batchId));

			const submitted = await db
				.select({ count: sql<number>`count(*)` })
				.from(worksheetSubmissions)
				.where(eq(worksheetSubmissions.assignmentId, a.id));

			const graded = await db
				.select({ count: sql<number>`count(*)` })
				.from(worksheetSubmissions)
				.where(
					and(
						eq(worksheetSubmissions.assignmentId, a.id),
						eq(worksheetSubmissions.status, "graded")
					)
				);

			const total = Number(totalEnrolled[0]?.count || 0);
			const subCount = Number(submitted[0]?.count || 0);
			const gradCount = Number(graded[0]?.count || 0);

			return {
				...a,
				totalAssigned: total,
				submittedCount: subCount,
				pendingCount: Math.max(0, total - subCount),
				gradedCount: gradCount,
			};
		})
	);

	return c.json({ assignments: enriched });
});

// 8. Student Assignments Inbox: List assignments assigned to the student's batch
worksheetsRouter.get("/assignments/student", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user.role !== "student_parent" || !user.studentId) {
		return c.json({ assignments: [] });
	}

	// Find batches student is enrolled in
	const enrollments = await db
		.select({ batchId: studentEnrollments.batchId })
		.from(studentEnrollments)
		.where(eq(studentEnrollments.studentId, user.studentId));

	const batchIds = enrollments.map((e) => e.batchId);
	if (!batchIds.length) return c.json({ assignments: [] });

	const assignmentsList = await db
		.select({
			id: worksheetAssignments.id,
			worksheetId: worksheetAssignments.worksheetId,
			title: worksheetAssignments.title,
			instructions: worksheetAssignments.instructions,
			dueDate: worksheetAssignments.dueDate,
			status: worksheetAssignments.status,
			batchName: batches.name,
			worksheetTitle: worksheets.title,
			subjectId: worksheets.subjectId,
			totalMarks: worksheets.totalMarks,
			estimatedMinutes: worksheets.estimatedMinutes,
			createdAt: worksheetAssignments.createdAt,
		})
		.from(worksheetAssignments)
		.innerJoin(batches, eq(worksheetAssignments.batchId, batches.id))
		.innerJoin(worksheets, eq(worksheetAssignments.worksheetId, worksheets.id))
		.where(inArray(worksheetAssignments.batchId, batchIds))
		.orderBy(desc(worksheetAssignments.dueDate));

	// Fetch student's submission status for each
	const enriched = await Promise.all(
		assignmentsList.map(async (a) => {
			const sub = await db
				.select()
				.from(worksheetSubmissions)
				.where(
					and(
						eq(worksheetSubmissions.assignmentId, a.id),
						eq(worksheetSubmissions.studentId, user.studentId || "")
					)
				)
				.limit(1);

			const subData = sub[0];
			return {
				...a,
				submissionStatus: subData ? subData.status : "pending",
				totalScore: subData?.totalScore ?? null,
				maxScore: subData?.maxScore ?? a.totalMarks,
				percentage: subData?.percentage ?? null,
				teacherFeedback: subData?.teacherFeedback ?? null,
				submittedAt: subData?.submittedAt ?? null,
			};
		})
	);

	return c.json({ assignments: enriched });
});

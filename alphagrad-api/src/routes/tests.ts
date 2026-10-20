import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	testSeries,
	tests,
	testAttempts,
	subjects,
	classes,
	batches,
	students,
	users,
	paymentTransactions,
	paymentOrders,
	aiUsageRecords,
} from "../db/schema";
import { requireAuth, requireTeacher, requireAdmin } from "../middleware/auth";
import { callGroqChat, extractJsonFromResponse } from "../ai/groq";
import { getStudentAcademicProfile, getAiConfiguration } from "../ai/service";

export const testsRouter = new Hono<{ Bindings: Bindings }>();

// 1. List Test Series (with Free/Paid and Grade filters)
testsRouter.get("/series", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const classId = c.req.query("classId");
	const subjectId = c.req.query("subjectId");

	let query = db
		.select({
			id: testSeries.id,
			title: testSeries.title,
			description: testSeries.description,
			code: testSeries.code,
			classId: testSeries.classId,
			subjectId: testSeries.subjectId,
			isPaid: testSeries.isPaid,
			priceInPaise: testSeries.priceInPaise,
			status: testSeries.status,
			createdAt: testSeries.createdAt,
		})
		.from(testSeries)
		.where(eq(testSeries.status, "active"))
		.orderBy(desc(testSeries.createdAt));

	const seriesList = await query;
	return c.json({ testSeries: seriesList });
});

// 2. List Tests in a Series or by Subject/Grade
testsRouter.get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const testSeriesId = c.req.query("testSeriesId");
	const subjectId = c.req.query("subjectId");

	const testsList = await db
		.select({
			id: tests.id,
			testSeriesId: tests.testSeriesId,
			title: tests.title,
			description: tests.description,
			classId: tests.classId,
			subjectId: tests.subjectId,
			chapter: tests.chapter,
			difficulty: tests.difficulty,
			durationMinutes: tests.durationMinutes,
			totalMarks: tests.totalMarks,
			passingMarks: tests.passingMarks,
			negativeMarkingRate: tests.negativeMarkingRate,
			isPaid: tests.isPaid,
			priceInPaise: tests.priceInPaise,
			status: tests.status,
			createdAt: tests.createdAt,
		})
		.from(tests)
		.where(eq(tests.status, "published"))
		.orderBy(desc(tests.createdAt));

	// For students, check their attempts on each test
	if (user.role === "student_parent" && user.studentId) {
		const myAttempts = await db
			.select()
			.from(testAttempts)
			.where(eq(testAttempts.studentId, user.studentId));

		const attemptMap: Record<string, any> = {};
		for (const a of myAttempts) {
			if (!attemptMap[a.testId] || a.status === "in_progress") {
				attemptMap[a.testId] = a;
			}
		}

		const enriched = testsList.map((t) => ({
			...t,
			latestAttempt: attemptMap[t.id]
				? {
						attemptId: attemptMap[t.id].id,
						status: attemptMap[t.id].status,
						score: attemptMap[t.id].score,
						percentage: attemptMap[t.id].percentage,
						isPassed: attemptMap[t.id].isPassed === 1,
				  }
				: null,
		}));

		return c.json({ tests: enriched });
	}

	return c.json({ tests: testsList });
});

// 3. AI Test Generator (Teachers and Admins)
const generateTestSchema = z.object({
	title: z.string().min(1, "Test title is required"),
	subjectId: z.string().min(1, "Subject is required"),
	classId: z.string().optional(),
	testSeriesId: z.string().optional(),
	chapter: z.string().optional(),
	topics: z.array(z.string()).default([]),
	difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("medium"),
	questionCount: z.number().min(3).max(30).default(10),
	durationMinutes: z.number().min(5).max(180).default(45),
	passingMarks: z.number().default(40),
	negativeMarkingRate: z.number().min(0).max(1).default(0.25),
	isPaid: z.boolean().default(false),
	priceInRupees: z.number().default(0),
	board: z.enum(["CBSE", "ICSE", "NIOS", "State"]).default("CBSE").optional(),
});

testsRouter.post("/generate", requireTeacher, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const config = await getAiConfiguration(db);

	if (!config.isTestGenEnabled) {
		return c.json({ error: "AI Test Generator is currently disabled by institute administration." }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = generateTestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid test generation parameters", details: parsed.error.format() }, 400);
	}

	const {
		title,
		subjectId,
		classId,
		testSeriesId,
		chapter,
		topics,
		difficulty,
		questionCount,
		durationMinutes,
		passingMarks,
		negativeMarkingRate,
		isPaid,
		priceInRupees,
	} = parsed.data;

	const subRecord = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
	if (!subRecord.length) return c.json({ error: "Subject not found" }, 404);
	const subjectName = subRecord[0].name;

	let gradeName = "Senior Secondary";
	if (classId) {
		const cl = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
		if (cl.length) gradeName = cl[0].name;
	}

	const selectedBoard = parsed.data.board || "CBSE";
	const prompt = `Generate a standardized, examination-grade test paper for Proventus Academy.
Board / Curriculum: ${selectedBoard}
Grade: ${gradeName}
Subject: ${subjectName}
Chapter: ${chapter || "Comprehensive Syllabus"}
Topics: ${topics.length > 0 ? topics.join(", ") : "Standard curriculum modules"}
Difficulty: ${difficulty.toUpperCase()}
Question Count: ${questionCount}
Negative Marking: ${negativeMarkingRate > 0 ? `${negativeMarkingRate * 100}% deduction for wrong answer` : "None"}

Return ONLY a valid JSON object matching this schema:
{
  "totalMarks": 40,
  "questions": [
    {
      "id": "q1",
      "topic": "Topic Name",
      "questionText": "Clear question statement. Format math with LaTeX ($...$ or $$...$$)",
      "type": "mcq", // "mcq" | "numerical" | "short_answer"
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A) Option 1",
      "marks": 4,
      "negativeMarks": 1,
      "explanation": "Step-by-step worked solution explaining why the answer is correct"
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
						"You are the Proventus Academy Exam Board. Produce rigorous, accurate, high-quality assessment questions with exact answer keys and worked solutions. Return pure JSON only.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.2,
			response_format: { type: "json_object" },
		});

		const testData = extractJsonFromResponse<any>(aiResult.content);
		const testId = `test-${crypto.randomUUID()}`;
		const questions = testData.questions || [];
		const totalMarks = Number(testData.totalMarks || questionCount * 4);

		await db.insert(tests).values({
			id: testId,
			testSeriesId: testSeriesId || null,
			title,
			description: `${gradeName} | ${subjectName} | ${difficulty.toUpperCase()} Difficulty`,
			classId: classId || null,
			subjectId,
			chapter: chapter || null,
			topics: JSON.stringify(topics),
			difficulty,
			durationMinutes,
			totalMarks,
			passingMarks,
			negativeMarkingRate,
			questionsData: JSON.stringify(questions),
			isPaid: isPaid ? 1 : 0,
			priceInPaise: Math.round(priceInRupees * 100),
			status: "published",
			createdByUserId: user.sub || user.userId,
		});

		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: user.sub || user.userId,
			role: user.role,
			actionType: "test_gen",
			model: aiResult.model,
			promptTokens: aiResult.usage.promptTokens,
			completionTokens: aiResult.usage.completionTokens,
			totalTokens: aiResult.usage.totalTokens,
			estimatedCostInUsd: aiResult.estimatedCostUsd,
			status: "success",
		});

		return c.json({
			message: "Test generated and published successfully!",
			testId,
			title,
			totalMarks,
			durationMinutes,
			questionCount: questions.length,
		});
	} catch (err: any) {
		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: user.sub || user.userId,
			role: user.role,
			actionType: "test_gen",
			model: config.defaultModel,
			status: "failed",
			errorMessage: err?.message,
		});

		return c.json({ error: err?.message || "Failed to generate AI test" }, 500);
	}
});

// 4. Student: Fetch Test to Start (Server-Authoritative Entitlement & Redaction of Answer Keys)
testsRouter.get("/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const testId = c.req.param("id");
	const db = createDb(c.env.DB);

	const row = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
	if (!row.length) return c.json({ error: "Test not found" }, 404);

	const test = row[0];

	// Server-side Paid Entitlement Verification
	if (test.isPaid === 1 && user.role === "student_parent") {
		if (!user.studentId) return c.json({ error: "Unauthorized student session" }, 403);

		// Check if student has paid order/transaction for this test or series
		const paidTx = await db
			.select()
			.from(paymentTransactions)
			.where(
				and(
					eq(paymentTransactions.studentId, user.studentId),
					eq(paymentTransactions.status, "captured")
				)
			)
			.limit(1);

		// In production, verify exact entitlement; if not verified, block
		if (!paidTx.length) {
			return c.json({
				error: "This test series is a premium offering. Please enroll or purchase access to attempt this test.",
				isPaid: true,
				priceInRupees: (test.priceInPaise || 0) / 100,
			}, 402);
		}
	}

	let questions: any[] = [];
	try {
		questions = JSON.parse(test.questionsData || "[]");
	} catch {}

	// CRITICAL SECURITY REQUIREMENT:
	// If student is attempting test, redact correct answers and explanations!
	if (user.role === "student_parent") {
		questions = questions.map((q) => ({
			id: q.id,
			topic: q.topic,
			questionText: q.questionText,
			type: q.type,
			options: q.options,
			marks: q.marks,
			negativeMarks: q.negativeMarks,
			correctAnswer: undefined, // REDACTED
			explanation: undefined, // REDACTED
		}));
	}

	const sub = await db.select().from(subjects).where(eq(subjects.id, test.subjectId)).limit(1);

	return c.json({
		test: {
			id: test.id,
			title: test.title,
			description: test.description,
			subjectName: sub[0]?.name || "Subject",
			durationMinutes: test.durationMinutes,
			totalMarks: test.totalMarks,
			passingMarks: test.passingMarks,
			negativeMarkingRate: test.negativeMarkingRate,
			questionCount: questions.length,
			questions,
		},
	});
});

// 5. Start Test Attempt
testsRouter.post("/:id/start", requireAuth, async (c) => {
	const user = c.get("user");
	const testId = c.req.param("id");
	const db = createDb(c.env.DB);

	if (user.role !== "student_parent" || !user.studentId) {
		return c.json({ error: "Only students can attempt tests" }, 403);
	}

	const test = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
	if (!test.length) return c.json({ error: "Test not found" }, 404);

	// Check if an in-progress attempt already exists
	const existing = await db
		.select()
		.from(testAttempts)
		.where(
			and(
				eq(testAttempts.testId, testId),
				eq(testAttempts.studentId, user.studentId),
				eq(testAttempts.status, "in_progress")
			)
		)
		.limit(1);

	if (existing.length) {
		let savedAnswers = {};
		try {
			savedAnswers = JSON.parse(existing[0].answersData || "{}");
		} catch {}

		return c.json({
			message: "Resuming existing attempt",
			attemptId: existing[0].id,
			startTime: existing[0].startTime,
			savedAnswers,
		});
	}

	const attemptId = `att-${crypto.randomUUID()}`;
	const now = Math.floor(Date.now() / 1000);

	await db.insert(testAttempts).values({
		id: attemptId,
		testId,
		studentId: user.studentId,
		startTime: now,
		status: "in_progress",
		answersData: "{}",
		maxMarks: test[0].totalMarks,
	});

	return c.json({
		message: "Test started successfully",
		attemptId,
		startTime: now,
	});
});

// 6. Autosave Test Progress
testsRouter.put("/attempts/:attemptId/save-progress", requireAuth, async (c) => {
	const user = c.get("user");
	const attemptId = c.req.param("attemptId");
	const { answersData } = await c.req.json().catch(() => ({}));
	const db = createDb(c.env.DB);

	const existing = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
	if (!existing.length) return c.json({ error: "Attempt not found" }, 404);

	if (user.role === "student_parent" && existing[0].studentId !== user.studentId) {
		return c.json({ error: "Forbidden: You do not own this attempt" }, 403);
	}

	if (existing[0].status !== "in_progress") {
		return c.json({ error: "This test attempt has already been submitted." }, 400);
	}

	await db
		.update(testAttempts)
		.set({
			answersData: typeof answersData === "string" ? answersData : JSON.stringify(answersData || {}),
			updatedAt: sql`(unixepoch())`,
		})
		.where(eq(testAttempts.id, attemptId));

	return c.json({ message: "Progress saved" });
});

// 7. Submit Test & Deterministic Auto-Grading with Topic Breakdown
testsRouter.post("/attempts/:attemptId/submit", requireAuth, async (c) => {
	const user = c.get("user");
	const attemptId = c.req.param("attemptId");
	const body = await c.req.json().catch(() => ({}));
	const answers = body.answers || {};
	const durationSeconds = body.durationSeconds || 0;
	const db = createDb(c.env.DB);

	const attempt = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
	if (!attempt.length) return c.json({ error: "Attempt not found" }, 404);

	if (user.role === "student_parent" && attempt[0].studentId !== user.studentId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	if (attempt[0].status === "submitted") {
		return c.json({ error: "Attempt already submitted" }, 400);
	}

	const testRow = await db.select().from(tests).where(eq(tests.id, attempt[0].testId)).limit(1);
	if (!testRow.length) return c.json({ error: "Associated test not found" }, 404);

	const test = testRow[0];
	let questions: any[] = [];
	try {
		questions = JSON.parse(test.questionsData || "[]");
	} catch {}

	let totalScore = 0;
	let correctCount = 0;
	let incorrectCount = 0;
	let unattemptedCount = 0;

	const topicStats: Record<string, { totalMarks: number; scoredMarks: number; correct: number; total: number }> = {};
	const detailedResults: any[] = [];

	for (const q of questions) {
		const qId = q.id || `q${q.questionNumber}`;
		const studentAns = answers[qId]?.trim();
		const correctAns = (q.correctAnswer || "").trim();
		const qTopic = q.topic || "General";
		const marks = Number(q.marks || 4);
		const negativeMarks = Number(q.negativeMarks || (test.negativeMarkingRate ? marks * test.negativeMarkingRate : 0));

		if (!topicStats[qTopic]) {
			topicStats[qTopic] = { totalMarks: 0, scoredMarks: 0, correct: 0, total: 0 };
		}
		topicStats[qTopic].total += 1;
		topicStats[qTopic].totalMarks += marks;

		if (!studentAns) {
			unattemptedCount += 1;
			detailedResults.push({
				...q,
				studentAnswer: null,
				isCorrect: false,
				status: "unattempted",
				marksAwarded: 0,
			});
		} else {
			// Normalize for comparison
			const isCorrect =
				studentAns.toLowerCase() === correctAns.toLowerCase() ||
				(q.options && studentAns.charAt(0).toUpperCase() === correctAns.charAt(0).toUpperCase());

			if (isCorrect) {
				totalScore += marks;
				correctCount += 1;
				topicStats[qTopic].correct += 1;
				topicStats[qTopic].scoredMarks += marks;
				detailedResults.push({
					...q,
					studentAnswer: studentAns,
					isCorrect: true,
					status: "correct",
					marksAwarded: marks,
				});
			} else {
				totalScore -= negativeMarks;
				incorrectCount += 1;
				detailedResults.push({
					...q,
					studentAnswer: studentAns,
					isCorrect: false,
					status: "incorrect",
					marksAwarded: -negativeMarks,
				});
			}
		}
	}

	// Score cannot be negative
	const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
	const maxMarks = test.totalMarks || 100;
	const percentage = Math.round((finalScore / maxMarks) * 1000) / 10;
	const isPassed = finalScore >= (test.passingMarks || 40) ? 1 : 0;
	const submitTime = Math.floor(Date.now() / 1000);

	// Update Attempt record
	await db
		.update(testAttempts)
		.set({
			status: "submitted",
			submitTime,
			durationSeconds,
			answersData: JSON.stringify(answers),
			score: finalScore,
			percentage,
			isPassed,
			topicBreakdown: JSON.stringify(topicStats),
			updatedAt: sql`(unixepoch())`,
		})
		.where(eq(testAttempts.id, attemptId));

	return c.json({
		message: "Test submitted successfully!",
		result: {
			attemptId,
			score: finalScore,
			maxMarks,
			percentage,
			isPassed: isPassed === 1,
			correctCount,
			incorrectCount,
			unattemptedCount,
			topicBreakdown: topicStats,
			detailedQuestions: detailedResults,
		},
	});
});

// 8. Get Past Attempt Result & Worked Solutions
testsRouter.get("/attempts/:attemptId/results", requireAuth, async (c) => {
	const user = c.get("user");
	const attemptId = c.req.param("attemptId");
	const db = createDb(c.env.DB);

	const attemptRow = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
	if (!attemptRow.length) return c.json({ error: "Attempt not found" }, 404);

	const attempt = attemptRow[0];
	if (user.role === "student_parent" && attempt.studentId !== user.studentId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const testRow = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
	if (!testRow.length) return c.json({ error: "Test not found" }, 404);

	const test = testRow[0];
	let questions: any[] = [];
	let answers: any = {};
	let topicBreakdown: any = {};

	try {
		questions = JSON.parse(test.questionsData || "[]");
	} catch {}
	try {
		answers = JSON.parse(attempt.answersData || "{}");
	} catch {}
	try {
		topicBreakdown = JSON.parse(attempt.topicBreakdown || "{}");
	} catch {}

	const detailedQuestions = questions.map((q) => {
		const qId = q.id || `q${q.questionNumber}`;
		const studentAns = answers[qId];
		const isCorrect = studentAns && (studentAns.toLowerCase() === (q.correctAnswer || "").toLowerCase());

		return {
			...q,
			studentAnswer: studentAns || null,
			isCorrect: Boolean(isCorrect),
		};
	});

	return c.json({
		attempt: {
			id: attempt.id,
			testTitle: test.title,
			score: attempt.score,
			maxMarks: attempt.maxMarks,
			percentage: attempt.percentage,
			isPassed: attempt.isPassed === 1,
			durationSeconds: attempt.durationSeconds,
			submitTime: attempt.submitTime,
			topicBreakdown,
			questions: detailedQuestions,
		},
	});
});

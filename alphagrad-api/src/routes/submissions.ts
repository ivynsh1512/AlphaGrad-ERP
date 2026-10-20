import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	worksheetAssignments,
	worksheetSubmissions,
	worksheets,
	students,
	users,
	teachers,
	batches,
	classes,
	subjects,
	notifications,
	auditLogs,
	aiUsageRecords,
} from "../db/schema";
import { requireAuth, requireTeacher, requireAdmin } from "../middleware/auth";
import { callGroqChat, extractJsonFromResponse } from "../ai/groq";
import { getAiConfiguration } from "../ai/service";

export const submissionsRouter = new Hono<{ Bindings: Bindings }>();

// 1. Student Submit Assignment Answers
const submitAnswersSchema = z.object({
	answers: z.array(
		z.object({
			questionNumber: z.number(),
			questionText: z.string(),
			type: z.string(),
			studentAnswer: z.string(),
			maxMarks: z.number().default(2),
		})
	),
	isDraft: z.boolean().default(false),
});

submissionsRouter.post("/assignments/:assignmentId/submit", requireAuth, async (c) => {
	const user = c.get("user");
	const assignmentId = c.req.param("assignmentId");
	const db = createDb(c.env.DB);

	if (user.role !== "student_parent" || !user.studentId) {
		return c.json({ error: "Only students can submit assignments" }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = submitAnswersSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid submission payload", details: parsed.error.format() }, 400);
	}

	const assignment = await db
		.select()
		.from(worksheetAssignments)
		.where(eq(worksheetAssignments.id, assignmentId))
		.limit(1);

	if (!assignment.length) {
		return c.json({ error: "Assignment not found" }, 404);
	}

	const worksheetRow = await db
		.select()
		.from(worksheets)
		.where(eq(worksheets.id, assignment[0].worksheetId))
		.limit(1);

	if (!worksheetRow.length) {
		return c.json({ error: "Associated worksheet not found" }, 404);
	}

	const ws = worksheetRow[0];
	let storedQuestions: any[] = [];
	try {
		storedQuestions = JSON.parse(ws.questionsData || "[]");
	} catch {}

	// Auto-grade objective questions (MCQs, exact numerical match)
	let autoScore = 0;
	const gradedAnswers = parsed.data.answers.map((ans) => {
		const originalQ = storedQuestions.find((q) => q.questionNumber === ans.questionNumber) || {};
		const isObjective = ans.type === "mcq" || ans.type === "numerical";
		let isCorrect = false;
		let awardedScore = 0;

		if (isObjective && originalQ.correctAnswer) {
			const studentClean = (ans.studentAnswer || "").trim().toLowerCase();
			const correctClean = (originalQ.correctAnswer || "").trim().toLowerCase();
			isCorrect = studentClean === correctClean ||
				(ans.type === "mcq" && studentClean.charAt(0) === correctClean.charAt(0));

			if (isCorrect) {
				awardedScore = ans.maxMarks;
				autoScore += awardedScore;
			}
		}

		return {
			...ans,
			isCorrect,
			awardedScore,
			correctAnswer: originalQ.correctAnswer || null,
			detailedSolution: originalQ.detailedSolution || null,
		};
	});

	const status = parsed.data.isDraft ? "draft" : "submitted";
	const percentage = Math.round((autoScore / (ws.totalMarks || 25)) * 1000) / 10;

	// Check if already submitted
	const existing = await db
		.select()
		.from(worksheetSubmissions)
		.where(
			and(
				eq(worksheetSubmissions.assignmentId, assignmentId),
				eq(worksheetSubmissions.studentId, user.studentId)
			)
		)
		.limit(1);

	let submissionId = existing[0]?.id;

	if (existing.length) {
		await db
			.update(worksheetSubmissions)
			.set({
				answersData: JSON.stringify(gradedAnswers),
				status,
				totalScore: autoScore,
				percentage,
				submittedAt: sql`(unixepoch())`,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(worksheetSubmissions.id, submissionId));
	} else {
		submissionId = `sub-${crypto.randomUUID()}`;
		await db.insert(worksheetSubmissions).values({
			id: submissionId,
			assignmentId,
			worksheetId: ws.id,
			studentId: user.studentId,
			answersData: JSON.stringify(gradedAnswers),
			status,
			totalScore: autoScore,
			maxScore: ws.totalMarks || 25,
			percentage,
		});
	}

	return c.json({
		message: parsed.data.isDraft ? "Draft saved successfully" : "Assignment submitted successfully!",
		submissionId,
		status,
		autoScore,
	});
});

// 2. Teacher: View Submissions for an Assignment
submissionsRouter.get("/assignments/:assignmentId", requireTeacher, async (c) => {
	const assignmentId = c.req.param("assignmentId");
	const db = createDb(c.env.DB);

	const assignment = await db
		.select({
			id: worksheetAssignments.id,
			title: worksheetAssignments.title,
			dueDate: worksheetAssignments.dueDate,
			batchId: worksheetAssignments.batchId,
			batchName: batches.name,
			worksheetTitle: worksheets.title,
			totalMarks: worksheets.totalMarks,
		})
		.from(worksheetAssignments)
		.innerJoin(batches, eq(worksheetAssignments.batchId, batches.id))
		.innerJoin(worksheets, eq(worksheetAssignments.worksheetId, worksheets.id))
		.where(eq(worksheetAssignments.id, assignmentId))
		.limit(1);

	if (!assignment.length) return c.json({ error: "Assignment not found" }, 404);

	// Get all enrolled students in the batch
	const enrolled = await db
		.select({
			studentId: students.id,
			admissionNumber: students.admissionNumber,
			rollNumber: students.rollNumber,
			fullName: users.fullName,
			username: users.username,
		})
		.from(studentEnrollments)
		.innerJoin(students, eq(studentEnrollments.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.where(eq(studentEnrollments.batchId, assignment[0].batchId))
		.orderBy(users.fullName);

	// Get existing submissions
	const submissions = await db
		.select()
		.from(worksheetSubmissions)
		.where(eq(worksheetSubmissions.assignmentId, assignmentId));

	const subMap = new Map(submissions.map((s) => [s.studentId, s]));

	const roster = enrolled.map((s) => {
		const sub = subMap.get(s.studentId);
		return {
			student: s,
			submission: sub
				? {
						id: sub.id,
						status: sub.status,
						totalScore: sub.totalScore,
						maxScore: sub.maxScore,
						percentage: sub.percentage,
						teacherFeedback: sub.teacherFeedback,
						submittedAt: sub.submittedAt,
						gradedAt: sub.gradedAt,
				  }
				: null,
		};
	});

	return c.json({
		assignment: assignment[0],
		roster,
	});
});

// 3. Teacher: Get Individual Student Submission Details for Evaluation
submissionsRouter.get("/:id", requireTeacher, async (c) => {
	const submissionId = c.req.param("id");
	const db = createDb(c.env.DB);

	const row = await db
		.select({
			submission: worksheetSubmissions,
			studentName: users.fullName,
			admissionNumber: students.admissionNumber,
			worksheetTitle: worksheets.title,
			totalMarks: worksheets.totalMarks,
		})
		.from(worksheetSubmissions)
		.innerJoin(students, eq(worksheetSubmissions.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.innerJoin(worksheets, eq(worksheetSubmissions.worksheetId, worksheets.id))
		.where(eq(worksheetSubmissions.id, submissionId))
		.limit(1);

	if (!row.length) return c.json({ error: "Submission not found" }, 404);

	let answers: any[] = [];
	try {
		answers = JSON.parse(row[0].submission.answersData || "[]");
	} catch {}

	return c.json({
		submission: {
			...row[0].submission,
			studentName: row[0].studentName,
			admissionNumber: row[0].admissionNumber,
			worksheetTitle: row[0].worksheetTitle,
			answers,
		},
	});
});

// 4. AI-Assisted Subjective Grading Proposal (Teacher Workflow)
submissionsRouter.post("/:id/ai-grade", requireTeacher, async (c) => {
	const submissionId = c.req.param("id");
	const db = createDb(c.env.DB);
	const config = await getAiConfiguration(db);

	const sub = await db
		.select()
		.from(worksheetSubmissions)
		.where(eq(worksheetSubmissions.id, submissionId))
		.limit(1);

	if (!sub.length) return c.json({ error: "Submission not found" }, 404);

	let answers: any[] = [];
	try {
		answers = JSON.parse(sub[0].answersData || "[]");
	} catch {}

	const subjectiveQuestions = answers.filter((a) => a.type === "short_answer" || a.type === "structured");
	if (!subjectiveQuestions.length) {
		return c.json({ message: "No subjective questions require AI evaluation.", answers });
	}

	const prompt = `You are the Proventus Academy Senior Examiner evaluating student responses.
For each question below, evaluate the student's answer against the required concept. Propose a fair mark and concise constructive feedback.

Questions & Student Answers:
${JSON.stringify(subjectiveQuestions, null, 2)}

Return pure JSON matching this structure:
{
  "evaluations": [
    {
      "questionNumber": 1,
      "aiSuggestedScore": 2, // Must be between 0 and maxMarks
      "aiFeedback": "Clear step-by-step reasoning shown. Minor calculation slip in the final step."
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
					content: "You are the Proventus Academy Exam Grading Assistant. Return pure JSON with accurate proposed marks and actionable student feedback.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.1,
			response_format: { type: "json_object" },
		});

		const result = extractJsonFromResponse<any>(aiResult.content);
		const evalMap = new Map((result.evaluations || []).map((e: any) => [e.questionNumber, e]));

		const enrichedAnswers = answers.map((a) => {
			if (evalMap.has(a.questionNumber)) {
				const e: any = evalMap.get(a.questionNumber);
				return {
					...a,
					aiSuggestedScore: e.aiSuggestedScore,
					aiFeedback: e.aiFeedback,
					awardedScore: e.aiSuggestedScore, // Default to suggestion for teacher to approve/edit
				};
			}
			return a;
		});

		// Save updated answers with AI proposals
		await db
			.update(worksheetSubmissions)
			.set({
				answersData: JSON.stringify(enrichedAnswers),
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(worksheetSubmissions.id, submissionId));

		return c.json({
			message: "AI evaluation suggestions generated successfully",
			answers: enrichedAnswers,
		});
	} catch (err: any) {
		return c.json({ error: err?.message || "Failed to generate AI grading proposal" }, 500);
	}
});

// 5. Teacher Finalize & Release Grade (Strict Validation & Audit Trail)
const gradeSchema = z.object({
	answers: z.array(
		z.object({
			questionNumber: z.number(),
			awardedScore: z.number().min(0),
			teacherComment: z.string().optional(),
		})
	),
	generalFeedback: z.string().optional(),
	returnForCorrection: z.boolean().default(false),
});

submissionsRouter.put("/:id/grade", requireTeacher, async (c) => {
	const user = c.get("user");
	const submissionId = c.req.param("id");
	const db = createDb(c.env.DB);

	const body = await c.req.json().catch(() => null);
	const parsed = gradeSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid grading payload", details: parsed.error.format() }, 400);
	}

	const subRow = await db
		.select()
		.from(worksheetSubmissions)
		.where(eq(worksheetSubmissions.id, submissionId))
		.limit(1);

	if (!subRow.length) return c.json({ error: "Submission not found" }, 404);
	const sub = subRow[0];

	let existingAnswers: any[] = [];
	try {
		existingAnswers = JSON.parse(sub.answersData || "[]");
	} catch {}

	const gradeMap = new Map(parsed.data.answers.map((g) => [g.questionNumber, g]));
	let totalScore = 0;

	const updatedAnswers = existingAnswers.map((a) => {
		const teacherGrade = gradeMap.get(a.questionNumber);
		const score = teacherGrade ? Number(teacherGrade.awardedScore) : (a.awardedScore || 0);
		// Cap score at question max marks
		const finalQScore = Math.min(score, a.maxMarks || 10);
		totalScore += finalQScore;

		return {
			...a,
			awardedScore: finalQScore,
			teacherFeedback: teacherGrade?.teacherComment || a.teacherFeedback,
		};
	});

	const maxScore = sub.maxScore || 25;
	// Cap total score at maxScore
	const finalTotal = Math.min(totalScore, maxScore);
	const percentage = Math.round((finalTotal / maxScore) * 1000) / 10;
	const finalStatus = parsed.data.returnForCorrection ? "returned" : "graded";

	await db
		.update(worksheetSubmissions)
		.set({
			answersData: JSON.stringify(updatedAnswers),
			totalScore: finalTotal,
			percentage,
			teacherFeedback: parsed.data.generalFeedback || sub.teacherFeedback,
			status: finalStatus,
			gradedAt: sql`(unixepoch())`,
			gradedByTeacherId: user.teacherId || null,
			updatedAt: sql`(unixepoch())`,
		})
		.where(eq(worksheetSubmissions.id, submissionId));

	// Audit log entry for teacher grading action
	await db.insert(auditLogs).values({
		id: `audit-${crypto.randomUUID()}`,
		userId: user.userId,
		action: "SUBMISSION_GRADED",
		entityType: "worksheet_submissions",
		entityId: submissionId,
		details: JSON.stringify({
			awardedScore: finalTotal,
			maxScore,
			status: finalStatus,
		}),
	});

	// Dispatch notification to student
	const studentRecord = await db.select().from(students).where(eq(students.id, sub.studentId)).limit(1);
	if (studentRecord.length) {
		await db
			.insert(notifications)
			.values({
				id: `notif-${crypto.randomUUID()}`,
				userId: studentRecord[0].userId,
				title: finalStatus === "returned" ? "Worksheet Returned for Revision" : "Grades Released!",
				message: `Your worksheet submission was evaluated: ${finalTotal}/${maxScore} marks (${percentage}%).`,
				type: "homework",
				link: "/portal/assignments",
			})
			.catch(() => {});
	}

	return c.json({
		message: `Grades successfully released to student (${finalTotal}/${maxScore})!`,
		totalScore: finalTotal,
		percentage,
		status: finalStatus,
	});
});

import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	aiTutorConversations,
	aiTutorMessages,
	aiUsageRecords,
	students,
	subjects,
	classes,
	teacherAssignments,
	studentEnrollments,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { callGroqChat, ChatMessage } from "../ai/groq";
import {
	getStudentAcademicProfile,
	getAiConfiguration,
	checkStudentUsageLimits,
	buildTutorSystemPrompt,
	StudentAcademicContext,
} from "../ai/service";

const aiTutorRouter = new Hono<{ Bindings: Bindings }>();

// 1. Get authenticated student's authoritative academic profile
aiTutorRouter.get("/profile", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user.role === "student_parent") {
		if (!user.studentId) {
			return c.json({ error: "No student profile associated with this account" }, 404);
		}
		const profile = await getStudentAcademicProfile(db, user.studentId);
		if (!profile) {
			return c.json({ error: "Academic profile not found in database" }, 404);
		}
		return c.json({ profile });
	}

	// For Teachers and Admins, return institute grade and subject directory
	const allClasses = await db.select().from(classes);
	const allSubjects = await db.select().from(subjects);

	return c.json({
		profile: {
			studentId: "faculty-or-admin-preview",
			fullName: user.fullName,
			className: "Faculty Academic Console",
			classCode: "ADMIN",
			batchName: "All Batches",
			board: "CBSE",
			boards: ["CBSE", "ICSE", "NIOS"],
			enrolledSubjects: allSubjects,
			availableClasses: allClasses,
		},
	});
});

// 2. Chat with AI Tutor
const chatSchema = z.object({
	conversationId: z.string().optional(),
	question: z.string().min(1, "Question cannot be empty"),
	subjectId: z.string().optional(),
	topic: z.string().optional(),
	imageUrl: z.string().optional(),
	gradeId: z.string().optional(), // Allowed only for teachers/admins previewing different grades
	board: z.enum(["CBSE", "ICSE", "NIOS", "State"]).optional(),
});

aiTutorRouter.post("/chat", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);
	const config = await getAiConfiguration(db);

	if (!config.isTutorEnabled) {
		return c.json({ error: "AI Tutor is currently disabled by institute administration." }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = chatSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request payload", details: parsed.error.format() }, 400);
	}

	const { question, subjectId, topic, imageUrl, board } = parsed.data;

	if (question.length > config.maxRequestLength) {
		return c.json({
			error: `Question exceeds the maximum allowed length of ${config.maxRequestLength} characters.`,
		}, 400);
	}

	// Authoritative student profile check: never trust client-supplied grade for students!
	let academicProfile: StudentAcademicContext;
	let targetStudentId: string;

	if (user.role === "student_parent") {
		if (!user.studentId) {
			return c.json({ error: "No student ID linked to your session" }, 403);
		}
		targetStudentId = user.studentId;
		const retrievedProfile = await getStudentAcademicProfile(db, user.studentId);
		if (!retrievedProfile) {
			return c.json({ error: "Student academic record could not be verified in the database." }, 403);
		}
		academicProfile = retrievedProfile;

		// Check rate limits
		const limitCheck = await checkStudentUsageLimits(db, targetStudentId, academicProfile.classCode, config);
		if (!limitCheck.allowed) {
			// Record rate-limit event
			await db.insert(aiUsageRecords).values({
				id: `usage-${crypto.randomUUID()}`,
				userId: user.userId,
				role: user.role,
				studentId: targetStudentId,
				actionType: "tutor_chat",
				model: config.defaultModel,
				status: "rate_limited",
				errorMessage: limitCheck.reason,
			});
			return c.json({ error: limitCheck.reason }, 429);
		}
	} else {
		// Admin / Teacher: preview mode
		targetStudentId = `preview-${user.userId}`;
		let previewClass = { id: "cls-preview", name: "Grade 10", code: "G10" };
		if (parsed.data.gradeId) {
			const foundClass = await db.select().from(classes).where(eq(classes.id, parsed.data.gradeId)).limit(1);
			if (foundClass.length) {
				previewClass = foundClass[0];
			}
		}
		academicProfile = {
			studentId: targetStudentId,
			userId: user.userId || user.id || "preview-user",
			fullName: `${user.fullName} (Educator Preview)`,
			admissionNumber: "FACULTY",
			classId: previewClass.id,
			className: previewClass.name,
			classCode: previewClass.code,
			batchId: "batch-preview",
			batchName: "Educator Test Bed",
			board: board || "CBSE",
			enrolledSubjects: await db.select().from(subjects),
		};
	}

	// Validate subject if allowedSubjects is restricted
	let subjectName = "General Academic";
	if (subjectId) {
		const sub = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
		if (sub.length) {
			subjectName = sub[0].name;
			if (config.allowedSubjects.length > 0 && !config.allowedSubjects.includes(sub[0].code)) {
				return c.json({ error: `Subject ${subjectName} is not currently enabled for AI tutoring.` }, 403);
			}
		}
	}

	// Get or create conversation
	let conversationId = parsed.data.conversationId;
	if (!conversationId) {
		conversationId = `conv-${crypto.randomUUID()}`;
		const firstTitle = question.slice(0, 50).trim() + (question.length > 50 ? "..." : "");
		await db.insert(aiTutorConversations).values({
			id: conversationId,
			studentId: user.studentId || targetStudentId,
			subjectId: subjectId || null,
			gradeId: academicProfile.classId,
			topic: topic || null,
			title: firstTitle,
			status: "active",
		});
	} else {
		// Verify ownership of existing conversation
		const existingConv = await db
			.select()
			.from(aiTutorConversations)
			.where(eq(aiTutorConversations.id, conversationId))
			.limit(1);

		if (!existingConv.length) {
			return c.json({ error: "Conversation not found" }, 404);
		}
		if (user.role === "student_parent" && existingConv[0].studentId !== user.studentId) {
			return c.json({ error: "Forbidden: You do not own this conversation" }, 403);
		}
	}

	// Fetch recent conversation history (last 8 messages for context)
	const historyMessages = await db
		.select()
		.from(aiTutorMessages)
		.where(eq(aiTutorMessages.conversationId, conversationId))
		.orderBy(desc(aiTutorMessages.createdAt))
		.limit(8);

	const chronologicalHistory = historyMessages.reverse();

	// Build messages payload for Groq
	const systemPrompt = buildTutorSystemPrompt(academicProfile, subjectName, topic, config, board);
	const groqMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

	for (const msg of chronologicalHistory) {
		groqMessages.push({
			role: msg.role as "user" | "assistant",
			content: msg.content,
		});
	}

	let userContent = question;
	if (imageUrl) {
		userContent += `\n[Student Attached Question Image Reference: ${imageUrl}]`;
	}
	groqMessages.push({ role: "user", content: userContent });

	// Call Groq API
	const groqApiKey = c.env.GROQ_API_KEY;
	try {
		const aiResult = await callGroqChat({
			apiKey: groqApiKey,
			model: config.defaultModel,
			messages: groqMessages,
			temperature: 0.2,
			max_tokens: 2800,
		});

		// Save user message to database
		const userMsgId = `msg-${crypto.randomUUID()}`;
		await db.insert(aiTutorMessages).values({
			id: userMsgId,
			conversationId,
			role: "user",
			content: question,
			imageUrl: imageUrl || null,
		});

		// Save assistant message to database
		const assistantMsgId = `msg-${crypto.randomUUID()}`;
		await db.insert(aiTutorMessages).values({
			id: assistantMsgId,
			conversationId,
			role: "assistant",
			content: aiResult.content,
			tokensUsed: aiResult.usage.totalTokens,
			responseTimeMs: aiResult.durationMs,
		});

		// Update conversation updated_at
		await db
			.update(aiTutorConversations)
			.set({ updatedAt: sql`(unixepoch())` })
			.where(eq(aiTutorConversations.id, conversationId));

		// Record AI usage and estimated cost
		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: user.userId,
			role: user.role,
			studentId: user.studentId || null,
			actionType: "tutor_chat",
			model: aiResult.model,
			promptTokens: aiResult.usage.promptTokens,
			completionTokens: aiResult.usage.completionTokens,
			totalTokens: aiResult.usage.totalTokens,
			estimatedCostInUsd: aiResult.estimatedCostUsd,
			status: "success",
		});

		return c.json({
			conversationId,
			messageId: assistantMsgId,
			response: aiResult.content,
			model: aiResult.model,
			tokensUsed: aiResult.usage.totalTokens,
			durationMs: aiResult.durationMs,
			academicContext: {
				grade: academicProfile.className,
				subject: subjectName,
			},
		});
	} catch (error: any) {
		// Log failed usage record
		await db.insert(aiUsageRecords).values({
			id: `usage-${crypto.randomUUID()}`,
			userId: user.userId,
			role: user.role,
			studentId: user.studentId || null,
			actionType: "tutor_chat",
			model: config.defaultModel,
			status: "failed",
			errorMessage: error?.message || "Unknown error calling Groq AI",
		});

		return c.json({
			error: error?.message || "Failed to generate answer from AI Tutor",
		}, 500);
	}
});

// 3. List Conversations with role-based privacy
aiTutorRouter.get("/conversations", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	if (user.role === "student_parent") {
		if (!user.studentId) return c.json({ conversations: [] });

		const convs = await db
			.select({
				id: aiTutorConversations.id,
				title: aiTutorConversations.title,
				subjectId: aiTutorConversations.subjectId,
				topic: aiTutorConversations.topic,
				status: aiTutorConversations.status,
				createdAt: aiTutorConversations.createdAt,
				updatedAt: aiTutorConversations.updatedAt,
			})
			.from(aiTutorConversations)
			.where(eq(aiTutorConversations.studentId, user.studentId))
			.orderBy(desc(aiTutorConversations.updatedAt))
			.limit(50);

		return c.json({ conversations: convs });
	}

	if (user.role === "teacher") {
		if (!user.teacherId) return c.json({ conversations: [] });

		// Privacy boundary: Teachers only see conversations for students in their assigned batches!
		const teacherBatches = await db
			.select({ batchId: teacherAssignments.batchId })
			.from(teacherAssignments)
			.where(eq(teacherAssignments.teacherId, user.teacherId));

		const batchIds = teacherBatches.map((b) => b.batchId);
		if (!batchIds.length) return c.json({ conversations: [] });

		const enrolledStudents = await db
			.select({ studentId: studentEnrollments.studentId })
			.from(studentEnrollments)
			.where(inArray(studentEnrollments.batchId, batchIds));

		const studentIds = enrolledStudents.map((s) => s.studentId);
		if (!studentIds.length) return c.json({ conversations: [] });

		const convs = await db
			.select({
				id: aiTutorConversations.id,
				studentId: aiTutorConversations.studentId,
				title: aiTutorConversations.title,
				subjectId: aiTutorConversations.subjectId,
				topic: aiTutorConversations.topic,
				createdAt: aiTutorConversations.createdAt,
				updatedAt: aiTutorConversations.updatedAt,
			})
			.from(aiTutorConversations)
			.where(inArray(aiTutorConversations.studentId, studentIds))
			.orderBy(desc(aiTutorConversations.updatedAt))
			.limit(50);

		return c.json({ conversations: convs });
	}

	// Admin: Full institute view
	const convs = await db
		.select({
			id: aiTutorConversations.id,
			studentId: aiTutorConversations.studentId,
			title: aiTutorConversations.title,
			subjectId: aiTutorConversations.subjectId,
			topic: aiTutorConversations.topic,
			status: aiTutorConversations.status,
			createdAt: aiTutorConversations.createdAt,
			updatedAt: aiTutorConversations.updatedAt,
		})
		.from(aiTutorConversations)
		.orderBy(desc(aiTutorConversations.updatedAt))
		.limit(100);

	return c.json({ conversations: convs });
});

// 4. Get specific conversation history with messages
aiTutorRouter.get("/conversations/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const conversationId = c.req.param("id");
	const db = createDb(c.env.DB);

	const conv = await db
		.select()
		.from(aiTutorConversations)
		.where(eq(aiTutorConversations.id, conversationId))
		.limit(1);

	if (!conv.length) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Privacy check
	if (user.role === "student_parent" && conv[0].studentId !== user.studentId) {
		return c.json({ error: "Forbidden: You do not have permission to view this conversation" }, 403);
	}

	const messages = await db
		.select()
		.from(aiTutorMessages)
		.where(eq(aiTutorMessages.conversationId, conversationId))
		.orderBy(aiTutorMessages.createdAt);

	return c.json({
		conversation: conv[0],
		messages,
	});
});

// 5. Delete conversation
aiTutorRouter.delete("/conversations/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const conversationId = c.req.param("id");
	const db = createDb(c.env.DB);

	const conv = await db
		.select()
		.from(aiTutorConversations)
		.where(eq(aiTutorConversations.id, conversationId))
		.limit(1);

	if (!conv.length) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (user.role === "student_parent" && conv[0].studentId !== user.studentId) {
		return c.json({ error: "Forbidden: You do not own this conversation" }, 403);
	}

	await db.delete(aiTutorConversations).where(eq(aiTutorConversations.id, conversationId));
	return c.json({ message: "Conversation deleted successfully" });
});

// 6. Upvote / downvote helpfulness on message
aiTutorRouter.post("/messages/:id/feedback", requireAuth, async (c) => {
	const messageId = c.req.param("id");
	const { isHelpful } = await c.req.json().catch(() => ({}));
	const db = createDb(c.env.DB);

	await db
		.update(aiTutorMessages)
		.set({ isHelpful: isHelpful ? 1 : 0 })
		.where(eq(aiTutorMessages.id, messageId));

	return c.json({ message: "Feedback recorded" });
});

export default aiTutorRouter;

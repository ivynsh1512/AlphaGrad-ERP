import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	aiConfigurations,
	aiUsageRecords,
	aiTutorConversations,
	aiTutorMessages,
	worksheets,
	worksheetAssignments,
	worksheetSubmissions,
	tests,
	testAttempts,
	students,
	users,
	classes,
	subjects,
	institutes,
} from "../db/schema";
import { requireAdmin } from "../middleware/auth";
import { getAiConfiguration } from "../ai/service";

export const aiAdminRouter = new Hono<{ Bindings: Bindings }>();

// All endpoints in this router require institute administrator privileges!
aiAdminRouter.use("*", requireAdmin);

// 1. Get AI Configuration
aiAdminRouter.get("/config", async (c) => {
	const db = createDb(c.env.DB);
	const config = await getAiConfiguration(db);
	const allSubjects = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects);
	const allClasses = await db.select({ id: classes.id, name: classes.name, code: classes.code }).from(classes);

	return c.json({
		config,
		directory: {
			subjects: allSubjects,
			classes: allClasses,
			availableModels: [
				{ id: "openai/gpt-oss-120b", name: "OpenAI GPT-OSS 120B (Groq Production Engine)" },
			],
		},
	});
});

// 2. Update AI Configuration
const updateConfigSchema = z.object({
	isTutorEnabled: z.boolean().optional(),
	isWorksheetGenEnabled: z.boolean().optional(),
	isTestGenEnabled: z.boolean().optional(),
	defaultModel: z.string().optional(),
	allowedModels: z.array(z.string()).optional(),
	maxRequestLength: z.number().min(500).max(12000).optional(),
	dailyLimitPerStudent: z.number().min(1).max(200).optional(),
	dailyLimitPerGrade: z.number().min(10).max(5000).optional(),
	allowedSubjects: z.array(z.string()).optional(),
	teachingStyle: z.string().optional(),
	difficultyDefaults: z.string().optional(),
	gradeGuidelines: z.record(z.string(), z.string()).optional(),
	systemPromptExtra: z.string().optional(),
});

aiAdminRouter.put("/config", async (c) => {
	const db = createDb(c.env.DB);
	const body = await c.req.json().catch(() => null);
	const parsed = updateConfigSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid configuration values", details: parsed.error.format() }, 400);
	}

	const existing = await db.select().from(aiConfigurations).limit(1);
	const d = parsed.data;

	const payload: any = {
		updatedAt: sql`(unixepoch())`,
	};

	if (d.isTutorEnabled !== undefined) payload.isTutorEnabled = d.isTutorEnabled ? 1 : 0;
	if (d.isWorksheetGenEnabled !== undefined) payload.isWorksheetGenEnabled = d.isWorksheetGenEnabled ? 1 : 0;
	if (d.isTestGenEnabled !== undefined) payload.isTestGenEnabled = d.isTestGenEnabled ? 1 : 0;
	if (d.defaultModel !== undefined) payload.defaultModel = d.defaultModel;
	if (d.allowedModels !== undefined) payload.allowedModels = JSON.stringify(d.allowedModels);
	if (d.maxRequestLength !== undefined) payload.maxRequestLength = d.maxRequestLength;
	if (d.dailyLimitPerStudent !== undefined) payload.dailyLimitPerStudent = d.dailyLimitPerStudent;
	if (d.dailyLimitPerGrade !== undefined) payload.dailyLimitPerGrade = d.dailyLimitPerGrade;
	if (d.allowedSubjects !== undefined) payload.allowedSubjects = JSON.stringify(d.allowedSubjects);
	if (d.teachingStyle !== undefined) payload.teachingStyle = d.teachingStyle;
	if (d.difficultyDefaults !== undefined) payload.difficultyDefaults = d.difficultyDefaults;
	if (d.gradeGuidelines !== undefined) payload.gradeGuidelines = JSON.stringify(d.gradeGuidelines);
	if (d.systemPromptExtra !== undefined) payload.systemPromptExtra = d.systemPromptExtra;

	if (existing.length > 0) {
		await db.update(aiConfigurations).set(payload).where(eq(aiConfigurations.id, existing[0].id));
	} else {
		payload.id = `ai-config-${crypto.randomUUID()}`;
		payload.instituteId = "proventus-academy";
		await db.insert(aiConfigurations).values(payload);
	}

	return c.json({ message: "AI configuration saved successfully." });
});

// 3. AI Usage Analytics & Cost Monitoring
aiAdminRouter.get("/reports/usage", async (c) => {
	const db = createDb(c.env.DB);
	const days = Number(c.req.query("days") || 30);
	const sinceTimestamp = Math.floor(Date.now() / 1000) - days * 86400;

	// Total usage records
	const records = await db
		.select()
		.from(aiUsageRecords)
		.where(gte(aiUsageRecords.createdAt, sinceTimestamp))
		.orderBy(desc(aiUsageRecords.createdAt))
		.limit(100);

	// Aggregated metrics
	const totalTokensResult = await db
		.select({
			totalTokens: sql<number>`sum(${aiUsageRecords.totalTokens})`,
			totalCost: sql<number>`sum(${aiUsageRecords.estimatedCostInUsd})`,
			totalRequests: sql<number>`count(*)`,
			successfulRequests: sql<number>`sum(case when ${aiUsageRecords.status} = 'success' then 1 else 0 end)`,
			failedRequests: sql<number>`sum(case when ${aiUsageRecords.status} = 'failed' then 1 else 0 end)`,
			rateLimitedRequests: sql<number>`sum(case when ${aiUsageRecords.status} = 'rate_limited' then 1 else 0 end)`,
		})
		.from(aiUsageRecords)
		.where(gte(aiUsageRecords.createdAt, sinceTimestamp));

	// Breakdown by actionType
	const actionBreakdown = await db
		.select({
			actionType: aiUsageRecords.actionType,
			count: sql<number>`count(*)`,
			tokens: sql<number>`sum(${aiUsageRecords.totalTokens})`,
			cost: sql<number>`sum(${aiUsageRecords.estimatedCostInUsd})`,
		})
		.from(aiUsageRecords)
		.where(gte(aiUsageRecords.createdAt, sinceTimestamp))
		.groupBy(aiUsageRecords.actionType);

	// Breakdown by model
	const modelBreakdown = await db
		.select({
			model: aiUsageRecords.model,
			count: sql<number>`count(*)`,
			tokens: sql<number>`sum(${aiUsageRecords.totalTokens})`,
			cost: sql<number>`sum(${aiUsageRecords.estimatedCostInUsd})`,
		})
		.from(aiUsageRecords)
		.where(gte(aiUsageRecords.createdAt, sinceTimestamp))
		.groupBy(aiUsageRecords.model);

	const summary = totalTokensResult[0] || {};

	return c.json({
		summary: {
			totalRequests: Number(summary.totalRequests || 0),
			successfulRequests: Number(summary.successfulRequests || 0),
			failedRequests: Number(summary.failedRequests || 0),
			rateLimitedRequests: Number(summary.rateLimitedRequests || 0),
			totalTokens: Number(summary.totalTokens || 0),
			totalEstimatedCostUsd: Number(summary.totalCost || 0),
		},
		actionBreakdown,
		modelBreakdown,
		recentLogs: records,
	});
});

// 4. Central Academic & Assessment Reports
aiAdminRouter.get("/reports/academic", async (c) => {
	const db = createDb(c.env.DB);

	// Total worksheets created
	const totalWorksheets = await db.select({ count: sql<number>`count(*)` }).from(worksheets);

	// Total assignments distributed
	const totalAssignments = await db.select({ count: sql<number>`count(*)` }).from(worksheetAssignments);

	// Total submissions and completion rate
	const submissionsStats = await db
		.select({
			totalSubmissions: sql<number>`count(*)`,
			gradedSubmissions: sql<number>`sum(case when ${worksheetSubmissions.status} = 'graded' then 1 else 0 end)`,
			avgScore: sql<number>`avg(${worksheetSubmissions.percentage})`,
		})
		.from(worksheetSubmissions);

	// Total test attempts and pass rate
	const testStats = await db
		.select({
			totalAttempts: sql<number>`count(*)`,
			passedAttempts: sql<number>`sum(case when ${testAttempts.isPassed} = 1 then 1 else 0 end)`,
			avgScore: sql<number>`avg(${testAttempts.percentage})`,
		})
		.from(testAttempts)
		.where(eq(testAttempts.status, "submitted"));

	// Recent conversations monitored
	const conversations = await db
		.select({
			id: aiTutorConversations.id,
			title: aiTutorConversations.title,
			topic: aiTutorConversations.topic,
			studentName: users.fullName,
			admissionNumber: students.admissionNumber,
			createdAt: aiTutorConversations.createdAt,
		})
		.from(aiTutorConversations)
		.innerJoin(students, eq(aiTutorConversations.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.orderBy(desc(aiTutorConversations.createdAt))
		.limit(20);

	return c.json({
		worksheetsCount: Number(totalWorksheets[0]?.count || 0),
		assignmentsCount: Number(totalAssignments[0]?.count || 0),
		submissions: {
			total: Number(submissionsStats[0]?.totalSubmissions || 0),
			graded: Number(submissionsStats[0]?.gradedSubmissions || 0),
			avgPercentage: Math.round(Number(submissionsStats[0]?.avgScore || 0) * 10) / 10,
		},
		tests: {
			totalAttempts: Number(testStats[0]?.totalAttempts || 0),
			passedAttempts: Number(testStats[0]?.passedAttempts || 0),
			avgPercentage: Math.round(Number(testStats[0]?.avgScore || 0) * 10) / 10,
		},
		recentConversations: conversations,
	});
});

import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, lte, gte } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { campaigns, users } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const campaignsRouter = new Hono<{ Bindings: Bindings }>();

const DEFAULT_FALLBACK_CAMPAIGN = {
	id: "camp-default-regular",
	title: "Continuous Academic Excellence",
	campaignType: "regular",
	headline: "Elevate Your Academic Potential with Proventus Academy",
	subheadline: "Dedicated NIOS Open Schooling & Foundation Coaching in Kothanur, Bangalore",
	description:
		"Empowering students across Grades 1–12 and NIOS 10th with personalized 15-student cohorts, 24/7 AI Doubt Solving, rigorous worksheets, and structured exam test series.",
	ctaText: "Explore Courses & Portal",
	ctaUrl: "/contact",
	secondaryCtaText: "Meet Proventus AI Tutor",
	secondaryCtaUrl: "/portal/ai-tutor",
	badgeText: "Academic Year 2026–2027",
	bannerImageUrl: "/logo.png",
	targetAudience: "all",
	targetGrades: "[]",
	startDate: "2026-01-01",
	endDate: "2027-12-31",
	priority: 0,
	isActive: 1,
	isDefault: 1,
	seoTitle: "Proventus Academy — Premier NIOS Admissions & CBSE ICSE Coaching Bangalore",
	seoDescription:
		"Proventus Academy (Kothanur, Bangalore) provides premier NIOS Open Schooling, CBSE/ICSE Foundation Coaching, and 24/7 AI-powered tutoring.",
	seoKeywords: JSON.stringify(["Proventus Academy", "NIOS Bangalore", "Coaching Kothanur", "AI Tutor Bangalore"]),
};

// 1. Public / Client: Get Authoritatively Active Seasonal Campaign
campaignsRouter.get("/active", async (c) => {
	const db = createDb(c.env.DB);
	const todayStr = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
	const audience = c.req.query("audience"); // optional filter

	try {
		// Find active campaigns where startDate <= today <= endDate, sorted by priority DESC
		const activeList = await db
			.select()
			.from(campaigns)
			.where(
				and(
					eq(campaigns.isActive, 1),
					lte(campaigns.startDate, todayStr),
					gte(campaigns.endDate, todayStr)
				)
			)
			.orderBy(desc(campaigns.priority))
			.limit(5);

		if (activeList.length > 0) {
			const active = activeList[0];
			let targetGrades = [];
			let seoKeywords = [];
			try {
				targetGrades = JSON.parse(active.targetGrades || "[]");
			} catch {}
			try {
				seoKeywords = JSON.parse(active.seoKeywords || "[]");
			} catch {}

			return c.json({
				campaign: {
					...active,
					targetGrades,
					seoKeywords,
					isFallback: false,
				},
			});
		}

		// Look for configured default campaign
		const defaultCamp = await db
			.select()
			.from(campaigns)
			.where(and(eq(campaigns.isActive, 1), eq(campaigns.isDefault, 1)))
			.limit(1);

		if (defaultCamp.length > 0) {
			return c.json({
				campaign: {
					...defaultCamp[0],
					targetGrades: JSON.parse(defaultCamp[0].targetGrades || "[]"),
					seoKeywords: JSON.parse(defaultCamp[0].seoKeywords || "[]"),
					isFallback: true,
				},
			});
		}

		// Return default regular academic season
		return c.json({
			campaign: {
				...DEFAULT_FALLBACK_CAMPAIGN,
				targetGrades: [],
				seoKeywords: JSON.parse(DEFAULT_FALLBACK_CAMPAIGN.seoKeywords),
				isFallback: true,
			},
		});
	} catch (error: any) {
		return c.json({
			campaign: {
				...DEFAULT_FALLBACK_CAMPAIGN,
				targetGrades: [],
				seoKeywords: JSON.parse(DEFAULT_FALLBACK_CAMPAIGN.seoKeywords),
				isFallback: true,
			},
		});
	}
});

// 2. Admin: List All Campaigns
campaignsRouter.get("/", requireAdmin, async (c) => {
	const db = createDb(c.env.DB);
	const list = await db.select().from(campaigns).orderBy(desc(campaigns.priority), desc(campaigns.createdAt));

	const enriched = list.map((camp) => {
		let targetGrades = [];
		let seoKeywords = [];
		try {
			targetGrades = JSON.parse(camp.targetGrades || "[]");
		} catch {}
		try {
			seoKeywords = JSON.parse(camp.seoKeywords || "[]");
		} catch {}

		return {
			...camp,
			targetGrades,
			seoKeywords,
		};
	});

	return c.json({ campaigns: enriched });
});

// 3. Admin: Create Campaign
const campaignSchema = z.object({
	title: z.string().min(1, "Campaign title is required"),
	campaignType: z.enum(["admission", "examination", "regular"]),
	headline: z.string().min(1, "Headline is required"),
	subheadline: z.string().optional(),
	description: z.string().optional(),
	ctaText: z.string().default("Enroll Today"),
	ctaUrl: z.string().default("/contact"),
	secondaryCtaText: z.string().optional(),
	secondaryCtaUrl: z.string().optional(),
	badgeText: z.string().optional(),
	bannerImageUrl: z.string().optional(),
	targetAudience: z.enum(["all", "students", "prospective_parents", "grade_specific"]).default("all"),
	targetGrades: z.array(z.string()).default([]),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
	priority: z.number().default(10),
	isActive: z.boolean().default(true),
	isDefault: z.boolean().default(false),
	seoTitle: z.string().optional(),
	seoDescription: z.string().optional(),
	seoKeywords: z.array(z.string()).default([]),
});

campaignsRouter.post("/", requireAdmin, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	const body = await c.req.json().catch(() => null);
	const parsed = campaignSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid campaign parameters", details: parsed.error.format() }, 400);
	}

	const data = parsed.data;
	const id = `camp-${crypto.randomUUID()}`;

	// If marked default, unset previous default
	if (data.isDefault) {
		await db.update(campaigns).set({ isDefault: 0 });
	}

	await db.insert(campaigns).values({
		id,
		title: data.title,
		campaignType: data.campaignType,
		headline: data.headline,
		subheadline: data.subheadline || null,
		description: data.description || null,
		ctaText: data.ctaText,
		ctaUrl: data.ctaUrl,
		secondaryCtaText: data.secondaryCtaText || null,
		secondaryCtaUrl: data.secondaryCtaUrl || null,
		badgeText: data.badgeText || null,
		bannerImageUrl: data.bannerImageUrl || null,
		targetAudience: data.targetAudience,
		targetGrades: JSON.stringify(data.targetGrades),
		startDate: data.startDate,
		endDate: data.endDate,
		priority: data.priority,
		isActive: data.isActive ? 1 : 0,
		isDefault: data.isDefault ? 1 : 0,
		seoTitle: data.seoTitle || null,
		seoDescription: data.seoDescription || null,
		seoKeywords: JSON.stringify(data.seoKeywords),
		createdByUserId: user.userId,
	});

	return c.json({ message: "Campaign created successfully", campaignId: id });
});

// 4. Admin: Update Campaign
campaignsRouter.put("/:id", requireAdmin, async (c) => {
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	const existing = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
	if (!existing.length) return c.json({ error: "Campaign not found" }, 404);

	const body = await c.req.json().catch(() => ({}));

	if (body.isDefault) {
		await db.update(campaigns).set({ isDefault: 0 });
	}

	const updatePayload: any = {};
	if (body.title !== undefined) updatePayload.title = body.title;
	if (body.campaignType !== undefined) updatePayload.campaignType = body.campaignType;
	if (body.headline !== undefined) updatePayload.headline = body.headline;
	if (body.subheadline !== undefined) updatePayload.subheadline = body.subheadline;
	if (body.description !== undefined) updatePayload.description = body.description;
	if (body.ctaText !== undefined) updatePayload.ctaText = body.ctaText;
	if (body.ctaUrl !== undefined) updatePayload.ctaUrl = body.ctaUrl;
	if (body.secondaryCtaText !== undefined) updatePayload.secondaryCtaText = body.secondaryCtaText;
	if (body.secondaryCtaUrl !== undefined) updatePayload.secondaryCtaUrl = body.secondaryCtaUrl;
	if (body.badgeText !== undefined) updatePayload.badgeText = body.badgeText;
	if (body.bannerImageUrl !== undefined) updatePayload.bannerImageUrl = body.bannerImageUrl;
	if (body.targetAudience !== undefined) updatePayload.targetAudience = body.targetAudience;
	if (body.targetGrades !== undefined) updatePayload.targetGrades = JSON.stringify(body.targetGrades);
	if (body.startDate !== undefined) updatePayload.startDate = body.startDate;
	if (body.endDate !== undefined) updatePayload.endDate = body.endDate;
	if (body.priority !== undefined) updatePayload.priority = body.priority;
	if (body.isActive !== undefined) updatePayload.isActive = body.isActive ? 1 : 0;
	if (body.isDefault !== undefined) updatePayload.isDefault = body.isDefault ? 1 : 0;
	if (body.seoTitle !== undefined) updatePayload.seoTitle = body.seoTitle;
	if (body.seoDescription !== undefined) updatePayload.seoDescription = body.seoDescription;
	if (body.seoKeywords !== undefined) updatePayload.seoKeywords = JSON.stringify(body.seoKeywords);
	updatePayload.updatedAt = sql`(unixepoch())`;

	await db.update(campaigns).set(updatePayload).where(eq(campaigns.id, id));

	return c.json({ message: "Campaign updated successfully" });
});

// 5. Admin: Delete Campaign
campaignsRouter.delete("/:id", requireAdmin, async (c) => {
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	await db.delete(campaigns).where(eq(campaigns.id, id));
	return c.json({ message: "Campaign deleted successfully" });
});

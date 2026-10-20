import { Hono } from "hono";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { schools, schoolSettings } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const settingsRouter = new Hono<{ Bindings: Bindings }>();

settingsRouter.get("/", requireAuth, async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const schoolId = user.schoolId || c.get("schoolId");

	const schoolQuery = schoolId
		? await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1)
		: await db.select().from(schools).limit(1);

	const targetSchoolId = schoolQuery[0]?.id;
	const settingsQuery = targetSchoolId
		? await db.select().from(schoolSettings).where(eq(schoolSettings.schoolId, targetSchoolId)).limit(1)
		: [];

	return c.json({
		institute: schoolQuery[0] || null,
		school: schoolQuery[0] || null,
		settings: settingsQuery[0] || null,
	});
});

settingsRouter.get("/ping", requireAuth, async (c) => {
	const db = createDb(c.env.DB);
	const start = Date.now();
	await db.select().from(schools).limit(1);
	const latencyMs = Date.now() - start;

	return c.json({
		status: "connected",
		latencyMs,
		edgeRegion: "Cloudflare D1 APAC (Multi-Tenant)",
		timestamp: new Date().toISOString(),
	});
});

const updateSettingsSchema = z.object({
	instituteName: z.string().min(2).optional(),
	address: z.string().optional(),
	contactEmail: z.string().email().optional(),
	contactPhone: z.string().optional(),
	feeReminderDays: z.number().int().min(1).max(30).optional(),
	allowStudentComplaints: z.boolean().optional(),
	usernamePrefix: z.string().min(2).max(10).optional(),
	academicYearStartMonth: z.number().int().min(1).max(12).optional(),
});

settingsRouter.put("/", requireAuth, requireAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = updateSettingsSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed" }, 400);
	}

	const data = parsed.data;
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const schoolId = user.schoolId || c.get("schoolId");

	if (!schoolId) {
		return c.json({ error: "School context missing" }, 400);
	}

	if (data.instituteName || data.address || data.contactEmail || data.contactPhone) {
		await db
			.update(schools)
			.set({
				name: data.instituteName,
				address: data.address,
				contactEmail: data.contactEmail,
				contactPhone: data.contactPhone,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(schools.id, schoolId));
	}

	if (
		data.feeReminderDays !== undefined ||
		data.allowStudentComplaints !== undefined ||
		data.usernamePrefix !== undefined ||
		data.academicYearStartMonth !== undefined
	) {
		const updateValues: Record<string, any> = {
			updatedAt: sql`(unixepoch())`,
		};
		if (data.feeReminderDays !== undefined) updateValues.feeReminderDays = data.feeReminderDays;
		if (data.allowStudentComplaints !== undefined) updateValues.allowStudentComplaints = data.allowStudentComplaints ? 1 : 0;
		if (data.usernamePrefix !== undefined) updateValues.usernamePrefix = data.usernamePrefix;
		if (data.academicYearStartMonth !== undefined) updateValues.academicYearStartMonth = data.academicYearStartMonth;

		await db
			.update(schoolSettings)
			.set(updateValues)
			.where(eq(schoolSettings.schoolId, schoolId));
	}

	return c.json({ message: "Settings updated successfully" });
});

export default settingsRouter;

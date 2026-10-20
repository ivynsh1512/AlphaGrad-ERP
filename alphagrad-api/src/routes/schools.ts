import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { schools, schoolFeatures } from "../db/schema";

export const schoolsRouter = new Hono<{ Bindings: Bindings }>();

// Public school directory search endpoint (for homepage portal finder)
schoolsRouter.get("/search", async (c) => {
	const q = (c.req.query("q") || "").toLowerCase().trim();
	const db = createDb(c.env.DB);

	const all = await db
		.select({
			id: schools.id,
			code: schools.code,
			name: schools.name,
			brand: schools.brand,
			city: schools.city,
			state: schools.state,
			logoUrl: schools.logoUrl,
			themePrimary: schools.themePrimary,
		})
		.from(schools)
		.where(eq(schools.status, "active"))
		.limit(20);

	const filtered = q
		? all.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.code.toLowerCase().includes(q) ||
					(s.city && s.city.toLowerCase().includes(q))
		  )
		: all;

	return c.json({ schools: filtered });
});

// Public school config endpoint (for login page branding & feature discovery)
schoolsRouter.get("/:code/public", async (c) => {
	const code = c.req.param("code").toLowerCase().trim();
	const db = createDb(c.env.DB);

	const schoolResult = await db
		.select({
			id: schools.id,
			code: schools.code,
			name: schools.name,
			brand: schools.brand,
			tagline: schools.tagline,
			logoUrl: schools.logoUrl,
			themePrimary: schools.themePrimary,
			city: schools.city,
			state: schools.state,
			status: schools.status,
		})
		.from(schools)
		.where(eq(schools.code, code))
		.limit(1);

	const school = schoolResult[0];
	if (!school) {
		return c.json({ error: "School not found" }, 404);
	}

	const featResult = await db
		.select()
		.from(schoolFeatures)
		.where(eq(schoolFeatures.schoolId, school.id))
		.limit(1);

	const feat = featResult[0] || {
		academic: 1,
		students: 1,
		teachers: 1,
		attendance: 1,
		timetable: 1,
		homework: 1,
		remarks: 1,
		assessments: 1,
		syllabus: 1,
		tasks: 1,
		notices: 1,
		complaints: 1,
		fees: 1,
		calendar: 1,
		accounting: 1,
		campaigns: 1,
		aiTutor: 1,
		worksheets: 1,
		tests: 1,
		aiAdmin: 1,
	};

	return c.json({
		school,
		features: feat,
	});
});

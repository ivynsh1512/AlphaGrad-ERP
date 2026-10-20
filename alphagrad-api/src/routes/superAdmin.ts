import { Hono } from "hono";
import { z } from "zod";
import { eq, sql, desc, count } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	superAdmins,
	schools,
	schoolFeatures,
	schoolSettings,
	users,
	roles,
	academicSessions,
	students,
	teachers,
	auditLogs
} from "../db/schema";
import { signJwt } from "../auth/jwt";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { requireSuperAdmin } from "../middleware/auth";

export const superAdminRouter = new Hono<{ Bindings: Bindings }>();

// 1. Super Admin Login
const superLoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

superAdminRouter.post("/auth/login", async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = superLoginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request payload", details: parsed.error.issues }, 400);
	}

	const { email, password } = parsed.data;
	const cleanEmail = email.toLowerCase().trim();
	const db = createDb(c.env.DB);

	// Cloudflare Secrets: Primary authoritative check
	const envEmail = (c.env.SUPER_ADMIN_EMAIL || "superadmin@alphagrad.in").toLowerCase().trim();
	const envSecretPassword = c.env.SUPER_ADMIN_PASSWORD;

	let authenticated = false;

	// 1. Authoritative check via Cloudflare Secret
	if (envSecretPassword && cleanEmail === envEmail && password === envSecretPassword) {
		authenticated = true;
	}

	// 2. Fallback check via Database Hash (if provisioned)
	const adminRecords = await db
		.select()
		.from(superAdmins)
		.where(eq(superAdmins.email, cleanEmail))
		.limit(1);

	let admin = adminRecords[0];

	if (!authenticated && admin && admin.status === "active" && admin.passwordHash) {
		const isMatch = await verifyPassword(password, admin.passwordHash);
		if (isMatch) {
			authenticated = true;
		}
	}

	if (!authenticated) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	// Ensure DB record exists for the Super Admin
	const now = Math.floor(Date.now() / 1000);
	if (!admin) {
		const newHash = await hashPassword(password);
		admin = {
			id: `sa_${crypto.randomUUID().slice(0, 8)}`,
			email: cleanEmail,
			passwordHash: newHash,
			fullName: "AlphaGrad Chief Super Admin",
			role: "super_admin",
			status: "active",
			lastLoginAt: now,
			createdAt: now,
			updatedAt: now,
		};
		await db.insert(superAdmins).values(admin);
	} else {
		const updates: Record<string, any> = { lastLoginAt: now };
		if (envSecretPassword && password === envSecretPassword) {
			updates.passwordHash = await hashPassword(password);
		}
		await db.update(superAdmins).set(updates).where(eq(superAdmins.id, admin.id));
	}

	const secret = c.env.JWT_SECRET || "alphagrad-erp-secure-jwt-key-2026-super-token";
	const token = await signJwt(
		{
			sub: admin.id,
			email: admin.email,
			fullName: admin.fullName,
			role: "super_admin",
			isSuperAdmin: true,
		},
		secret,
		86400 * 7
	);

	return c.json({
		token,
		user: {
			id: admin.id,
			email: admin.email,
			fullName: admin.fullName,
			role: "super_admin",
			isSuperAdmin: true,
		},
	});
});

// 2. Super Admin Profile
superAdminRouter.get("/auth/me", requireSuperAdmin, async (c) => {
	const user = c.get("user");
	return c.json({ user });
});

// 3. Platform Stats
superAdminRouter.get("/stats", requireSuperAdmin, async (c) => {
	const db = createDb(c.env.DB);

	const totalSchoolsResult = await db.select({ count: count() }).from(schools);
	const activeSchoolsResult = await db.select({ count: count() }).from(schools).where(eq(schools.status, "active"));
	const totalStudentsResult = await db.select({ count: count() }).from(students);
	const totalTeachersResult = await db.select({ count: count() }).from(teachers);

	return c.json({
		totalSchools: totalSchoolsResult[0]?.count ?? 0,
		activeSchools: activeSchoolsResult[0]?.count ?? 0,
		totalStudents: totalStudentsResult[0]?.count ?? 0,
		totalTeachers: totalTeachersResult[0]?.count ?? 0,
	});
});

// 4. List All Schools
superAdminRouter.get("/schools", requireSuperAdmin, async (c) => {
	const db = createDb(c.env.DB);

	const allSchools = await db.select().from(schools).orderBy(desc(schools.createdAt));

	// Fetch features, settings, and admin user for each school
	const schoolsWithDetails = await Promise.all(
		allSchools.map(async (sch) => {
			const feat = await db
				.select()
				.from(schoolFeatures)
				.where(eq(schoolFeatures.schoolId, sch.id))
				.limit(1);

			const studentCnt = await db
				.select({ count: count() })
				.from(students)
				.where(eq(students.schoolId, sch.id));

			const teacherCnt = await db
				.select({ count: count() })
				.from(teachers)
				.where(eq(teachers.schoolId, sch.id));

			const adminUser = await db
				.select({
					id: users.id,
					username: users.username,
					fullName: users.fullName,
					email: users.email,
					plainPassword: users.plainPassword,
				})
				.from(users)
				.where(sql`${users.schoolId} = ${sch.id} AND ${users.roleId} = 'admin'`)
				.limit(1);

			return {
				...sch,
				features: feat[0] || null,
				studentCount: studentCnt[0]?.count ?? 0,
				teacherCount: teacherCnt[0]?.count ?? 0,
				adminUser: adminUser[0] || null,
			};
		})
	);

	return c.json({ schools: schoolsWithDetails });
});

// 5. Create School
const createSchoolSchema = z.object({
	code: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Code must be lowercase letters, numbers, and hyphens only"),
	name: z.string().min(2),
	brand: z.string().default("AlphaGrad"),
	tagline: z.string().optional(),
	address: z.string().optional(),
	city: z.string().default("Bangalore"),
	state: z.string().default("Karnataka"),
	contactEmail: z.string().email().optional(),
	contactPhone: z.string().optional(),
	logoUrl: z.string().optional(),
	themePrimary: z.string().default("#2563eb"),
	adminFullName: z.string().min(2).default("Institute Administrator"),
	adminUsername: z.string().min(3).default("Alpha1000"),
	adminPassword: z.string().min(6).default("Alpha@2026"),
	features: z.record(z.string(), z.number()).optional(),
});

superAdminRouter.post("/schools", requireSuperAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createSchoolSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation error", details: parsed.error.issues }, 400);
	}

	const db = createDb(c.env.DB);
	const data = parsed.data;
	const schoolCode = data.code.toLowerCase().trim();

	// Check code collision
	const existing = await db.select({ id: schools.id }).from(schools).where(eq(schools.code, schoolCode)).limit(1);
	if (existing.length > 0) {
		return c.json({ error: `School code '${schoolCode}' is already taken. Please choose another.` }, 400);
	}

	const schoolId = `sch_${schoolCode}_${crypto.randomUUID().slice(0, 8)}`;
	const now = Math.floor(Date.now() / 1000);

	// 1. Insert School
	await db.insert(schools).values({
		id: schoolId,
		code: schoolCode,
		name: data.name,
		brand: data.brand || "AlphaGrad",
		tagline: data.tagline || null,
		address: data.address || null,
		city: data.city || "Bangalore",
		state: data.state || "Karnataka",
		contactEmail: data.contactEmail || null,
		contactPhone: data.contactPhone || null,
		logoUrl: data.logoUrl || null,
		themePrimary: data.themePrimary || "#2563eb",
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	// 2. Insert School Features
	const feat = data.features || {};
	await db.insert(schoolFeatures).values({
		id: `feat_${schoolId}`,
		schoolId: schoolId,
		academic: feat.academic !== undefined ? feat.academic : 1,
		students: feat.students !== undefined ? feat.students : 1,
		teachers: feat.teachers !== undefined ? feat.teachers : 1,
		attendance: feat.attendance !== undefined ? feat.attendance : 1,
		timetable: feat.timetable !== undefined ? feat.timetable : 1,
		homework: feat.homework !== undefined ? feat.homework : 1,
		remarks: feat.remarks !== undefined ? feat.remarks : 1,
		assessments: feat.assessments !== undefined ? feat.assessments : 1,
		syllabus: feat.syllabus !== undefined ? feat.syllabus : 1,
		tasks: feat.tasks !== undefined ? feat.tasks : 1,
		notices: feat.notices !== undefined ? feat.notices : 1,
		complaints: feat.complaints !== undefined ? feat.complaints : 1,
		fees: feat.fees !== undefined ? feat.fees : 1,
		calendar: feat.calendar !== undefined ? feat.calendar : 1,
		accounting: feat.accounting !== undefined ? feat.accounting : 1,
		campaigns: feat.campaigns !== undefined ? feat.campaigns : 1,
		aiTutor: feat.aiTutor !== undefined ? feat.aiTutor : 1,
		worksheets: feat.worksheets !== undefined ? feat.worksheets : 1,
		tests: feat.tests !== undefined ? feat.tests : 1,
		aiAdmin: feat.aiAdmin !== undefined ? feat.aiAdmin : 1,
		updatedAt: now,
	});

	// 3. Insert School Settings
	await db.insert(schoolSettings).values({
		id: `set_${schoolId}`,
		schoolId: schoolId,
		usernamePrefix: "Alpha",
		usernameCounter: 1933,
		academicYearStartMonth: 4,
		feeReminderDays: 7,
		allowStudentComplaints: 1,
		createdAt: now,
		updatedAt: now,
	});

	// 4. Insert Default Current Academic Session
	await db.insert(academicSessions).values({
		id: `sess_${schoolId}_2026`,
		schoolId: schoolId,
		name: "2026-2027",
		startDate: "2026-04-01",
		endDate: "2027-03-31",
		isCurrent: 1,
		createdAt: now,
	});

	// 5. Create School Admin Account
	const adminPassHash = await hashPassword(data.adminPassword);
	const adminUserId = `usr_adm_${schoolCode}_${crypto.randomUUID().slice(0, 6)}`;

	await db.insert(users).values({
		id: adminUserId,
		schoolId: schoolId,
		username: data.adminUsername,
		email: data.contactEmail || `${schoolCode}.admin@alphagrad.in`,
		roleId: "admin",
		fullName: data.adminFullName,
		phone: data.contactPhone || null,
		status: "active",
		passwordHash: adminPassHash,
		plainPassword: data.adminPassword,
		mustChangePassword: 0,
		createdAt: now,
		updatedAt: now,
	});

	return c.json({
		message: "School created successfully",
		school: {
			id: schoolId,
			code: schoolCode,
			name: data.name,
			portalUrl: `https://erp.novaxai.in/${schoolCode}/login`,
			adminUser: {
				username: data.adminUsername,
				password: data.adminPassword,
				fullName: data.adminFullName,
			},
		},
	}, 201);
});

// 6. Update School Features
superAdminRouter.put("/schools/:id/features", requireSuperAdmin, async (c) => {
	const schoolId = c.req.param("id");
	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return c.json({ error: "Invalid features payload" }, 400);
	}

	const db = createDb(c.env.DB);
	const now = Math.floor(Date.now() / 1000);

	const updatePayload: Record<string, any> = { updatedAt: now };
	const featureKeys = [
		"academic", "students", "teachers", "attendance", "timetable",
		"homework", "remarks", "assessments", "syllabus", "tasks",
		"notices", "complaints", "fees", "calendar", "accounting",
		"campaigns", "aiTutor", "worksheets", "tests", "aiAdmin"
	];

	for (const key of featureKeys) {
		if (body[key] !== undefined) {
			updatePayload[key] = body[key] ? 1 : 0;
		}
	}

	await db
		.update(schoolFeatures)
		.set(updatePayload)
		.where(eq(schoolFeatures.schoolId, schoolId));

	const updated = await db
		.select()
		.from(schoolFeatures)
		.where(eq(schoolFeatures.schoolId, schoolId))
		.limit(1);

	return c.json({ message: "Features updated successfully", features: updated[0] });
});

// 7. Update School Details / Status
superAdminRouter.patch("/schools/:id", requireSuperAdmin, async (c) => {
	const schoolId = c.req.param("id");
	const body = await c.req.json().catch(() => ({}));
	const db = createDb(c.env.DB);
	const now = Math.floor(Date.now() / 1000);

	const updates: Record<string, any> = { updatedAt: now };
	if (body.name !== undefined) updates.name = body.name;
	if (body.brand !== undefined) updates.brand = body.brand;
	if (body.tagline !== undefined) updates.tagline = body.tagline;
	if (body.address !== undefined) updates.address = body.address;
	if (body.city !== undefined) updates.city = body.city;
	if (body.state !== undefined) updates.state = body.state;
	if (body.contactEmail !== undefined) updates.contactEmail = body.contactEmail;
	if (body.contactPhone !== undefined) updates.contactPhone = body.contactPhone;
	if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
	if (body.themePrimary !== undefined) updates.themePrimary = body.themePrimary;
	if (body.status !== undefined) updates.status = body.status;

	await db.update(schools).set(updates).where(eq(schools.id, schoolId));

	const updated = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
	return c.json({ message: "School updated", school: updated[0] });
});

// 8. Reset School Admin Password
superAdminRouter.post("/schools/:id/reset-admin", requireSuperAdmin, async (c) => {
	const schoolId = c.req.param("id");
	const body = await c.req.json().catch(() => ({}));
	const newPassword = body.newPassword || `Alpha@${Math.floor(1000 + Math.random() * 9000)}`;

	const db = createDb(c.env.DB);
	const adminUsers = await db
		.select()
		.from(users)
		.where(sql`${users.schoolId} = ${schoolId} AND ${users.roleId} = 'admin'`)
		.limit(1);

	if (adminUsers.length === 0) {
		return c.json({ error: "No admin user found for this school" }, 404);
	}

	const hash = await hashPassword(newPassword);
	await db
		.update(users)
		.set({
			passwordHash: hash,
			plainPassword: newPassword,
			updatedAt: Math.floor(Date.now() / 1000),
		})
		.where(eq(users.id, adminUsers[0].id));

	return c.json({
		message: "Admin password reset successfully",
		username: adminUsers[0].username,
		password: newPassword,
	});
});

// 9. Delete School & All Associated Data
superAdminRouter.delete("/schools/:id", requireSuperAdmin, async (c) => {
	const schoolId = c.req.param("id");
	const db = createDb(c.env.DB);

	await db.delete(schools).where(eq(schools.id, schoolId));
	return c.json({ message: "School and all associated records deleted successfully" });
});

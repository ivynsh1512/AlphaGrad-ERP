import { Hono } from "hono";
import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { schools, schoolFeatures, users, students, teachers, auditLogs } from "../db/schema";
import { signJwt } from "../auth/jwt";
import { verifyPassword, hashPassword } from "../auth/passwords";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const authRouter = new Hono<{ Bindings: Bindings }>();

const loginSchema = z.object({
	schoolCode: z.string().optional(),
	username: z.string().min(1),
	password: z.string().min(1),
});

// School User Login (Admin, Teacher, Student/Parent)
authRouter.post("/login", async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request payload", details: parsed.error.issues }, 400);
	}

	const schoolCode = (
		c.req.param("schoolCode") ||
		c.req.header("x-school-code") ||
		parsed.data.schoolCode ||
		""
	).toLowerCase().trim();

	if (!schoolCode) {
		return c.json({ error: "School code is required for login" }, 400);
	}

	const db = createDb(c.env.DB);

	// 1. Verify School
	const schoolResult = await db
		.select()
		.from(schools)
		.where(eq(schools.code, schoolCode))
		.limit(1);

	const school = schoolResult[0];
	if (!school) {
		return c.json({ error: `Institute with code '${schoolCode}' not found` }, 404);
	}

	if (school.status === "suspended") {
		return c.json({ error: "This institute account is currently suspended. Please contact administrator." }, 403);
	}

	const { username, password } = parsed.data;
	const trimmedUsername = username.trim();

	// 2. Lookup User in School
	const userRecords = await db
		.select()
		.from(users)
		.where(
			and(
				eq(users.schoolId, school.id),
				sql`(lower(${users.username}) = lower(${trimmedUsername}) OR lower(${users.email}) = lower(${trimmedUsername}))`
			)
		)
		.limit(1);

	const user = userRecords[0];

	// Enumeration protection
	if (!user || user.status !== "active" || !user.passwordHash) {
		// Run dummy verification to mitigate timing attacks
		await verifyPassword(
			"dummy",
			"pbkdf2:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000"
		);
		return c.json({ error: "Invalid credentials" }, 401);
	}

	const isMatch = await verifyPassword(password, user.passwordHash);
	if (!isMatch) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	// 3. Resolve role specific IDs
	let studentId: string | undefined;
	let teacherId: string | undefined;

	if (user.roleId === "student_parent") {
		const stu = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
		studentId = stu[0]?.id;
	} else if (user.roleId === "teacher") {
		const tch = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.id)).limit(1);
		teacherId = tch[0]?.id;
	}

	// 4. Update last login
	await db
		.update(users)
		.set({ lastLoginAt: Math.floor(Date.now() / 1000) })
		.where(eq(users.id, user.id));

	// 5. Fetch features
	const featuresResult = await db
		.select()
		.from(schoolFeatures)
		.where(eq(schoolFeatures.schoolId, school.id))
		.limit(1);

	const secret = c.env.JWT_SECRET || "alphagrad-erp-secure-jwt-key-2026-super-token";
	const token = await signJwt(
		{
			sub: user.id,
			userId: user.id,
			username: user.username,
			role: user.roleId,
			fullName: user.fullName,
			schoolId: school.id,
			schoolCode: school.code,
			studentId,
			teacherId,
		},
		secret,
		86400 * 7
	);

	return c.json({
		token,
		user: {
			id: user.id,
			username: user.username,
			fullName: user.fullName,
			role: user.roleId,
			email: user.email,
			phone: user.phone,
			schoolId: school.id,
			schoolCode: school.code,
			studentId,
			teacherId,
			mustChangePassword: user.mustChangePassword === 1,
		},
		school: {
			id: school.id,
			code: school.code,
			name: school.name,
			brand: school.brand,
			logoUrl: school.logoUrl,
			themePrimary: school.themePrimary,
		},
		features: featuresResult[0] || null,
	});
});

// Profile / Session Verification
authRouter.get("/me", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env.DB);

	let schoolInfo = null;
	let features = null;

	if (user.schoolId) {
		const sch = await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1);
		schoolInfo = sch[0] || null;

		const feat = await db.select().from(schoolFeatures).where(eq(schoolFeatures.schoolId, user.schoolId)).limit(1);
		features = feat[0] || null;
	}

	return c.json({
		user,
		school: schoolInfo,
		features,
	});
});

// Change Password
authRouter.post("/change-password", requireAuth, async (c) => {
	const user = c.get("user");
	const body = await c.req.json().catch(() => null);
	const schema = z.object({
		currentPassword: z.string().min(1),
		newPassword: z.string().min(6),
	});

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid password input", details: parsed.error.issues }, 400);
	}

	const db = createDb(c.env.DB);
	const dbUsers = await db.select().from(users).where(eq(users.id, user.sub)).limit(1);
	const dbUser = dbUsers[0];

	if (!dbUser || !dbUser.passwordHash) {
		return c.json({ error: "User not found" }, 404);
	}

	const isValid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
	if (!isValid) {
		return c.json({ error: "Current password is incorrect" }, 400);
	}

	const newHash = await hashPassword(parsed.data.newPassword);
	await db
		.update(users)
		.set({
			passwordHash: newHash,
			plainPassword: parsed.data.newPassword,
			mustChangePassword: 0,
			updatedAt: Math.floor(Date.now() / 1000),
		})
		.where(eq(users.id, user.sub));

	return c.json({ message: "Password updated successfully" });
});

// Reset Password (Admin only)
authRouter.post("/reset-password", requireAuth, requireAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const schema = z.object({
		userId: z.string().min(1),
		newPassword: z.string().min(6).optional(),
	});

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request payload" }, 400);
	}

	const currentUser = c.get("user");
	const newPass = parsed.data.newPassword || `Alpha@${Math.floor(1000 + Math.random() * 9000)}`;
	const db = createDb(c.env.DB);

	// Ensure target user belongs to same school
	const targetUsers = await db
		.select()
		.from(users)
		.where(and(eq(users.id, parsed.data.userId), eq(users.schoolId, currentUser.schoolId!)))
		.limit(1);

	const targetUser = targetUsers[0];
	if (!targetUser) {
		return c.json({ error: "User not found in this school" }, 404);
	}

	const hash = await hashPassword(newPass);
	await db
		.update(users)
		.set({
			passwordHash: hash,
			plainPassword: newPass,
			mustChangePassword: 1,
			updatedAt: Math.floor(Date.now() / 1000),
		})
		.where(eq(users.id, targetUser.id));

	return c.json({
		message: "Password reset successfully",
		username: targetUser.username,
		password: newPass,
		fullName: targetUser.fullName,
		role: targetUser.roleId,
	});
});

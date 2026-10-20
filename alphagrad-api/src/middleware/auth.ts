import { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { verifyJwt, JwtPayload } from "../auth/jwt";
import { Bindings } from "../index";
import { createDb } from "../db";
import { schools, schoolFeatures } from "../db/schema";

declare module "hono" {
	interface ContextVariableMap {
		user: JwtPayload;
		school: typeof schools.$inferSelect;
		features: typeof schoolFeatures.$inferSelect;
		schoolId: string;
		schoolCode: string;
	}
}

export const requireAuth: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized: Missing or invalid Authorization header" }, 401);
	}

	const token = authHeader.substring(7).trim();
	const secret = c.env.JWT_SECRET || "alphagrad-erp-secure-jwt-key-2026-super-token";

	const payload = await verifyJwt(token, secret);
	if (!payload) {
		return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
	}

	c.set("user", payload);
	if (payload.schoolId) c.set("schoolId", payload.schoolId);
	if (payload.schoolCode) c.set("schoolCode", payload.schoolCode);

	await next();
};

export const requireSuperAdmin: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	let user = c.get("user");
	if (!user) {
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Unauthorized: Super Admin credentials required" }, 401);
		}

		const token = authHeader.substring(7).trim();
		const secret = c.env.JWT_SECRET || "alphagrad-erp-secure-jwt-key-2026-super-token";

		const payload = await verifyJwt(token, secret);
		if (!payload) {
			return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
		}

		c.set("user", payload);
		user = payload;
	}

	if (user.role !== "super_admin" && !user.isSuperAdmin) {
		return c.json({ error: "Forbidden: Super Admin access required" }, 403);
	}

	await next();
};

export const requireRole = (allowedRoles: string[]): MiddlewareHandler<{ Bindings: Bindings }> => {
	return async (c, next) => {
		let user = c.get("user");
		if (!user) {
			const authHeader = c.req.header("Authorization");
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return c.json({ error: "Unauthorized: Missing or invalid Authorization header" }, 401);
			}

			const token = authHeader.substring(7).trim();
			const secret = c.env.JWT_SECRET || "alphagrad-erp-secure-jwt-key-2026-super-token";

			const payload = await verifyJwt(token, secret);
			if (!payload) {
				return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
			}

			c.set("user", payload);
			user = payload;
		}

		if (user.role === "super_admin") {
			// Super admin has full privilege
			return await next();
		}

		if (!allowedRoles.includes(user.role)) {
			return c.json({
				error: "Forbidden: You do not have permission to access this resource",
				requiredRoles: allowedRoles,
				currentRole: user.role,
			}, 403);
		}

		await next();
	};
};

export const requireAdmin = requireRole(["admin"]);
export const requireTeacher = requireRole(["admin", "teacher"]);
export const requireStudentOrParent = requireRole(["admin", "student_parent"]);

// Tenant Context Resolution Middleware
export const resolveTenant: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	const db = createDb(c.env.DB);

	// Try extracting school code from:
	// 1. Path param (e.g. :schoolCode)
	// 2. Header (x-school-code)
	// 3. User JWT token (payload.schoolCode or payload.schoolId)
	const pathSchoolCode = c.req.param("schoolCode");
	const headerSchoolCode = c.req.header("x-school-code");
	const user = c.get("user");

	const codeToFind = pathSchoolCode || headerSchoolCode || user?.schoolCode;

	let schoolRecord: typeof schools.$inferSelect | undefined;

	if (codeToFind) {
		const result = await db
			.select()
			.from(schools)
			.where(eq(schools.code, codeToFind.toLowerCase().trim()))
			.limit(1);
		schoolRecord = result[0];
	} else if (user?.schoolId) {
		const result = await db
			.select()
			.from(schools)
			.where(eq(schools.id, user.schoolId))
			.limit(1);
		schoolRecord = result[0];
	}

	if (!schoolRecord) {
		return c.json({ error: "Institute not found or invalid school code" }, 404);
	}

	if (schoolRecord.status === "suspended") {
		return c.json({ error: "Institute account is currently suspended. Please contact administrator." }, 403);
	}

	// Fetch enabled features for this school
	const featuresResult = await db
		.select()
		.from(schoolFeatures)
		.where(eq(schoolFeatures.schoolId, schoolRecord.id))
		.limit(1);

	let features = featuresResult[0];
	if (!features) {
		// Default all 1 if missing
		features = {
			id: `feat_${schoolRecord.id}`,
			schoolId: schoolRecord.id,
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
			updatedAt: Math.floor(Date.now() / 1000),
		};
	}

	c.set("school", schoolRecord);
	c.set("schoolId", schoolRecord.id);
	c.set("schoolCode", schoolRecord.code);
	c.set("features", features);

	await next();
};

// Feature Gate Middleware
export const requireFeature = (featureName: keyof typeof schoolFeatures.$inferSelect): MiddlewareHandler<{ Bindings: Bindings }> => {
	return async (c, next) => {
		const features = c.get("features");
		if (features) {
			const isEnabled = features[featureName] === 1;
			if (!isEnabled) {
				return c.json({
					error: `Module '${String(featureName)}' is not enabled for this institute. Please contact AlphaGrad Super Admin.`,
					feature: featureName,
					status: "disabled"
				}, 403);
			}
		}
		await next();
	};
};

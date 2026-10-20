import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "./db";
import { schools, academicSessions, schoolSettings } from "./db/schema";
import { eq } from "drizzle-orm";

import { superAdminRouter } from "./routes/superAdmin";
import { schoolsRouter } from "./routes/schools";
import { authRouter } from "./routes/auth";
import studentsRouter from "./routes/students";
import teachersRouter from "./routes/teachers";
import academicRouter from "./routes/academic";
import attendanceRouter from "./routes/attendance";
import homeworkRouter from "./routes/homework";
import remarksRouter from "./routes/remarks";
import noticesRouter from "./routes/notices";
import feesRouter from "./routes/fees";
import paymentsRouter from "./routes/payments";
import complaintsRouter from "./routes/complaints";
import reportsRouter from "./routes/reports";
import settingsRouter from "./routes/settings";
import { syllabusRouter } from "./routes/syllabus";
import { assessmentsRouter } from "./routes/assessments";
import { tasksRouter } from "./routes/tasks";
import { accountingRouter } from "./routes/accounting";
import { calendarRouter } from "./routes/calendar";
import { timetableRouter } from "./routes/timetable";
import aiTutorRouter from "./routes/aiTutor";
import { worksheetsRouter } from "./routes/worksheets";
import { testsRouter } from "./routes/tests";
import { submissionsRouter } from "./routes/submissions";
import { campaignsRouter } from "./routes/campaigns";
import { aiAdminRouter } from "./routes/aiAdmin";

import { resolveTenant, requireFeature, requireAuth } from "./middleware/auth";

export type Bindings = {
	DB: D1Database;
	JWT_SECRET?: string;
	RAZORPAY_KEY_ID?: string;
	RAZORPAY_KEY_SECRET?: string;
	RAZORPAY_WEBHOOK_SECRET?: string;
	FIREBASE_PROJECT_ID?: string;
	GROQ_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware
app.use("*", cors({
	origin: "*",
	allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization", "x-school-code"],
}));

// Basic verification routes
app.get("/", (c) => c.json({ service: "alphagrad-erp-api", status: "online", version: "1.0.0" }));
app.get("/message", (c) => c.text("AlphaGrad ERP API Online"));

// Health check
app.get("/api/v1/health", async (c) => {
	try {
		const db = createDb(c.env.DB);
		const schoolList = await db.select().from(schools).limit(1);

		return c.json({
			status: "healthy",
			service: "alphagrad-erp-api",
			timestamp: new Date().toISOString(),
			database: {
				status: "connected",
				schoolCount: schoolList.length,
			},
		});
	} catch (error: any) {
		return c.json({
			status: "error",
			service: "alphagrad-erp-api",
			error: error?.message || "Database query failed",
		}, 500);
	}
});

// 1. Super Admin API
app.route("/api/v1/super-admin", superAdminRouter);

// 2. Public School Info (Branding & Feature discovery)
app.route("/api/v1/schools", schoolsRouter);

// 3. Authentication (both /api/v1/auth and /api/v1/:schoolCode/auth)
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/:schoolCode/auth", authRouter);

// 4. Mount Tenant-Scoped Module Routers
// Helper to mount routes with tenant context
function mountTenantRoutes(prefix: string) {
	app.route(`${prefix}/students`, studentsRouter);
	app.route(`${prefix}/teachers`, teachersRouter);
	app.route(`${prefix}/academic`, academicRouter);
	app.route(`${prefix}/attendance`, attendanceRouter);
	app.route(`${prefix}/homework`, homeworkRouter);
	app.route(`${prefix}/remarks`, remarksRouter);
	app.route(`${prefix}/notices`, noticesRouter);
	app.route(`${prefix}/fees`, feesRouter);
	app.route(`${prefix}/payments`, paymentsRouter);
	app.route(`${prefix}/complaints`, complaintsRouter);
	app.route(`${prefix}/reports`, reportsRouter);
	app.route(`${prefix}/settings`, settingsRouter);
	app.route(`${prefix}/syllabus`, syllabusRouter);
	app.route(`${prefix}/assessments`, assessmentsRouter);
	app.route(`${prefix}/tasks`, tasksRouter);
	app.route(`${prefix}/accounting`, accountingRouter);
	app.route(`${prefix}/calendar`, calendarRouter);
	app.route(`${prefix}/timetable`, timetableRouter);
	app.route(`${prefix}/ai/tutor`, aiTutorRouter);
	app.route(`${prefix}/worksheets`, worksheetsRouter);
	app.route(`${prefix}/tests`, testsRouter);
	app.route(`${prefix}/submissions`, submissionsRouter);
	app.route(`${prefix}/campaigns`, campaignsRouter);
	app.route(`${prefix}/ai/admin`, aiAdminRouter);
}

// Mount standard paths (resolves tenant via x-school-code or JWT)
mountTenantRoutes("/api/v1");

// Mount path-based tenant routes (e.g. /api/v1/:schoolCode/students)
mountTenantRoutes("/api/v1/:schoolCode");

export default app;

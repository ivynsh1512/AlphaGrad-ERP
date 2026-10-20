import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { notices, users, auditLogs } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const noticesRouter = new Hono<{ Bindings: Bindings }>();

// 1. List Notices (Filtered by user role)
noticesRouter.get("/", requireAuth, async (c) => {
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	let audienceFilter = ["all"];
	if (authUser.role === "admin") {
		audienceFilter = ["all", "students", "teachers", "parents"];
	} else if (authUser.role === "teacher") {
		audienceFilter = ["all", "teachers"];
	} else if (authUser.role === "student_parent") {
		audienceFilter = ["all", "students", "parents"];
	}

	const allNotices = await db
		.select({
			id: notices.id,
			title: notices.title,
			content: notices.content,
			targetAudience: notices.targetAudience,
			isPinned: notices.isPinned,
			attachmentUrl: notices.attachmentUrl,
			publishedAt: notices.publishedAt,
			publisherName: users.fullName,
		})
		.from(notices)
		.innerJoin(users, eq(notices.publishedBy, users.id))
		.orderBy(desc(notices.isPinned), desc(notices.publishedAt));

	const filtered = allNotices.filter((n) => audienceFilter.includes(n.targetAudience));
	return c.json({ notices: filtered });
});

// 2. Publish Notice (Admin)
const createNoticeSchema = z.object({
	title: z.string().trim().min(2, "Title must have at least 2 characters"),
	content: z.string().trim().min(3, "Content must have at least 3 characters"),
	targetAudience: z.enum(["all", "students", "teachers", "parents"]).default("all"),
	isPinned: z.boolean().default(false),
	attachmentUrl: z.string().optional(),
});

noticesRouter.post("/", requireAuth, requireAdmin, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createNoticeSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
	}

	const data = parsed.data;
	const db = createDb(c.env.DB);
	const id = crypto.randomUUID();

	await db.insert(notices).values({
		id,
		title: data.title,
		content: data.content,
		targetAudience: data.targetAudience,
		isPinned: data.isPinned ? 1 : 0,
		attachmentUrl: data.attachmentUrl,
		publishedBy: c.get("user").sub,
	});

	await db.insert(auditLogs).values({
		id: crypto.randomUUID(),
		userId: c.get("user").sub,
		action: "CREATE",
		entityType: "notices",
		entityId: id,
		details: JSON.stringify({ title: data.title, audience: data.targetAudience }),
		ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
	});

	return c.json({ message: "Notice published successfully", id }, 201);
});

// 3. Delete Notice (Admin)
noticesRouter.delete("/:id", requireAuth, requireAdmin, async (c) => {
	const id = c.req.param("id");
	const db = createDb(c.env.DB);

	await db.delete(notices).where(eq(notices.id, id));

	return c.json({ message: "Notice deleted successfully" });
});

export default noticesRouter;

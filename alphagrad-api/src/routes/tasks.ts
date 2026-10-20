import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { tasks, users, teachers, students, batches, subjects } from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const tasksRouter = new Hono();

// 1. List tasks (filtered by assignedToType, assignedToId, status)
tasksRouter.get("/", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const assignedToType = c.req.query("assignedToType"); // 'teacher' | 'student'
	const assignedToId = c.req.query("assignedToId");
	const status = c.req.query("status");

	const conditions: any[] = [];
	if (assignedToType) conditions.push(eq(tasks.assignedToType, assignedToType));
	if (assignedToId) conditions.push(eq(tasks.assignedToId, assignedToId));
	if (status && status !== "all") conditions.push(eq(tasks.status, status));

	const list = await db
		.select({
			id: tasks.id,
			assignedToType: tasks.assignedToType,
			assignedToId: tasks.assignedToId,
			assignedByUserId: tasks.assignedByUserId,
			title: tasks.title,
			description: tasks.description,
			batchId: tasks.batchId,
			batchName: batches.name,
			subjectId: tasks.subjectId,
			subjectName: subjects.name,
			dueDate: tasks.dueDate,
			priority: tasks.priority,
			status: tasks.status,
			completedAt: tasks.completedAt,
			createdAt: tasks.createdAt,
			updatedAt: tasks.updatedAt,
		})
		.from(tasks)
		.leftJoin(batches, eq(tasks.batchId, batches.id))
		.leftJoin(subjects, eq(tasks.subjectId, subjects.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(tasks.createdAt));

	return c.json({ tasks: list });
});

// 2. Create task (assign to teacher or student)
tasksRouter.post("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = getDb(c.env.DB);
	const body = await c.req.json();

	const {
		assignedToType, // 'teacher' | 'student'
		assignedToId,
		title,
		description,
		batchId,
		subjectId,
		dueDate,
		priority = "medium",
		status = "pending",
	} = body;

	if (!assignedToType || !assignedToId || !title) {
		return c.json({ error: "assignedToType, assignedToId, and title are required." }, 400);
	}

	const id = `tsk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const completedAt = status === "completed" ? Math.floor(Date.now() / 1000) : null;

	await db.insert(tasks).values({
		id,
		assignedToType,
		assignedToId,
		assignedByUserId: user.sub || (user as any).userId || "usr-admin-01",
		title: title.trim(),
		description: description ? description.trim() : null,
		batchId: batchId || null,
		subjectId: subjectId || null,
		dueDate: dueDate || null,
		priority,
		status,
		completedAt,
	});

	const created = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

	return c.json({ message: "Task assigned successfully", task: created[0] }, 201);
});

// 3. Update task (status, notes, priority, etc.)
tasksRouter.patch("/:id", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const body = await c.req.json();

	const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
	if (!existing[0]) {
		return c.json({ error: "Task not found" }, 404);
	}

	const updateData: any = {
		updatedAt: sql`(unixepoch())`,
	};

	if (body.title !== undefined) updateData.title = body.title.trim();
	if (body.description !== undefined) updateData.description = body.description.trim();
	if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
	if (body.priority !== undefined) updateData.priority = body.priority;

	if (body.status !== undefined) {
		updateData.status = body.status;
		if (body.status === "completed") {
			updateData.completedAt = Math.floor(Date.now() / 1000);
		} else {
			updateData.completedAt = null;
		}
	}

	await db.update(tasks).set(updateData).where(eq(tasks.id, id));

	const updated = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
	return c.json({ message: "Task updated successfully", task: updated[0] });
});

// 4. Delete task
tasksRouter.delete("/:id", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");

	await db.delete(tasks).where(eq(tasks.id, id));
	return c.json({ message: "Task deleted successfully" });
});

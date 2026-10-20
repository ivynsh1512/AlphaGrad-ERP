import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { timetables, batches, subjects, teachers, users } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const timetableRouter = new Hono();

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// 1. List timetable entries (all roles) — filter by batchId, teacherId, dayOfWeek
timetableRouter.get("/", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const batchId = c.req.query("batchId");
	const teacherId = c.req.query("teacherId");
	const dayOfWeek = c.req.query("dayOfWeek");

	const conditions: any[] = [];
	if (batchId) conditions.push(eq(timetables.batchId, batchId));
	if (teacherId) conditions.push(eq(timetables.teacherId, teacherId));
	if (dayOfWeek) conditions.push(eq(timetables.dayOfWeek, parseInt(dayOfWeek)));

	const list = await db
		.select({
			id: timetables.id,
			batchId: timetables.batchId,
			batchName: batches.name,
			subjectId: timetables.subjectId,
			subjectName: subjects.name,
			teacherId: timetables.teacherId,
			teacherName: users.fullName,
			dayOfWeek: timetables.dayOfWeek,
			startTime: timetables.startTime,
			endTime: timetables.endTime,
			roomNumber: timetables.roomNumber,
			createdAt: timetables.createdAt,
		})
		.from(timetables)
		.leftJoin(batches, eq(timetables.batchId, batches.id))
		.leftJoin(subjects, eq(timetables.subjectId, subjects.id))
		.leftJoin(teachers, eq(timetables.teacherId, teachers.id))
		.leftJoin(users, eq(teachers.userId, users.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(timetables.dayOfWeek, timetables.startTime);

	// Group by day
	const byDay: Record<number, { dayName: string; entries: any[] }> = {};
	for (let d = 1; d <= 7; d++) {
		byDay[d] = { dayName: DAY_NAMES[d], entries: [] };
	}
	for (const row of list) {
		const d = row.dayOfWeek;
		if (byDay[d]) byDay[d].entries.push({ ...row, dayName: DAY_NAMES[d] });
	}

	// Build weekly schedule (skip empty days)
	const weekly = Object.values(byDay).filter((d) => d.entries.length > 0);

	return c.json({ timetable: list, weekly, total: list.length });
});

// 2. Get single timetable entry
timetableRouter.get("/:id", requireAuth, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const rows = await db
		.select({
			id: timetables.id,
			batchId: timetables.batchId,
			batchName: batches.name,
			subjectId: timetables.subjectId,
			subjectName: subjects.name,
			teacherId: timetables.teacherId,
			teacherName: users.fullName,
			dayOfWeek: timetables.dayOfWeek,
			startTime: timetables.startTime,
			endTime: timetables.endTime,
			roomNumber: timetables.roomNumber,
			createdAt: timetables.createdAt,
		})
		.from(timetables)
		.leftJoin(batches, eq(timetables.batchId, batches.id))
		.leftJoin(subjects, eq(timetables.subjectId, subjects.id))
		.leftJoin(teachers, eq(timetables.teacherId, teachers.id))
		.leftJoin(users, eq(teachers.userId, users.id))
		.where(eq(timetables.id, id))
		.limit(1);

	if (!rows.length) return c.json({ error: "Timetable entry not found" }, 404);
	return c.json({ entry: { ...rows[0], dayName: DAY_NAMES[rows[0].dayOfWeek] } });
});

// 3. Create timetable entry (admin only)
timetableRouter.post("/", requireAuth, requireAdmin, async (c) => {
	const db = getDb(c.env.DB);
	const body = await c.req.json();
	const { batchId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = body;

	if (!batchId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
		return c.json({ error: "batchId, subjectId, teacherId, dayOfWeek, startTime, endTime are required" }, 400);
	}
	if (dayOfWeek < 1 || dayOfWeek > 7) {
		return c.json({ error: "dayOfWeek must be 1 (Monday) to 7 (Sunday)" }, 400);
	}

	const id = crypto.randomUUID();
	await db.insert(timetables).values({
		id,
		batchId,
		subjectId,
		teacherId,
		dayOfWeek,
		startTime,
		endTime,
		roomNumber: roomNumber ?? null,
	});

	return c.json({ message: "Timetable entry created", id }, 201);
});

// 4. Update timetable entry (admin only)
timetableRouter.put("/:id", requireAuth, requireAdmin, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const body = await c.req.json();

	const existing = await db.select({ id: timetables.id }).from(timetables).where(eq(timetables.id, id)).limit(1);
	if (!existing.length) return c.json({ error: "Timetable entry not found" }, 404);

	const updates: any = {};
	if (body.batchId !== undefined) updates.batchId = body.batchId;
	if (body.subjectId !== undefined) updates.subjectId = body.subjectId;
	if (body.teacherId !== undefined) updates.teacherId = body.teacherId;
	if (body.dayOfWeek !== undefined) {
		if (body.dayOfWeek < 1 || body.dayOfWeek > 7)
			return c.json({ error: "dayOfWeek must be 1-7" }, 400);
		updates.dayOfWeek = body.dayOfWeek;
	}
	if (body.startTime !== undefined) updates.startTime = body.startTime;
	if (body.endTime !== undefined) updates.endTime = body.endTime;
	if (body.roomNumber !== undefined) updates.roomNumber = body.roomNumber;

	if (!Object.keys(updates).length) return c.json({ error: "No valid fields to update" }, 400);

	await db.update(timetables).set(updates).where(eq(timetables.id, id));
	return c.json({ message: "Timetable entry updated" });
});

// 5. Delete timetable entry (admin only)
timetableRouter.delete("/:id", requireAuth, requireAdmin, async (c) => {
	const db = getDb(c.env.DB);
	const id = c.req.param("id");
	const existing = await db.select({ id: timetables.id }).from(timetables).where(eq(timetables.id, id)).limit(1);
	if (!existing.length) return c.json({ error: "Timetable entry not found" }, 404);
	await db.delete(timetables).where(eq(timetables.id, id));
	return c.json({ message: "Timetable entry deleted" });
});

// 6. Bulk replace timetable for a batch (admin only) — POST /bulk
// Body: { batchId, entries: [{ subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber? }] }
timetableRouter.post("/bulk", requireAuth, requireAdmin, async (c) => {
	const db = getDb(c.env.DB);
	const body = await c.req.json();
	const { batchId, entries } = body;

	if (!batchId || !Array.isArray(entries)) {
		return c.json({ error: "batchId and entries[] are required" }, 400);
	}

	// Delete existing entries for this batch
	await db.delete(timetables).where(eq(timetables.batchId, batchId));

	if (entries.length > 0) {
		const rows = entries.map((e: any) => ({
			id: crypto.randomUUID(),
			batchId,
			subjectId: e.subjectId,
			teacherId: e.teacherId,
			dayOfWeek: e.dayOfWeek,
			startTime: e.startTime,
			endTime: e.endTime,
			roomNumber: e.roomNumber ?? null,
		}));
		await db.insert(timetables).values(rows);
	}

	return c.json({ message: `Timetable updated with ${entries.length} entries`, count: entries.length });
});

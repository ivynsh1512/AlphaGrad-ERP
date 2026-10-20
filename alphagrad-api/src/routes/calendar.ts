import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { calendarEvents, batches, monthlyAssessments, subjects, auditLogs } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const calendarRouter = new Hono<{ Bindings: Bindings }>();

// 1. List calendar events with filters (month, year, category, batchId)
// Accessible by Admin, Teacher, and Student/Parent
calendarRouter.get("/", requireAuth, async (c) => {
	try {
		const db = createDb(c.env.DB);
		const month = c.req.query("month"); // e.g. "2026-10"
		const year = c.req.query("year"); // e.g. "2026"
		const category = c.req.query("category"); // 'holiday' | 'assessment' | 'extra_class' | 'event' | 'all'
		const batchId = c.req.query("batchId");

		// Fetch all custom calendar events
		const rawEvents = await db
			.select({
				id: calendarEvents.id,
				title: calendarEvents.title,
				description: calendarEvents.description,
				category: calendarEvents.category,
				subCategory: calendarEvents.subCategory,
				startDate: calendarEvents.startDate,
				endDate: calendarEvents.endDate,
				startTime: calendarEvents.startTime,
				endTime: calendarEvents.endTime,
				isAllDay: calendarEvents.isAllDay,
				batchId: calendarEvents.batchId,
				batchName: batches.name,
				targetAudience: calendarEvents.targetAudience,
				color: calendarEvents.color,
				location: calendarEvents.location,
				createdAt: calendarEvents.createdAt,
				updatedAt: calendarEvents.updatedAt,
			})
			.from(calendarEvents)
			.leftJoin(batches, eq(calendarEvents.batchId, batches.id))
			.orderBy(calendarEvents.startDate);

		// Also fetch monthly assessments if category is 'all' or 'assessment'
		let assessmentEvents: any[] = [];
		if (!category || category === "all" || category === "assessment") {
			try {
				const assessments = await db
					.select({
						id: monthlyAssessments.id,
						title: monthlyAssessments.title,
						description: monthlyAssessments.description,
						month: monthlyAssessments.month,
						assessmentDate: monthlyAssessments.assessmentDate,
						maxMarks: monthlyAssessments.maxMarks,
						passingMarks: monthlyAssessments.passingMarks,
						batchId: monthlyAssessments.batchId,
						batchName: batches.name,
						subjectId: monthlyAssessments.subjectId,
						subjectName: subjects.name,
						subjectCode: subjects.code,
					})
					.from(monthlyAssessments)
					.leftJoin(batches, eq(monthlyAssessments.batchId, batches.id))
					.leftJoin(subjects, eq(monthlyAssessments.subjectId, subjects.id));

				assessmentEvents = assessments.map((a) => ({
					id: `assessment-${a.id}`,
					title: a.subjectName ? `${a.title} (${a.subjectName})` : a.title,
					description: a.description || `Assessment for ${a.batchName || "Batch"}. Max marks: ${a.maxMarks}, Passing: ${a.passingMarks || 40}`,
					category: "assessment",
					subCategory: "Monthly Assessment",
					startDate: a.assessmentDate,
					endDate: a.assessmentDate,
					startTime: "10:00",
					endTime: "12:00",
					isAllDay: 0,
					batchId: a.batchId,
					batchName: a.batchName,
					targetAudience: "students",
					color: "#8b5cf6", // Indigo/Purple for assessment
					location: a.batchName || "Main Examination Hall",
					isFromAssessmentTable: true,
					maxMarks: a.maxMarks,
					subjectName: a.subjectName,
					createdAt: null,
					updatedAt: null,
				}));
			} catch (err) {
				console.error("Failed to query monthly assessments for calendar:", err);
			}
		}

		// Combine both event streams
		let combined = [...rawEvents, ...assessmentEvents];

		// Apply in-memory or query filters
		if (category && category !== "all") {
			combined = combined.filter((e) => e.category === category);
		}

		if (month) {
			// month is e.g. "2026-10"
			combined = combined.filter((e) => {
				const sMonth = e.startDate?.slice(0, 7);
				const eMonth = e.endDate ? e.endDate.slice(0, 7) : sMonth;
				return sMonth === month || eMonth === month || (sMonth <= month && eMonth >= month);
			});
		} else if (year) {
			// year is e.g. "2026"
			combined = combined.filter((e) => {
				const sYear = e.startDate?.slice(0, 4);
				const eYear = e.endDate ? e.endDate.slice(0, 4) : sYear;
				return sYear === year || eYear === year;
			});
		}

		if (batchId && batchId !== "all") {
			combined = combined.filter((e) => !e.batchId || e.batchId === batchId);
		}

		// Sort by startDate ascending
		combined.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));

		// Today's date in YYYY-MM-DD
		const todayStr = new Date().toISOString().split("T")[0];

		// Quick metrics
		const holidaysCount = combined.filter((e) => e.category === "holiday").length;
		const assessmentsCount = combined.filter((e) => e.category === "assessment").length;
		const extraCount = combined.filter((e) => e.category === "extra_class" || e.category === "event").length;

		// Upcoming events (from today onwards)
		const upcomingHolidays = combined
			.filter((e) => e.category === "holiday" && (e.endDate || e.startDate) >= todayStr)
			.slice(0, 5);

		const upcomingAssessments = combined
			.filter((e) => e.category === "assessment" && (e.endDate || e.startDate) >= todayStr)
			.slice(0, 5);

		const upcomingEvents = combined
			.filter((e) => (e.endDate || e.startDate) >= todayStr)
			.slice(0, 10);

		return c.json({
			events: combined,
			stats: {
				totalEvents: combined.length,
				holidaysCount,
				assessmentsCount,
				extraCount,
			},
			upcomingHolidays,
			upcomingAssessments,
			upcomingEvents,
		});
	} catch (err: any) {
		return c.json({ error: "Failed to fetch calendar events: " + (err?.message || "Internal error") }, 500);
	}
});

// 2. Create calendar event (Admin only)
const createEventSchema = z.object({
	title: z.string().trim().min(2, "Title must be at least 2 characters"),
	description: z.string().trim().optional(),
	category: z.enum(["holiday", "assessment", "extra_class", "event"]).default("holiday"),
	subCategory: z.string().trim().optional(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD").optional().nullable(),
	startTime: z.string().optional().nullable(),
	endTime: z.string().optional().nullable(),
	isAllDay: z.boolean().default(true),
	batchId: z.string().optional().nullable(),
	targetAudience: z.string().default("all"),
	color: z.string().optional().nullable(),
	location: z.string().trim().optional().nullable(),
});

calendarRouter.post("/", requireAuth, requireAdmin, async (c) => {
	try {
		const user = c.get("user");
		const body = await c.req.json().catch(() => null);
		const parsed = createEventSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const data = parsed.data;
		const db = createDb(c.env.DB);
		const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

		// Assign default distinct color if not provided
		let color = data.color;
		if (!color) {
			if (data.category === "holiday") color = "#ef4444"; // Red/Rose
			else if (data.category === "assessment") color = "#8b5cf6"; // Purple/Violet
			else if (data.category === "extra_class") color = "#0ea5e9"; // Sky Blue
			else color = "#10b981"; // Emerald
		}

		await db.insert(calendarEvents).values({
			id,
			title: data.title,
			description: data.description || null,
			category: data.category,
			subCategory: data.subCategory || null,
			startDate: data.startDate,
			endDate: data.endDate || data.startDate,
			startTime: data.startTime || null,
			endTime: data.endTime || null,
			isAllDay: data.isAllDay ? 1 : 0,
			batchId: data.batchId && data.batchId !== "all" ? data.batchId : null,
			targetAudience: data.targetAudience,
			color,
			location: data.location || null,
			createdByUserId: user.sub,
		});

		// Audit Log
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: user.sub,
			action: "CREATE",
			entityType: "calendar_events",
			entityId: id,
			details: JSON.stringify({ title: data.title, category: data.category, startDate: data.startDate }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		const created = await db
			.select()
			.from(calendarEvents)
			.where(eq(calendarEvents.id, id))
			.limit(1);

		return c.json({ message: "Calendar event marked successfully", event: created[0] }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to create calendar event: " + (err?.message || "Internal error") }, 500);
	}
});

// 3. Update calendar event (Admin only)
const updateEventSchema = createEventSchema.partial();

calendarRouter.put("/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const id = c.req.param("id");
		const user = c.get("user");
		const body = await c.req.json().catch(() => null);
		const parsed = updateEventSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
		}

		const data = parsed.data;
		const db = createDb(c.env.DB);

		const existing = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
		if (!existing[0]) {
			return c.json({ error: "Calendar event not found" }, 404);
		}

		const updatePayload: any = {
			updatedAt: sql`(unixepoch())`,
		};
		if (data.title !== undefined) updatePayload.title = data.title;
		if (data.description !== undefined) updatePayload.description = data.description;
		if (data.category !== undefined) updatePayload.category = data.category;
		if (data.subCategory !== undefined) updatePayload.subCategory = data.subCategory;
		if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
		if (data.endDate !== undefined) updatePayload.endDate = data.endDate;
		if (data.startTime !== undefined) updatePayload.startTime = data.startTime;
		if (data.endTime !== undefined) updatePayload.endTime = data.endTime;
		if (data.isAllDay !== undefined) updatePayload.isAllDay = data.isAllDay ? 1 : 0;
		if (data.batchId !== undefined) updatePayload.batchId = data.batchId && data.batchId !== "all" ? data.batchId : null;
		if (data.targetAudience !== undefined) updatePayload.targetAudience = data.targetAudience;
		if (data.color !== undefined) updatePayload.color = data.color;
		if (data.location !== undefined) updatePayload.location = data.location;

		await db.update(calendarEvents).set(updatePayload).where(eq(calendarEvents.id, id));

		// Audit Log
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: user.sub,
			action: "UPDATE",
			entityType: "calendar_events",
			entityId: id,
			details: JSON.stringify({ id, updated: Object.keys(updatePayload) }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		const updated = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
		return c.json({ message: "Calendar event updated successfully", event: updated[0] });
	} catch (err: any) {
		return c.json({ error: "Failed to update calendar event: " + (err?.message || "Internal error") }, 500);
	}
});

// 4. Delete calendar event (Admin only)
calendarRouter.delete("/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const id = c.req.param("id");
		const user = c.get("user");
		const db = createDb(c.env.DB);

		const existing = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
		if (!existing[0]) {
			return c.json({ error: "Calendar event not found" }, 404);
		}

		await db.delete(calendarEvents).where(eq(calendarEvents.id, id));

		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: user.sub,
			action: "DELETE",
			entityType: "calendar_events",
			entityId: id,
			details: JSON.stringify({ id, title: existing[0].title }),
			ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
		});

		return c.json({ message: "Calendar event deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete calendar event: " + (err?.message || "Internal error") }, 500);
	}
});

// 5. Seed standard 2026-2027 Academic Holidays & Milestone Dates (Admin only)
calendarRouter.post("/seed-defaults", requireAuth, requireAdmin, async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DB);

		const defaultEvents = [
			// Holidays
			{
				id: "evt-hol-ugadi-2026",
				title: "Ugadi / Gudi Padwa",
				description: "Kannada & Telugu New Year Celebration - Academy Closed",
				category: "holiday",
				subCategory: "Regional Festival",
				startDate: "2026-03-20",
				endDate: "2026-03-20",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-eid-2026",
				title: "Eid-ul-Fitr (Ramzan)",
				description: "Islamic Festival Holiday",
				category: "holiday",
				subCategory: "National Holiday",
				startDate: "2026-03-21",
				endDate: "2026-03-21",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-ambedkar-2026",
				title: "Dr. B.R. Ambedkar Jayanti",
				description: "Birth anniversary of Dr. B.R. Ambedkar - National Holiday",
				category: "holiday",
				subCategory: "National Holiday",
				startDate: "2026-04-14",
				endDate: "2026-04-14",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-summer-2026",
				title: "Summer Vacation Break",
				description: "Annual Summer Vacation for Junior batches (Class 1-8). Special doubt sessions for JEE/NEET continue.",
				category: "holiday",
				subCategory: "Vacation Break",
				startDate: "2026-05-01",
				endDate: "2026-05-25",
				isAllDay: 1,
				color: "#f97316",
				location: "Institute Wide",
			},
			{
				id: "evt-hol-indep-2026",
				title: "Independence Day",
				description: "79th Independence Day Flag Hoisting Ceremony (08:30 AM) followed by Academy Holiday",
				category: "holiday",
				subCategory: "National Festival",
				startDate: "2026-08-15",
				endDate: "2026-08-15",
				isAllDay: 1,
				color: "#ef4444",
				location: "Proventus Academy Grounds",
			},
			{
				id: "evt-hol-ganesh-2026",
				title: "Ganesh Chaturthi",
				description: "Vinayaka Chaturthi Holiday",
				category: "holiday",
				subCategory: "Festival Holiday",
				startDate: "2026-09-14",
				endDate: "2026-09-14",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-gandhi-2026",
				title: "Mahatma Gandhi Jayanti",
				description: "National Holiday observing Gandhi Jayanti",
				category: "holiday",
				subCategory: "National Holiday",
				startDate: "2026-10-02",
				endDate: "2026-10-02",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-dussehra-2026",
				title: "Dussehra & Vijayadashami Break",
				description: "Maha Navami, Ayudha Puja, and Vijayadashami Holidays",
				category: "holiday",
				subCategory: "Vacation Break",
				startDate: "2026-10-20",
				endDate: "2026-10-22",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-rajyotsava-2026",
				title: "Karnataka Rajyotsava",
				description: "Karnataka State Formation Day Celebration & Holiday",
				category: "holiday",
				subCategory: "State Holiday",
				startDate: "2026-11-01",
				endDate: "2026-11-01",
				isAllDay: 1,
				color: "#ef4444",
				location: "Bangalore Campus",
			},
			{
				id: "evt-hol-diwali-2026",
				title: "Deepavali (Diwali) Vacation",
				description: "Naraka Chaturdashi, Lakshmi Puja & Balipadyami Diwali Holidays",
				category: "holiday",
				subCategory: "Festival Holiday",
				startDate: "2026-11-08",
				endDate: "2026-11-11",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-christmas-2026",
				title: "Christmas & Winter Holidays",
				description: "Winter break & Christmas celebration",
				category: "holiday",
				subCategory: "Winter Break",
				startDate: "2026-12-24",
				endDate: "2026-12-26",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-newyear-2027",
				title: "New Year 2027 Holiday",
				description: "Happy New Year! Academy closed.",
				category: "holiday",
				subCategory: "New Year Holiday",
				startDate: "2027-01-01",
				endDate: "2027-01-01",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-sankranti-2027",
				title: "Makara Sankranti / Pongal",
				description: "Harvest festival holiday",
				category: "holiday",
				subCategory: "Festival Holiday",
				startDate: "2027-01-14",
				endDate: "2027-01-14",
				isAllDay: 1,
				color: "#ef4444",
				location: "All Campuses",
			},
			{
				id: "evt-hol-republic-2027",
				title: "Republic Day",
				description: "National Republic Day Celebration",
				category: "holiday",
				subCategory: "National Holiday",
				startDate: "2027-01-26",
				endDate: "2027-01-26",
				isAllDay: 1,
				color: "#ef4444",
				location: "Main Grounds",
			},
		];

		let inserted = 0;
		for (const ev of defaultEvents) {
			await db
				.insert(calendarEvents)
				.values({
					...ev,
					createdByUserId: user.sub,
				})
				.onConflictDoNothing();
			inserted++;
		}

		return c.json({
			message: `Academic calendar initialized successfully with ${inserted} verified dates.`,
			count: inserted,
		});
	} catch (err: any) {
		return c.json({ error: "Failed to seed default calendar events: " + (err?.message || "Internal error") }, 500);
	}
});

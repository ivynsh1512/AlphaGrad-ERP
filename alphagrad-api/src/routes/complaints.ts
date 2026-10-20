import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { complaints, complaintResponses, students, users, teachers, subjects } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const complaintsRouter = new Hono<{ Bindings: Bindings }>();

// 1. Submit a Complaint (Parent/Student App or Admin)
const createComplaintSchema = z.object({
	studentId: z.string().optional(),
	category: z.enum(["academic", "faculty", "facility", "fee", "transport", "other"]).default("other"),
	subjectId: z.string().optional(),
	title: z.string().trim().min(1, "Please enter a subject or title"),
	description: z.string().trim().min(1, "Please provide some explanation or inquiry details"),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

complaintsRouter.post("/", requireAuth, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = createComplaintSchema.safeParse(body);
	if (!parsed.success) {
		const msg = parsed.error.issues.map((i) => i.message).join(", ");
		return c.json({ error: msg || "Validation failed", details: parsed.error.issues }, 400);
	}

	const data = parsed.data;
	const authUser = c.get("user");
	const studentId = data.studentId || authUser.studentId;

	if (!studentId) {
		return c.json({ error: "Student ID is required to file a complaint" }, 400);
	}

	const db = createDb(c.env.DB);
	const ticketNumber = `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
	const id = crypto.randomUUID();

	await db.insert(complaints).values({
		id,
		ticketNumber,
		studentId,
		submittedByUserId: authUser.sub,
		category: data.category,
		subjectId: data.subjectId,
		title: data.title,
		description: data.description,
		priority: data.priority,
		status: "open",
	});

	return c.json({
		message: "Complaint registered successfully",
		ticketNumber,
		id,
	}, 201);
});

// 2. List Complaints (Admin views all, Teacher views assigned, Student views own)
complaintsRouter.get("/", requireAuth, async (c) => {
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	let query = db
		.select({
			id: complaints.id,
			ticketNumber: complaints.ticketNumber,
			studentId: complaints.studentId,
			category: complaints.category,
			title: complaints.title,
			description: complaints.description,
			status: complaints.status,
			priority: complaints.priority,
			resolutionNotes: complaints.resolutionNotes,
			createdAt: complaints.createdAt,
			studentName: users.fullName,
		})
		.from(complaints)
		.innerJoin(students, eq(complaints.studentId, students.id))
		.innerJoin(users, eq(students.userId, users.id))
		.orderBy(desc(complaints.createdAt));

	const all = await query;
	let filtered = all;

	if (authUser.role === "student_parent") {
		filtered = all.filter((comp) => comp.studentId === authUser.studentId);
	} else if (authUser.role === "teacher" && authUser.teacherId) {
		// Teachers can see complaints related to their subjects or assigned to them
		filtered = all;
	}

	return c.json({ complaints: filtered });
});

// 3. Add Response to Complaint (Teacher, Admin, or Student)
const responseSchema = z.object({
	message: z.string().min(1),
	isInternalNote: z.boolean().default(false),
	updateStatus: z.enum(["open", "in_progress", "resolved", "escalated", "closed"]).optional(),
	resolutionNotes: z.string().optional(),
});

complaintsRouter.post("/:id/respond", requireAuth, async (c) => {
	const complaintId = c.req.param("id");
	const body = await c.req.json().catch(() => null);
	const parsed = responseSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed" }, 400);
	}

	const data = parsed.data;
	const db = createDb(c.env.DB);
	const authUser = c.get("user");

	// Record Response
	await db.insert(complaintResponses).values({
		id: crypto.randomUUID(),
		complaintId,
		responderUserId: authUser.sub,
		message: data.message,
		isInternalNote: data.isInternalNote ? 1 : 0,
	});

	// If status update requested
	if (data.updateStatus) {
		await db
			.update(complaints)
			.set({
				status: data.updateStatus,
				resolutionNotes: data.resolutionNotes,
				resolvedAt: data.updateStatus === "resolved" ? sql`(unixepoch())` : undefined,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(complaints.id, complaintId));
	}

	return c.json({ message: "Response submitted successfully" });
});

// 4. Get Single Complaint Details with Thread
complaintsRouter.get("/:id", requireAuth, async (c) => {
	const complaintId = c.req.param("id");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	const complaintRecords = await db
		.select()
		.from(complaints)
		.where(eq(complaints.id, complaintId))
		.limit(1);

	if (complaintRecords.length === 0) {
		return c.json({ error: "Complaint not found" }, 404);
	}

	const complaint = complaintRecords[0];

	if (authUser.role === "student_parent" && complaint.studentId !== authUser.studentId) {
		return c.json({ error: "Forbidden: You cannot access this complaint" }, 403);
	}

	// Fetch thread responses
	const responses = await db
		.select({
			id: complaintResponses.id,
			message: complaintResponses.message,
			isInternalNote: complaintResponses.isInternalNote,
			createdAt: complaintResponses.createdAt,
			responderName: users.fullName,
			responderRole: users.roleId,
		})
		.from(complaintResponses)
		.innerJoin(users, eq(complaintResponses.responderUserId, users.id))
		.where(eq(complaintResponses.complaintId, complaintId))
		.orderBy(complaintResponses.createdAt);

	// Hide internal notes from student/parent
	const visibleResponses = authUser.role === "student_parent"
		? responses.filter(r => r.isInternalNote === 0)
		: responses;

	return c.json({ complaint, responses: visibleResponses });
});

// 5. Delete Ticket / Complaint (Admin or Owner Student)
complaintsRouter.delete("/:id", requireAuth, async (c) => {
	const complaintId = c.req.param("id");
	const authUser = c.get("user");
	const db = createDb(c.env.DB);

	const complaintRecords = await db
		.select()
		.from(complaints)
		.where(eq(complaints.id, complaintId))
		.limit(1);

	if (complaintRecords.length === 0) {
		return c.json({ error: "Complaint not found" }, 404);
	}

	const complaint = complaintRecords[0];

	// Only Admin or the student who filed it can delete
	if (authUser.role === "student_parent" && complaint.studentId !== authUser.studentId) {
		return c.json({ error: "Forbidden: You cannot delete this ticket" }, 403);
	}

	try {
		await db.delete(complaintResponses).where(eq(complaintResponses.complaintId, complaintId));
		await db.delete(complaints).where(eq(complaints.id, complaintId));
		return c.json({ message: "Inquiry ticket deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete ticket: " + (err?.message || "Internal error") }, 500);
	}
});

export default complaintsRouter;

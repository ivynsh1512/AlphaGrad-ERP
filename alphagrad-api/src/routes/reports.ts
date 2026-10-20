import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import { students, teachers, batches, studentFeeObligations, attendanceRecords, complaints } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const reportsRouter = new Hono<{ Bindings: Bindings }>();

// 1. Admin Overview Metrics Dashboard
reportsRouter.get("/overview", requireAuth, requireAdmin, async (c) => {
	const db = createDb(c.env.DB);

	// Student count
	const studentCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(students)
		.where(eq(students.status, "active"));
	const totalStudents = studentCountRes[0]?.count || 0;

	// Teacher count
	const teacherCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(teachers)
		.where(eq(teachers.status, "active"));
	const totalTeachers = teacherCountRes[0]?.count || 0;

	// Batch count
	const batchCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(batches);
	const totalBatches = batchCountRes[0]?.count || 0;

	// Fee calculations
	const feeObligations = await db
		.select({
			netAmount: studentFeeObligations.netAmountInCents,
			paidAmount: studentFeeObligations.paidAmountInCents,
		})
		.from(studentFeeObligations);

	let totalFeeCents = 0;
	let totalCollectedCents = 0;
	for (const f of feeObligations) {
		totalFeeCents += f.netAmount;
		totalCollectedCents += f.paidAmount;
	}
	const totalOutstandingCents = Math.max(0, totalFeeCents - totalCollectedCents);

	// Attendance percentage
	const attRecords = await db
		.select({
			status: attendanceRecords.status,
		})
		.from(attendanceRecords);

	const totalAtt = attRecords.length;
	const presentAtt = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
	const attendancePercentage = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

	// Open complaints count
	const openComplaintsRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(complaints)
		.where(eq(complaints.status, "open"));
	const openComplaints = openComplaintsRes[0]?.count || 0;

	return c.json({
		overview: {
			totalStudents,
			totalTeachers,
			totalBatches,
			financials: {
				totalFeeObligationsInRupees: totalFeeCents / 100,
				totalFeeCollectedInRupees: totalCollectedCents / 100,
				totalOutstandingInRupees: totalOutstandingCents / 100,
				collectionRatePercentage: totalFeeCents > 0 ? Math.round((totalCollectedCents / totalFeeCents) * 100) : 0,
			},
			attendance: {
				totalRecordsLogged: totalAtt,
				averageAttendancePercentage: attendancePercentage,
			},
			operations: {
				openComplaints,
			},
		},
	});
});

export default reportsRouter;

import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { Bindings } from "../index";
import { createDb } from "../db";
import {
	expenditures,
	salaryDisbursements,
	teachers,
	users,
	receipts,
	studentFeeObligations,
	students,
} from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const accountingRouter = new Hono<{ Bindings: Bindings }>();

// Helper: Ensure tables exist if SQLite D1 schema wasn't migrated
async function ensureAccountingTables(db: ReturnType<typeof createDb>) {
	try {
		await db.run(sql`
			CREATE TABLE IF NOT EXISTS expenditures (
				id TEXT PRIMARY KEY,
				category TEXT NOT NULL,
				title TEXT NOT NULL,
				amount_in_rupees INTEGER NOT NULL,
				expense_date TEXT NOT NULL,
				payment_mode TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
				paid_to TEXT,
				receipt_ref TEXT,
				notes TEXT,
				recorded_by_user_id TEXT,
				created_at INTEGER NOT NULL DEFAULT (unixepoch()),
				updated_at INTEGER NOT NULL DEFAULT (unixepoch())
			);
		`);
		await db.run(sql`
			CREATE TABLE IF NOT EXISTS salary_disbursements (
				id TEXT PRIMARY KEY,
				teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
				month TEXT NOT NULL,
				amount_in_rupees INTEGER NOT NULL,
				payment_date TEXT NOT NULL,
				payment_mode TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
				transaction_ref TEXT,
				status TEXT NOT NULL DEFAULT 'paid',
				notes TEXT,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			);
		`);
		// Ensure monthly_salary_in_rupees column on teachers
		try {
			await db.run(sql`ALTER TABLE teachers ADD COLUMN monthly_salary_in_rupees INTEGER DEFAULT 0;`);
		} catch (e) {
			// Column already exists
		}
	} catch (e) {
		console.error("Error creating accounting tables:", e);
	}
}

// 1. Financial Overview & Analytics with Multi-Range Filter
// Period options: 'this_month' | '3_months' | '6_months' | '1_year' | 'custom'
accountingRouter.get("/overview", requireAuth, requireAdmin, async (c) => {
	try {
		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);

		const period = c.req.query("period") || "this_month";
		const customStart = c.req.query("startDate");
		const customEnd = c.req.query("endDate");

		const now = new Date();
		let startDateStr = "";
		let endDateStr = now.toISOString().split("T")[0]; // today

		if (period === "this_month") {
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			startDateStr = startOfMonth.toISOString().split("T")[0];
		} else if (period === "3_months") {
			const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
			startDateStr = d.toISOString().split("T")[0];
		} else if (period === "6_months") {
			const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
			startDateStr = d.toISOString().split("T")[0];
		} else if (period === "1_year") {
			const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
			startDateStr = d.toISOString().split("T")[0];
		} else if (period === "custom" && customStart) {
			startDateStr = customStart;
			if (customEnd) endDateStr = customEnd;
		} else {
			// Default fallback: this month
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			startDateStr = startOfMonth.toISOString().split("T")[0];
		}

		// A. Total Inflow: Collected Fees
		// Convert receipt generatedAt to date or compare via SQL
		const startTimestamp = Math.floor(new Date(startDateStr).getTime() / 1000);
		const endTimestamp = Math.floor(new Date(endDateStr + "T23:59:59").getTime() / 1000);

		// Receipts in period
		const receiptsInPeriod = await db
			.select({
				id: receipts.id,
				receiptNumber: receipts.receiptNumber,
				amountPaidInCents: receipts.amountPaidInCents,
				paymentMode: receipts.paymentMode,
				remarks: receipts.remarks,
				generatedAt: receipts.generatedAt,
				studentId: receipts.studentId,
				fullName: users.fullName,
			})
			.from(receipts)
			.innerJoin(students, eq(receipts.studentId, students.id))
			.innerJoin(users, eq(students.userId, users.id))
			.where(and(gte(receipts.generatedAt, startTimestamp), lte(receipts.generatedAt, endTimestamp)))
			.orderBy(desc(receipts.generatedAt));

		const totalCollectedInRupees = receiptsInPeriod.reduce(
			(sum, r) => sum + Math.round((r.amountPaidInCents || 0) / 100),
			0
		);

		// All-time fee collected
		const allReceipts = await db.select({ amountPaidInCents: receipts.amountPaidInCents }).from(receipts);
		const allTimeCollectedInRupees = allReceipts.reduce(
			(sum, r) => sum + Math.round((r.amountPaidInCents || 0) / 100),
			0
		);

		// B. Pending Fee Receivables (Overall & Overdue)
		const allObligations = await db
			.select({
				id: studentFeeObligations.id,
				studentId: studentFeeObligations.studentId,
				dueDate: studentFeeObligations.dueDate,
				netAmountInCents: studentFeeObligations.netAmountInCents,
				paidAmountInCents: studentFeeObligations.paidAmountInCents,
				status: studentFeeObligations.status,
			})
			.from(studentFeeObligations);

		let totalPendingInRupees = 0;
		let totalOverdueInRupees = 0;
		const todayStr = new Date().toISOString().split("T")[0];

		for (const ob of allObligations) {
			const remainingCents = Math.max(0, ob.netAmountInCents - ob.paidAmountInCents);
			const remainingRupees = Math.round(remainingCents / 100);
			if (ob.status !== "paid" && remainingRupees > 0) {
				totalPendingInRupees += remainingRupees;
				if (ob.dueDate < todayStr) {
					totalOverdueInRupees += remainingRupees;
				}
			}
		}

		// C. Staff Payroll / Salaries
		// 1. Monthly committed salary of all active teachers
		const activeTeachers = await db
			.select({
				id: teachers.id,
				fullName: users.fullName,
				designation: teachers.designation,
				monthlySalaryInRupees: teachers.monthlySalaryInRupees,
				status: teachers.status,
			})
			.from(teachers)
			.innerJoin(users, eq(teachers.userId, users.id))
			.where(eq(teachers.status, "active"));

		const monthlyStaffPayrollCommitment = activeTeachers.reduce(
			(sum, t) => sum + (t.monthlySalaryInRupees || 0),
			0
		);

		// 2. Disbursed salaries in selected period
		const disbursedSalaries = await db
			.select({
				id: salaryDisbursements.id,
				teacherId: salaryDisbursements.teacherId,
				month: salaryDisbursements.month,
				amountInRupees: salaryDisbursements.amountInRupees,
				paymentDate: salaryDisbursements.paymentDate,
				paymentMode: salaryDisbursements.paymentMode,
				transactionRef: salaryDisbursements.transactionRef,
				status: salaryDisbursements.status,
				notes: salaryDisbursements.notes,
				teacherName: users.fullName,
				designation: teachers.designation,
			})
			.from(salaryDisbursements)
			.innerJoin(teachers, eq(salaryDisbursements.teacherId, teachers.id))
			.innerJoin(users, eq(teachers.userId, users.id))
			.where(and(gte(salaryDisbursements.paymentDate, startDateStr), lte(salaryDisbursements.paymentDate, endDateStr)))
			.orderBy(desc(salaryDisbursements.paymentDate));

		const totalSalariesPaidInPeriod = disbursedSalaries.reduce(
			(sum, s) => sum + (s.amountInRupees || 0),
			0
		);

		// D. Operating Expenditures in Period
		const expensesInPeriod = await db
			.select()
			.from(expenditures)
			.where(and(gte(expenditures.expenseDate, startDateStr), lte(expenditures.expenseDate, endDateStr)))
			.orderBy(desc(expenditures.expenseDate));

		const totalExpendituresInPeriod = expensesInPeriod.reduce(
			(sum, e) => sum + (e.amountInRupees || 0),
			0
		);

		// Expenses grouped by category
		const expensesByCategory: Record<string, number> = {};
		for (const e of expensesInPeriod) {
			expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amountInRupees;
		}

		// E. Overall Outcome / Profit & Loss Calculation
		// Total Outflow = Staff Salaries Paid + Operating Expenditures
		const totalOutflowInPeriod = totalSalariesPaidInPeriod + totalExpendituresInPeriod;
		const netProfitInPeriod = totalCollectedInRupees - totalOutflowInPeriod;
		const profitMarginPercent = totalCollectedInRupees > 0
			? Math.round((netProfitInPeriod / totalCollectedInRupees) * 100)
			: 0;

		return c.json({
			period: {
				key: period,
				startDate: startDateStr,
				endDate: endDateStr,
			},
			summary: {
				totalCollectedInRupees,
				allTimeCollectedInRupees,
				totalPendingInRupees,
				totalOverdueInRupees,
				monthlyStaffPayrollCommitment,
				totalSalariesPaidInPeriod,
				totalExpendituresInPeriod,
				totalOutflowInPeriod,
				netProfitInPeriod,
				profitMarginPercent,
				isProfitable: netProfitInPeriod >= 0,
			},
			expensesByCategory,
			activeStaffCount: activeTeachers.length,
			recentReceipts: receiptsInPeriod.slice(0, 10),
			recentExpenditures: expensesInPeriod.slice(0, 10),
			recentSalaryDisbursements: disbursedSalaries.slice(0, 10),
		});
	} catch (err: any) {
		return c.json({ error: "Failed to generate financial overview: " + (err?.message || "Internal error") }, 500);
	}
});

// 2. Expenditures CRUD
accountingRouter.get("/expenditures", requireAuth, requireAdmin, async (c) => {
	try {
		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);
		const list = await db.select().from(expenditures).orderBy(desc(expenditures.expenseDate));
		return c.json({ expenditures: list });
	} catch (err: any) {
		return c.json({ error: "Failed to load expenditures: " + (err?.message || "Internal error") }, 500);
	}
});

const expenditureSchema = z.object({
	title: z.string().trim().min(2, "Expense title is required"),
	category: z.string().trim().default("other"),
	amountInRupees: z.coerce.number().positive("Amount must be greater than 0"),
	expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
	paymentMode: z.string().trim().default("BANK_TRANSFER"),
	paidTo: z.string().trim().optional(),
	receiptRef: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

accountingRouter.post("/expenditures", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const parsed = expenditureSchema.safeParse(body);
		if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);

		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);

		const id = `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		await db.insert(expenditures).values({
			id,
			category: parsed.data.category,
			title: parsed.data.title,
			amountInRupees: parsed.data.amountInRupees,
			expenseDate: parsed.data.expenseDate,
			paymentMode: parsed.data.paymentMode,
			paidTo: parsed.data.paidTo || null,
			receiptRef: parsed.data.receiptRef || null,
			notes: parsed.data.notes || null,
			recordedByUserId: c.get("user")?.sub || null,
		});

		return c.json({ message: "Expenditure recorded successfully", id }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to record expenditure: " + (err?.message || "Internal error") }, 500);
	}
});

accountingRouter.delete("/expenditures/:id", requireAuth, requireAdmin, async (c) => {
	try {
		const id = c.req.param("id");
		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);
		await db.delete(expenditures).where(eq(expenditures.id, id));
		return c.json({ message: "Expenditure deleted successfully" });
	} catch (err: any) {
		return c.json({ error: "Failed to delete expenditure: " + (err?.message || "Internal error") }, 500);
	}
});

// 3. Staff Salary Management & Disbursements
accountingRouter.get("/salaries", requireAuth, requireAdmin, async (c) => {
	try {
		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);

		const allTeachers = await db
			.select({
				id: teachers.id,
				userId: teachers.userId,
				employeeId: teachers.employeeId,
				designation: teachers.designation,
				specialization: teachers.specialization,
				monthlySalaryInRupees: teachers.monthlySalaryInRupees,
				fullName: users.fullName,
				username: users.username,
				email: users.email,
				phone: users.phone,
				status: teachers.status,
			})
			.from(teachers)
			.innerJoin(users, eq(teachers.userId, users.id))
			.orderBy(desc(teachers.monthlySalaryInRupees));

		const disbursements = await db
			.select({
				id: salaryDisbursements.id,
				teacherId: salaryDisbursements.teacherId,
				month: salaryDisbursements.month,
				amountInRupees: salaryDisbursements.amountInRupees,
				paymentDate: salaryDisbursements.paymentDate,
				paymentMode: salaryDisbursements.paymentMode,
				transactionRef: salaryDisbursements.transactionRef,
				status: salaryDisbursements.status,
				notes: salaryDisbursements.notes,
				createdAt: salaryDisbursements.createdAt,
				teacherName: users.fullName,
				employeeId: teachers.employeeId,
			})
			.from(salaryDisbursements)
			.innerJoin(teachers, eq(salaryDisbursements.teacherId, teachers.id))
			.innerJoin(users, eq(teachers.userId, users.id))
			.orderBy(desc(salaryDisbursements.paymentDate));

		return c.json({
			teachers: allTeachers,
			disbursements,
			monthlyPayrollTotal: allTeachers.reduce((sum, t) => sum + (t.monthlySalaryInRupees || 0), 0),
		});
	} catch (err: any) {
		return c.json({ error: "Failed to load salary details: " + (err?.message || "Internal error") }, 500);
	}
});

const disburseSchema = z.object({
	teacherId: z.string(),
	month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
	amountInRupees: z.coerce.number().positive(),
	paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
	paymentMode: z.string().trim().default("BANK_TRANSFER"),
	transactionRef: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

accountingRouter.post("/salaries/disburse", requireAuth, requireAdmin, async (c) => {
	try {
		const body = await c.req.json().catch(() => null);
		const parsed = disburseSchema.safeParse(body);
		if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);

		const db = createDb(c.env.DB);
		await ensureAccountingTables(db);

		const id = `sal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		await db.insert(salaryDisbursements).values({
			id,
			teacherId: parsed.data.teacherId,
			month: parsed.data.month,
			amountInRupees: parsed.data.amountInRupees,
			paymentDate: parsed.data.paymentDate,
			paymentMode: parsed.data.paymentMode,
			transactionRef: parsed.data.transactionRef || null,
			status: "paid",
			notes: parsed.data.notes || null,
		});

		return c.json({ message: "Salary disbursement recorded successfully", id }, 201);
	} catch (err: any) {
		return c.json({ error: "Failed to record disbursement: " + (err?.message || "Internal error") }, 500);
	}
});

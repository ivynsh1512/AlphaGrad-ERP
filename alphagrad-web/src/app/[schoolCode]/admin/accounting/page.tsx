"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Receipt,
	Users,
	AlertCircle,
	CheckCircle2,
	Plus,
	Search,
	Trash2,
	Edit2,
	Calendar,
	Filter,
	ArrowUpRight,
	ArrowDownRight,
	Wallet,
	Building2,
	CreditCard,
	PieChart,
	FileText,
	ChevronRight,
	X,
	RefreshCw
} from "lucide-react";

interface FinancialSummary {
	totalCollectedInRupees: number;
	allTimeCollectedInRupees: number;
	totalPendingInRupees: number;
	totalOverdueInRupees: number;
	monthlyStaffPayrollCommitment: number;
	totalSalariesPaidInPeriod: number;
	totalExpendituresInPeriod: number;
	totalOutflowInPeriod: number;
	netProfitInPeriod: number;
	profitMarginPercent: number;
	isProfitable: boolean;
}

interface PeriodInfo {
	key: string;
	startDate: string;
	endDate: string;
}

interface ExpenditureItem {
	id: string;
	category: string;
	title: string;
	amountInRupees: number;
	expenseDate: string;
	paymentMode: string;
	paidTo: string | null;
	receiptRef: string | null;
	notes: string | null;
	createdAt: number;
}

interface TeacherSalaryItem {
	id: string;
	userId: string;
	employeeId: string;
	designation: string;
	specialization: string | null;
	monthlySalaryInRupees: number;
	fullName: string;
	username: string;
	email: string;
	phone: string | null;
	status: string;
}

interface SalaryDisbursementItem {
	id: string;
	teacherId: string;
	month: string;
	amountInRupees: number;
	paymentDate: string;
	paymentMode: string;
	transactionRef: string | null;
	status: string;
	notes: string | null;
	createdAt: number;
	teacherName?: string;
	employeeId?: string;
}

const EXPENSE_CATEGORIES = [
	{ id: "RENT", label: "Premises & Rent", color: "bg-blue-50 text-blue-700 border-blue-200" },
	{ id: "UTILITIES", label: "Electricity & Utilities", color: "bg-amber-50 text-amber-700 border-amber-200" },
	{ id: "MARKETING", label: "Marketing & Student Ads", color: "bg-purple-50 text-purple-700 border-purple-200" },
	{ id: "SOFTWARE", label: "Software & IT Infrastructure", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
	{ id: "MATERIALS", label: "Books & Study Material", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
	{ id: "INFRASTRUCTURE", label: "Furniture & Lab Equipment", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
	{ id: "MAINTENANCE", label: "Cleaning & Maintenance", color: "bg-rose-50 text-rose-700 border-rose-200" },
	{ id: "WELFARE", label: "Staff Welfare & Refreshments", color: "bg-orange-50 text-orange-700 border-orange-200" },
	{ id: "OTHER", label: "Miscellaneous & Taxes", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

export default function AdminAccountingPage() {
	// Filter state
	const [period, setPeriod] = useState<string>("this_month");
	const [customStart, setCustomStart] = useState<string>("");
	const [customEnd, setCustomEnd] = useState<string>("");

	// Data state
	const [summary, setSummary] = useState<FinancialSummary | null>(null);
	const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
	const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
	const [activeStaffCount, setActiveStaffCount] = useState<number>(0);
	const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

	// Detailed tabs state
	const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "salaries" | "receipts">("overview");
	const [expendituresList, setExpendituresList] = useState<ExpenditureItem[]>([]);
	const [teachersList, setTeachersList] = useState<TeacherSalaryItem[]>([]);
	const [disbursementsList, setDisbursementsList] = useState<SalaryDisbursementItem[]>([]);

	// Search & category filter for expenses tab
	const [expenseSearch, setExpenseSearch] = useState("");
	const [expenseCatFilter, setExpenseCatFilter] = useState("all");

	// Loading & notification state
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Modals
	const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
	const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
	const [isEditSalaryModalOpen, setIsEditSalaryModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Form states
	const [expenseForm, setExpenseForm] = useState({
		title: "",
		category: "RENT",
		amountInRupees: "",
		expenseDate: new Date().toISOString().split("T")[0],
		paymentMode: "BANK_TRANSFER",
		paidTo: "",
		receiptRef: "",
		notes: "",
	});

	const [disburseForm, setDisburseForm] = useState({
		teacherId: "",
		month: new Date().toISOString().slice(0, 7), // YYYY-MM
		amountInRupees: "",
		paymentDate: new Date().toISOString().split("T")[0],
		paymentMode: "BANK_TRANSFER",
		transactionRef: "",
		notes: "",
	});

	const [editSalaryTeacher, setEditSalaryTeacher] = useState<TeacherSalaryItem | null>(null);
	const [editSalaryAmount, setEditSalaryAmount] = useState<string>("");

	// Initial load and period change
	useEffect(() => {
		loadFinancialData();
	}, [period]);

	async function loadFinancialData() {
		setLoading(true);
		setError(null);
		try {
			const params: any = { period };
			if (period === "custom") {
				if (customStart) params.startDate = customStart;
				if (customEnd) params.endDate = customEnd;
			}

			const [overviewRes, expRes, salRes] = await Promise.all([
				api.accounting.overview(params),
				api.accounting.expenditures().catch(() => ({ expenditures: [] })),
				api.accounting.salaries().catch(() => ({ teachers: [], disbursements: [], monthlyPayrollTotal: 0 })),
			]);

			setSummary(overviewRes.summary);
			setPeriodInfo(overviewRes.period);
			setExpensesByCategory(overviewRes.expensesByCategory || {});
			setActiveStaffCount(overviewRes.activeStaffCount || 0);
			setRecentReceipts(overviewRes.recentReceipts || []);

			setExpendituresList(expRes.expenditures || []);
			setTeachersList(salRes.teachers || []);
			setDisbursementsList(salRes.disbursements || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load financial records");
		} finally {
			setLoading(false);
		}
	}

	const handleApplyCustomPeriod = (e: React.FormEvent) => {
		e.preventDefault();
		if (!customStart || !customEnd) {
			setError("Please specify both Start Date and End Date for custom period");
			return;
		}
		loadFinancialData();
	};

	// 1. Create Operating Expense
	const handleCreateExpense = async (e: React.FormEvent) => {
		e.preventDefault();
		const amount = parseFloat(expenseForm.amountInRupees);
		if (isNaN(amount) || amount <= 0) {
			setError("Please enter a valid expense amount");
			return;
		}
		setSubmitting(true);
		try {
			await api.accounting.createExpenditure({
				title: expenseForm.title.trim(),
				category: expenseForm.category,
				amountInRupees: Math.round(amount),
				expenseDate: expenseForm.expenseDate,
				paymentMode: expenseForm.paymentMode,
				paidTo: expenseForm.paidTo.trim() || undefined,
				receiptRef: expenseForm.receiptRef.trim() || undefined,
				notes: expenseForm.notes.trim() || undefined,
			});
			setIsExpenseModalOpen(false);
			setSuccessMsg("Operating expenditure recorded successfully");
			setExpenseForm({
				title: "",
				category: "RENT",
				amountInRupees: "",
				expenseDate: new Date().toISOString().split("T")[0],
				paymentMode: "BANK_TRANSFER",
				paidTo: "",
				receiptRef: "",
				notes: "",
			});
			loadFinancialData();
		} catch (err: any) {
			setError(err?.message || "Failed to log expenditure");
		} finally {
			setSubmitting(false);
		}
	};

	// 2. Delete Operating Expense
	const handleDeleteExpense = async (id: string) => {
		if (!confirm("Are you sure you want to delete this expenditure entry?")) return;
		try {
			await api.accounting.deleteExpenditure(id);
			setSuccessMsg("Expenditure entry removed");
			loadFinancialData();
		} catch (err: any) {
			setError(err?.message || "Failed to delete expenditure");
		}
	};

	// 3. Open Disburse Modal with optional selected teacher
	const handleOpenDisburseModal = (teacher?: TeacherSalaryItem) => {
		const targetTeacher = teacher || teachersList[0];
		if (!targetTeacher) {
			setError("No active faculty found to disburse salary");
			return;
		}
		setDisburseForm({
			teacherId: targetTeacher.id,
			month: new Date().toISOString().slice(0, 7),
			amountInRupees: targetTeacher.monthlySalaryInRupees ? String(targetTeacher.monthlySalaryInRupees) : "",
			paymentDate: new Date().toISOString().split("T")[0],
			paymentMode: "BANK_TRANSFER",
			transactionRef: "",
			notes: "",
		});
		setIsDisburseModalOpen(true);
	};

	// 4. Submit Salary Disbursement
	const handleDisburseSalary = async (e: React.FormEvent) => {
		e.preventDefault();
		const amount = parseFloat(disburseForm.amountInRupees);
		if (!disburseForm.teacherId) {
			setError("Please choose a faculty member");
			return;
		}
		if (isNaN(amount) || amount <= 0) {
			setError("Please enter a valid salary amount");
			return;
		}
		setSubmitting(true);
		try {
			await api.accounting.disburseSalary({
				teacherId: disburseForm.teacherId,
				month: disburseForm.month,
				amountInRupees: Math.round(amount),
				paymentDate: disburseForm.paymentDate,
				paymentMode: disburseForm.paymentMode,
				transactionRef: disburseForm.transactionRef.trim() || undefined,
				notes: disburseForm.notes.trim() || undefined,
			});
			setIsDisburseModalOpen(false);
			setSuccessMsg("Salary disbursement logged successfully");
			loadFinancialData();
		} catch (err: any) {
			setError(err?.message || "Failed to record salary disbursement");
		} finally {
			setSubmitting(false);
		}
	};

	// 5. Open Quick Edit Salary Modal
	const handleOpenEditSalary = (teacher: TeacherSalaryItem) => {
		setEditSalaryTeacher(teacher);
		setEditSalaryAmount(String(teacher.monthlySalaryInRupees || 0));
		setIsEditSalaryModalOpen(true);
	};

	// 6. Save Updated Teacher Monthly Salary
	const handleSaveUpdatedSalary = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editSalaryTeacher) return;
		const amount = parseFloat(editSalaryAmount);
		if (isNaN(amount) || amount < 0) {
			setError("Please enter a valid non-negative monthly salary");
			return;
		}
		setSubmitting(true);
		try {
			await api.accounting.updateTeacherSalary(editSalaryTeacher.id, {
				monthlySalaryInRupees: Math.round(amount),
			});
			setIsEditSalaryModalOpen(false);
			setSuccessMsg(`Monthly salary updated for ${editSalaryTeacher.fullName}`);
			loadFinancialData();
		} catch (err: any) {
			setError(err?.message || "Failed to update faculty salary");
		} finally {
			setSubmitting(false);
		}
	};

	// Filtered expenditures
	const filteredExpenses = expendituresList.filter((item) => {
		const matchCat = expenseCatFilter === "all" || item.category === expenseCatFilter;
		const matchSearch =
			!expenseSearch ||
			item.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
			(item.paidTo && item.paidTo.toLowerCase().includes(expenseSearch.toLowerCase())) ||
			(item.receiptRef && item.receiptRef.toLowerCase().includes(expenseSearch.toLowerCase()));
		return matchCat && matchSearch;
	});

	// Format helpers
	const formatRupees = (val: number | undefined | null) => {
		return `₹${(val || 0).toLocaleString("en-IN")}`;
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-16">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
							Financial Intelligence
						</span>
						<span className="text-xs text-slate-400">• P&L · Cash Flow · Payroll · Fees</span>
					</div>
					<h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
						Accounts & Financial Dashboard
					</h1>
					<p className="text-xs text-slate-500">
						Real-time revenue inflows, operating expenditures, faculty payroll disbursements, and net outcome.
					</p>
				</div>

				{/* Quick Action Buttons */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsExpenseModalOpen(true)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs transition"
					>
						<Plus className="w-3.5 h-3.5 text-rose-500" />
						<span>Log Expense</span>
					</button>

					<button
						onClick={() => handleOpenDisburseModal()}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
					>
						<DollarSign className="w-3.5 h-3.5 text-emerald-400" />
						<span>Disburse Salary</span>
					</button>
				</div>
			</div>

			{/* Time Range Filter Bar */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
					<span className="text-xs font-bold text-slate-400 flex items-center gap-1 px-2 shrink-0">
						<Calendar className="w-3.5 h-3.5 text-slate-500" />
						Period:
					</span>
					{[
						{ key: "this_month", label: "This Month" },
						{ key: "3_months", label: "3 Months" },
						{ key: "6_months", label: "6 Months" },
						{ key: "1_year", label: "1 Year" },
						{ key: "custom", label: "Custom Range" },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setPeriod(tab.key)}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
								period === tab.key
									? "bg-slate-900 text-white shadow-xs"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Custom Range Inputs */}
				{period === "custom" ? (
					<form onSubmit={handleApplyCustomPeriod} className="flex items-center gap-2 flex-wrap">
						<input
							type="date"
							value={customStart}
							onChange={(e) => setCustomStart(e.target.value)}
							className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
							required
						/>
						<span className="text-xs text-slate-400">to</span>
						<input
							type="date"
							value={customEnd}
							onChange={(e) => setCustomEnd(e.target.value)}
							className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
							required
						/>
						<button
							type="submit"
							className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
						>
							Apply
						</button>
					</form>
				) : (
					periodInfo && (
						<div className="text-xs text-slate-500 font-medium px-2">
							Active Window:{" "}
							<span className="font-bold text-slate-800">
								{periodInfo.startDate} to {periodInfo.endDate}
							</span>
						</div>
					)
				)}
			</div>

			{/* Alerts */}
			{error && (
				<div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
						<span>{error}</span>
					</div>
					<button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}
			{successMsg && (
				<div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
						<span>{successMsg}</span>
					</div>
					<button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Hero KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* 1. Net Operating Profit / Outcome */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3 relative overflow-hidden">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
							Net Outcome (P&L)
						</span>
						<span
							className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
								(summary?.netProfitInPeriod || 0) >= 0
									? "bg-emerald-50 text-emerald-700 border border-emerald-200"
									: "bg-rose-50 text-rose-700 border border-rose-200"
							}`}
						>
							{(summary?.netProfitInPeriod || 0) >= 0 ? (
								<>
									<TrendingUp className="w-3 h-3" />
									{summary?.profitMarginPercent || 0}% Margin
								</>
							) : (
								<>
									<TrendingDown className="w-3 h-3" />
									Deficit
								</>
							)}
						</span>
					</div>
					<div>
						<div
							className={`text-2xl font-black tracking-tight ${
								(summary?.netProfitInPeriod || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
							}`}
						>
							{formatRupees(summary?.netProfitInPeriod)}
						</div>
						<p className="text-[11px] text-slate-500 mt-1">
							{(summary?.netProfitInPeriod || 0) >= 0 ? "Net operating profit" : "Operating deficit"} in selected window
						</p>
					</div>
					<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
						<span>Inflows - Outflows</span>
						<span className="font-semibold text-slate-600">
							{formatRupees(summary?.totalCollectedInRupees)} - {formatRupees(summary?.totalOutflowInPeriod)}
						</span>
					</div>
				</div>

				{/* 2. Total Collected Fees (Inflow) */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
							Fee Collections (Inflow)
						</span>
						<div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
							<ArrowUpRight className="w-4 h-4" />
						</div>
					</div>
					<div>
						<div className="text-2xl font-black text-slate-900 tracking-tight">
							{formatRupees(summary?.totalCollectedInRupees)}
						</div>
						<p className="text-[11px] text-slate-500 mt-1">
							Collected within current window
						</p>
					</div>
					<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
						<span>All-Time Collections</span>
						<span className="font-bold text-slate-800">
							{formatRupees(summary?.allTimeCollectedInRupees)}
						</span>
					</div>
				</div>

				{/* 3. Pending Fees (Receivables) */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
							Pending Fees
						</span>
						<div className="p-2 rounded-xl bg-amber-50 text-amber-600">
							<AlertCircle className="w-4 h-4" />
						</div>
					</div>
					<div>
						<div className="text-2xl font-black text-amber-600 tracking-tight">
							{formatRupees(summary?.totalPendingInRupees)}
						</div>
						<p className="text-[11px] text-slate-500 mt-1">
							Total outstanding student fees
						</p>
					</div>
					<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
						<span>Overdue Past Due Date</span>
						<span className="font-bold text-rose-600">
							{formatRupees(summary?.totalOverdueInRupees)}
						</span>
					</div>
				</div>

				{/* 4. Total Outflows (Salaries + Expenses) */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
							Total Outflows
						</span>
						<div className="p-2 rounded-xl bg-rose-50 text-rose-600">
							<ArrowDownRight className="w-4 h-4" />
						</div>
					</div>
					<div>
						<div className="text-2xl font-black text-slate-900 tracking-tight">
							{formatRupees(summary?.totalOutflowInPeriod)}
						</div>
						<p className="text-[11px] text-slate-500 mt-1">
							Salaries Paid + Operating Expenses
						</p>
					</div>
					<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
						<span>Salaries: {formatRupees(summary?.totalSalariesPaidInPeriod)}</span>
						<span>Expenses: {formatRupees(summary?.totalExpendituresInPeriod)}</span>
					</div>
				</div>
			</div>

			{/* Second Row: Staff Payroll Commitment Indicator */}
			<div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
						<Users className="w-6 h-6 text-indigo-300" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
								Faculty Payroll Commitment
							</span>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white">
								{activeStaffCount} Active Staff
							</span>
						</div>
						<div className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
							{formatRupees(summary?.monthlyStaffPayrollCommitment)} <span className="text-xs font-normal text-indigo-200">/ month</span>
						</div>
						<p className="text-xs text-indigo-200/80 mt-0.5">
							Sum of base monthly salaries committed to all registered teaching & academic staff.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={() => setActiveTab("salaries")}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
					>
						View Staff Payroll
					</button>
					<button
						onClick={() => handleOpenDisburseModal()}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-xs transition"
					>
						+ Pay Salary
					</button>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="flex items-center gap-2 border-b border-slate-200 pb-2">
				{[
					{ id: "overview", label: "P&L & Category Breakdown", icon: PieChart },
					{ id: "expenses", label: `Operating Expenditures (${expendituresList.length})`, icon: Receipt },
					{ id: "salaries", label: `Staff Payroll & Salaries (${teachersList.length})`, icon: Users },
					{ id: "receipts", label: `Recent Fee Receipts (${recentReceipts.length})`, icon: CreditCard },
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
								isActive
									? "bg-slate-900 text-white shadow-xs"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							<Icon className="w-3.5 h-3.5" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* TAB 1: P&L Overview & Category Breakdown */}
			{activeTab === "overview" && (
				<div className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Inflow vs Outflow Ratio Card */}
						<div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
							<div>
								<h3 className="text-sm font-black text-slate-900">Cash Flow Balance</h3>
								<p className="text-xs text-slate-500">Inflow vs total outflows in period</p>
							</div>

							<div className="space-y-3">
								<div>
									<div className="flex items-center justify-between text-xs mb-1">
										<span className="font-bold text-emerald-700 flex items-center gap-1">
											<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
											Fee Inflows
										</span>
										<span className="font-black text-slate-900">
											{formatRupees(summary?.totalCollectedInRupees)}
										</span>
									</div>
									<div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
										<div
											className="h-full bg-emerald-500 rounded-full"
											style={{
												width: `${Math.min(
													100,
													Math.max(
														5,
														(summary?.totalCollectedInRupees || 0) + (summary?.totalOutflowInPeriod || 0) > 0
															? Math.round(
																	((summary?.totalCollectedInRupees || 0) /
																		((summary?.totalCollectedInRupees || 0) + (summary?.totalOutflowInPeriod || 0))) *
																		100
															  )
															: 50
													)
												)}%`,
											}}
										></div>
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between text-xs mb-1">
										<span className="font-bold text-rose-700 flex items-center gap-1">
											<span className="w-2 h-2 rounded-full bg-rose-500"></span>
											Total Outflows
										</span>
										<span className="font-black text-slate-900">
											{formatRupees(summary?.totalOutflowInPeriod)}
										</span>
									</div>
									<div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
										<div
											className="h-full bg-rose-500 rounded-full"
											style={{
												width: `${Math.min(
													100,
													Math.max(
														5,
														(summary?.totalCollectedInRupees || 0) + (summary?.totalOutflowInPeriod || 0) > 0
															? Math.round(
																	((summary?.totalOutflowInPeriod || 0) /
																		((summary?.totalCollectedInRupees || 0) + (summary?.totalOutflowInPeriod || 0))) *
																		100
															  )
															: 50
													)
												)}%`,
											}}
										></div>
									</div>
								</div>
							</div>

							<div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2 text-xs">
								<div className="flex items-center justify-between text-slate-600">
									<span>Operating Profit Margin:</span>
									<span className={`font-black ${(summary?.netProfitInPeriod || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
										{summary?.profitMarginPercent || 0}%
									</span>
								</div>
								<div className="flex items-center justify-between text-slate-600">
									<span>Monthly Salary Commitment:</span>
									<span className="font-bold text-slate-900">
										{formatRupees(summary?.monthlyStaffPayrollCommitment)}
									</span>
								</div>
								<div className="flex items-center justify-between text-slate-600">
									<span>Salaries Disbursed in Period:</span>
									<span className="font-bold text-indigo-700">
										{formatRupees(summary?.totalSalariesPaidInPeriod)}
									</span>
								</div>
								<div className="flex items-center justify-between text-slate-600">
									<span>Operating Expenses in Period:</span>
									<span className="font-bold text-rose-700">
										{formatRupees(summary?.totalExpendituresInPeriod)}
									</span>
								</div>
							</div>
						</div>

						{/* Operating Expenses by Category */}
						<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-black text-slate-900">Expenses by Operational Category</h3>
									<p className="text-xs text-slate-500">Distribution of expenditures in selected period</p>
								</div>
								<button
									onClick={() => setIsExpenseModalOpen(true)}
									className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
								>
									<Plus className="w-3.5 h-3.5" />
									Add Expense
								</button>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
								{EXPENSE_CATEGORIES.map((cat) => {
									const catAmount = expensesByCategory[cat.id] || 0;
									const totalExp = summary?.totalExpendituresInPeriod || 1;
									const percent = totalExp > 0 ? Math.round((catAmount / totalExp) * 100) : 0;
									return (
										<div
											key={cat.id}
											className="p-3.5 rounded-xl border border-slate-200/70 hover:border-slate-300 transition bg-slate-50/50 flex flex-col justify-between space-y-2"
										>
											<div className="flex items-start justify-between gap-1">
												<span className="text-[11px] font-bold text-slate-700 line-clamp-1">
													{cat.label}
												</span>
												<span className="text-[10px] font-bold text-slate-400">
													{percent}%
												</span>
											</div>
											<div>
												<div className="text-base font-black text-slate-900">
													{formatRupees(catAmount)}
												</div>
												<div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
													<div
														className="h-full bg-indigo-600 rounded-full"
														style={{ width: `${percent}%` }}
													></div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TAB 2: Operating Expenditures Ledger */}
			{activeTab === "expenses" && (
				<div className="space-y-4">
					{/* Search & Category Filter */}
					<div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<div className="relative w-full sm:w-64">
								<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									placeholder="Search description, paid to, ref..."
									value={expenseSearch}
									onChange={(e) => setExpenseSearch(e.target.value)}
									className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
								/>
							</div>

							<select
								value={expenseCatFilter}
								onChange={(e) => setExpenseCatFilter(e.target.value)}
								className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
							>
								<option value="all">All Categories</option>
								{EXPENSE_CATEGORIES.map((c) => (
									<option key={c.id} value={c.id}>
										{c.label}
									</option>
								))}
							</select>
						</div>

						<button
							onClick={() => setIsExpenseModalOpen(true)}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
						>
							<Plus className="w-3.5 h-3.5" />
							<span>Log New Expenditure</span>
						</button>
					</div>

					{/* Expenditures Table */}
					<div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold">
										<th className="py-3 px-4">Date</th>
										<th className="py-3 px-4">Category</th>
										<th className="py-3 px-4">Expense Title</th>
										<th className="py-3 px-4">Paid To</th>
										<th className="py-3 px-4">Payment Mode</th>
										<th className="py-3 px-4">Receipt / Ref</th>
										<th className="py-3 px-4 text-right">Amount (₹)</th>
										<th className="py-3 px-4 text-center">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{filteredExpenses.length === 0 ? (
										<tr>
											<td colSpan={8} className="py-12 text-center text-slate-400">
												No operating expenditures recorded yet. Click "+ Log New Expenditure" above.
											</td>
										</tr>
									) : (
										filteredExpenses.map((exp) => {
											const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === exp.category) || {
												label: exp.category,
												color: "bg-slate-100 text-slate-700 border-slate-200",
											};
											return (
												<tr key={exp.id} className="hover:bg-slate-50/70 transition">
													<td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
														{exp.expenseDate}
													</td>
													<td className="py-3 px-4">
														<span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${catInfo.color}`}>
															{catInfo.label}
														</span>
													</td>
													<td className="py-3 px-4 font-bold text-slate-900">
														{exp.title}
														{exp.notes && (
															<p className="text-[10px] font-normal text-slate-400 line-clamp-1">{exp.notes}</p>
														)}
													</td>
													<td className="py-3 px-4 text-slate-600">
														{exp.paidTo || <span className="text-slate-300">—</span>}
													</td>
													<td className="py-3 px-4 text-slate-600 whitespace-nowrap">
														<span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
															{exp.paymentMode.replace("_", " ")}
														</span>
													</td>
													<td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
														{exp.receiptRef || <span className="text-slate-300">—</span>}
													</td>
													<td className="py-3 px-4 text-right font-black text-rose-600 whitespace-nowrap">
														{formatRupees(exp.amountInRupees)}
													</td>
													<td className="py-3 px-4 text-center">
														<button
															onClick={() => handleDeleteExpense(exp.id)}
															className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
															title="Delete expenditure"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</button>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* TAB 3: Staff Payroll & Salaries */}
			{activeTab === "salaries" && (
				<div className="space-y-6">
					{/* Summary bar */}
					<div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
								<Users className="w-5 h-5" />
							</div>
							<div>
								<h3 className="text-sm font-black text-slate-900">Registered Faculty & Staff Salaries</h3>
								<p className="text-xs text-slate-500">
									Monthly salary commitments entered when adding staff, with instant disbursement tracking.
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="text-right">
								<div className="text-xs text-slate-400">Total Monthly Commitment</div>
								<div className="text-lg font-black text-slate-900">
									{formatRupees(summary?.monthlyStaffPayrollCommitment)}
								</div>
							</div>
							<button
								onClick={() => handleOpenDisburseModal()}
								className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
							>
								+ Disburse Salary
							</button>
						</div>
					</div>

					{/* Faculty Roster Table */}
					<div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
						<div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
							<span className="text-xs font-bold text-slate-800">Staff Compensation Roster</span>
							<span className="text-xs text-slate-500">{teachersList.length} Faculty Members</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
										<th className="py-3 px-4">Faculty Member</th>
										<th className="py-3 px-4">Employee ID</th>
										<th className="py-3 px-4">Designation</th>
										<th className="py-3 px-4">Specialization</th>
										<th className="py-3 px-4 text-right">Monthly Salary (₹)</th>
										<th className="py-3 px-4 text-center">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{teachersList.length === 0 ? (
										<tr>
											<td colSpan={6} className="py-10 text-center text-slate-400">
												No teachers registered in the system yet.
											</td>
										</tr>
									) : (
										teachersList.map((t) => (
											<tr key={t.id} className="hover:bg-slate-50/70 transition">
												<td className="py-3 px-4">
													<div className="font-bold text-slate-900">{t.fullName}</div>
													<div className="text-[10px] text-slate-400">{t.email}</div>
												</td>
												<td className="py-3 px-4 font-mono text-slate-600 font-bold text-[11px]">
													{t.employeeId}
												</td>
												<td className="py-3 px-4 text-slate-700">
													<span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
														{t.designation}
													</span>
												</td>
												<td className="py-3 px-4 text-slate-600">
													{t.specialization || "General Faculty"}
												</td>
												<td className="py-3 px-4 text-right">
													<div className="font-black text-slate-900 text-sm">
														{formatRupees(t.monthlySalaryInRupees)}
													</div>
													<button
														onClick={() => handleOpenEditSalary(t)}
														className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-0.5"
													>
														<Edit2 className="w-2.5 h-2.5" />
														Adjust Salary
													</button>
												</td>
												<td className="py-3 px-4 text-center">
													<button
														onClick={() => handleOpenDisburseModal(t)}
														className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
													>
														Pay Salary
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Disbursement History Table */}
					<div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
						<div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
							<span className="text-xs font-bold text-slate-800">Salary Disbursement Ledger</span>
							<span className="text-xs text-slate-500">{disbursementsList.length} Transactions</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
										<th className="py-3 px-4">Payment Date</th>
										<th className="py-3 px-4">Faculty Member</th>
										<th className="py-3 px-4">Salary Month</th>
										<th className="py-3 px-4">Payment Mode</th>
										<th className="py-3 px-4">UTR / Ref #</th>
										<th className="py-3 px-4 text-right">Amount (₹)</th>
										<th className="py-3 px-4 text-center">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{disbursementsList.length === 0 ? (
										<tr>
											<td colSpan={7} className="py-10 text-center text-slate-400">
												No salary disbursements logged yet.
											</td>
										</tr>
									) : (
										disbursementsList.map((d) => (
											<tr key={d.id} className="hover:bg-slate-50/70 transition">
												<td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
													{d.paymentDate}
												</td>
												<td className="py-3 px-4 font-bold text-slate-900">
													{d.teacherName || "Faculty Member"}
													{d.employeeId && (
														<span className="text-[10px] text-slate-400 font-normal ml-1">
															({d.employeeId})
														</span>
													)}
												</td>
												<td className="py-3 px-4 font-semibold text-indigo-700">
													{d.month}
												</td>
												<td className="py-3 px-4 text-slate-600">
													<span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium">
														{d.paymentMode.replace("_", " ")}
													</span>
												</td>
												<td className="py-3 px-4 font-mono text-[11px] text-slate-500">
													{d.transactionRef || <span className="text-slate-300">—</span>}
												</td>
												<td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
													{formatRupees(d.amountInRupees)}
												</td>
												<td className="py-3 px-4 text-center">
													<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
														Disbursed
													</span>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* TAB 4: Recent Fee Receipts */}
			{activeTab === "receipts" && (
				<div className="space-y-4">
					<div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
						<div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
							<span className="text-xs font-bold text-slate-800">
								Fee Inflow Receipts (Selected Period)
							</span>
							<span className="text-xs text-slate-500">{recentReceipts.length} Receipts</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
										<th className="py-3 px-4">Receipt Number</th>
										<th className="py-3 px-4">Student</th>
										<th className="py-3 px-4">Date & Time</th>
										<th className="py-3 px-4">Payment Method</th>
										<th className="py-3 px-4">Remarks</th>
										<th className="py-3 px-4 text-right">Amount Paid</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{recentReceipts.length === 0 ? (
										<tr>
											<td colSpan={6} className="py-12 text-center text-slate-400">
												No fee collection receipts recorded in this period.
											</td>
										</tr>
									) : (
										recentReceipts.map((r) => (
											<tr key={r.id} className="hover:bg-slate-50/70 transition">
												<td className="py-3 px-4 font-mono font-bold text-indigo-700">
													{r.receiptNumber}
												</td>
												<td className="py-3 px-4 font-bold text-slate-900">
													{r.fullName || "Student"}
												</td>
												<td className="py-3 px-4 text-slate-600 whitespace-nowrap">
													{new Date((r.generatedAt || 0) * 1000).toLocaleDateString("en-IN", {
														day: "2-digit",
														month: "short",
														year: "numeric",
													})}
												</td>
												<td className="py-3 px-4 text-slate-600">
													<span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
														{r.paymentMode || "Online"}
													</span>
												</td>
												<td className="py-3 px-4 text-slate-500">
													{r.remarks || "Tuition fee installment"}
												</td>
												<td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
													{formatRupees(Math.round((r.amountPaidInCents || 0) / 100))}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* MODAL 1: Log Operating Expense */}
			{isExpenseModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
					<div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-rose-50 text-rose-600">
									<Receipt className="w-4 h-4" />
								</div>
								<h2 className="text-base font-black text-slate-900">Log Operating Expenditure</h2>
							</div>
							<button
								onClick={() => setIsExpenseModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
							<div>
								<label className="block font-bold text-slate-700 mb-1">
									Expense Description / Title *
								</label>
								<input
									type="text"
									placeholder="e.g. October Academy Rent, AWS Cloud Hosting, Electricity Bill"
									value={expenseForm.title}
									onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-bold text-slate-700 mb-1">Category *</label>
									<select
										value={expenseForm.category}
										onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
										required
									>
										{EXPENSE_CATEGORIES.map((c) => (
											<option key={c.id} value={c.id}>
												{c.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
									<input
										type="number"
										min="1"
										placeholder="e.g. 25000"
										value={expenseForm.amountInRupees}
										onChange={(e) => setExpenseForm({ ...expenseForm, amountInRupees: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold"
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-bold text-slate-700 mb-1">Date of Expense *</label>
									<input
										type="date"
										value={expenseForm.expenseDate}
										onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
										required
									/>
								</div>
								<div>
									<label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
									<select
										value={expenseForm.paymentMode}
										onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
									>
										<option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
										<option value="UPI">UPI / QR Code</option>
										<option value="CASH">Cash</option>
										<option value="CARD">Credit / Debit Card</option>
										<option value="CHEQUE">Cheque</option>
									</select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-bold text-slate-700 mb-1">Paid To / Vendor</label>
									<input
										type="text"
										placeholder="e.g. Building Landlord, Airtel Fiber"
										value={expenseForm.paidTo}
										onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
									/>
								</div>
								<div>
									<label className="block font-bold text-slate-700 mb-1">Receipt / Invoice Ref</label>
									<input
										type="text"
										placeholder="e.g. INV-2026-904"
										value={expenseForm.receiptRef}
										onChange={(e) => setExpenseForm({ ...expenseForm, receiptRef: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
									/>
								</div>
							</div>

							<div>
								<label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
								<textarea
									rows={2}
									placeholder="Optional notes or context..."
									value={expenseForm.notes}
									onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
								/>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsExpenseModalOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : "Save Expenditure"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL 2: Disburse Faculty Salary */}
			{isDisburseModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
					<div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
									<DollarSign className="w-4 h-4" />
								</div>
								<h2 className="text-base font-black text-slate-900">Record Salary Disbursement</h2>
							</div>
							<button
								onClick={() => setIsDisburseModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<form onSubmit={handleDisburseSalary} className="space-y-4 text-xs">
							<div>
								<label className="block font-bold text-slate-700 mb-1">Select Faculty Member *</label>
								<select
									value={disburseForm.teacherId}
									onChange={(e) => {
										const sel = teachersList.find((t) => t.id === e.target.value);
										setDisburseForm({
											...disburseForm,
											teacherId: e.target.value,
											amountInRupees: sel?.monthlySalaryInRupees ? String(sel.monthlySalaryInRupees) : disburseForm.amountInRupees,
										});
									}}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
									required
								>
									<option value="">-- Choose faculty --</option>
									{teachersList.map((t) => (
										<option key={t.id} value={t.id}>
											{t.fullName} ({t.designation}) — Registered Salary: ₹{(t.monthlySalaryInRupees || 0).toLocaleString("en-IN")}/mo
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-bold text-slate-700 mb-1">Salary Month (YYYY-MM) *</label>
									<input
										type="month"
										value={disburseForm.month}
										onChange={(e) => setDisburseForm({ ...disburseForm, month: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
										required
									/>
								</div>
								<div>
									<label className="block font-bold text-slate-700 mb-1">Disbursed Amount (₹) *</label>
									<input
										type="number"
										min="1"
										placeholder="e.g. 45000"
										value={disburseForm.amountInRupees}
										onChange={(e) => setDisburseForm({ ...disburseForm, amountInRupees: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold"
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
									<input
										type="date"
										value={disburseForm.paymentDate}
										onChange={(e) => setDisburseForm({ ...disburseForm, paymentDate: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
										required
									/>
								</div>
								<div>
									<label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
									<select
										value={disburseForm.paymentMode}
										onChange={(e) => setDisburseForm({ ...disburseForm, paymentMode: e.target.value })}
										className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
									>
										<option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/IMPS)</option>
										<option value="UPI">UPI Transfer</option>
										<option value="CHEQUE">Cheque</option>
										<option value="CASH">Cash</option>
									</select>
								</div>
							</div>

							<div>
								<label className="block font-bold text-slate-700 mb-1">Bank Transaction / UTR Ref</label>
								<input
									type="text"
									placeholder="e.g. UTR-HDFC-993821034"
									value={disburseForm.transactionRef}
									onChange={(e) => setDisburseForm({ ...disburseForm, transactionRef: e.target.value })}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
								/>
							</div>

							<div>
								<label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
								<input
									type="text"
									placeholder="e.g. Disbursed full month regular salary"
									value={disburseForm.notes}
									onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
								/>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsDisburseModalOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50"
								>
									{submitting ? "Processing..." : "Confirm Disbursement"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL 3: Quick Adjust Faculty Monthly Salary */}
			{isEditSalaryModalOpen && editSalaryTeacher && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
					<div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
									<Edit2 className="w-4 h-4" />
								</div>
								<h2 className="text-sm font-black text-slate-900">Adjust Monthly Salary</h2>
							</div>
							<button
								onClick={() => setIsEditSalaryModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<form onSubmit={handleSaveUpdatedSalary} className="space-y-4 text-xs">
							<div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
								<div className="font-bold text-slate-900">{editSalaryTeacher.fullName}</div>
								<div className="text-[11px] text-slate-500">
									{editSalaryTeacher.designation} • ID: {editSalaryTeacher.employeeId}
								</div>
							</div>

							<div>
								<label className="block font-bold text-slate-700 mb-1">
									Committed Monthly Salary (₹) *
								</label>
								<input
									type="number"
									min="0"
									value={editSalaryAmount}
									onChange={(e) => setEditSalaryAmount(e.target.value)}
									className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 font-black text-sm"
									required
								/>
								<p className="text-[10px] text-slate-400 mt-1">
									This updates the base monthly salary payroll commitment for this staff member.
								</p>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsEditSalaryModalOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : "Update Salary"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

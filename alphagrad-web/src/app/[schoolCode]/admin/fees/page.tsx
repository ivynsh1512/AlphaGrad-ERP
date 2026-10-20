"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	CreditCard,
	Plus,
	Receipt,
	TrendingUp,
	CheckCircle2,
	AlertCircle,
	X,
	Search,
	Edit2,
	Trash2,
	Calendar,
	User,
	Filter,
	ArrowUpDown,
	DollarSign
} from "lucide-react";
import { ParentInvoiceModal } from "@/components/portal/ParentInvoiceModal";
import BouncingLoader from "@/components/BouncingLoader";

interface FeeStructure {
	id: string;
	name: string;
	classId: string;
	className: string;
	totalAmountInCents: number;
	description: string | null;
}

interface StudentObligation {
	id: string;
	studentId: string;
	fullName: string;
	username: string;
	admissionNumber: string;
	feeStructureId: string;
	structureName: string;
	installmentTitle: string;
	dueDate: string;
	baseAmountInRupees: number;
	concessionAmountInRupees: number;
	netAmountInRupees: number;
	paidAmountInRupees: number;
	balanceInRupees: number;
	status: string;
}

export default function AdminFeesPage() {
	const [structures, setStructures] = useState<FeeStructure[]>([]);
	const [obligations, setObligations] = useState<StudentObligation[]>([]);
	const [students, setStudents] = useState<any[]>([]);
	const [classes, setClasses] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	// Modals
	const [isCreateStructureOpen, setIsCreateStructureOpen] = useState(false);
	const [editingStructureId, setEditingStructureId] = useState<string | null>(null);

	const [isAssignObligationOpen, setIsAssignObligationOpen] = useState(false);
	const [editingObligationId, setEditingObligationId] = useState<string | null>(null);
	const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

	const [quickDueModal, setQuickDueModal] = useState<{
		isOpen: boolean;
		obligationId: string;
		title: string;
		currentDueDate: string;
		newDueDate: string;
		saving: boolean;
	}>({
		isOpen: false,
		obligationId: "",
		title: "",
		currentDueDate: "",
		newDueDate: "",
		saving: false,
	});

	// Structure form state
	const [structForm, setStructForm] = useState({
		name: "",
		classId: "",
		totalAmountInRupees: 120000,
		description: "",
	});

	// Obligation form state
	const [obForm, setObForm] = useState({
		studentId: "",
		feeStructureId: "",
		installmentTitle: "Installment 1 (Advance)",
		dueDate: "2026-11-01",
		baseAmountInRupees: 40000,
		concessionAmountInRupees: 0,
	});

	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		setError(null);
		try {
			const [structRes, stuRes, clsRes, obRes] = await Promise.all([
				api.fees.structures(),
				api.students.list(),
				api.academic.classes(),
				api.fees.allObligations().catch(() => ({ obligations: [] })),
			]);
			setStructures(structRes.feeStructures || []);
			setStudents(stuRes.students || []);
			setClasses(clsRes.classes || []);
			setObligations(obRes.obligations || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load fee configuration");
		} finally {
			setLoading(false);
		}
	}

	// 1. Fee Structure Handlers
	const handleOpenCreateStructure = () => {
		setEditingStructureId(null);
		setStructForm({
			name: "",
			classId: classes[0]?.id || "",
			totalAmountInRupees: 60000,
			description: "",
		});
		setIsCreateStructureOpen(true);
	};

	const handleOpenEditStructure = (s: FeeStructure) => {
		setEditingStructureId(s.id);
		setStructForm({
			name: s.name,
			classId: s.classId || "",
			totalAmountInRupees: s.totalAmountInCents / 100,
			description: s.description || "",
		});
		setIsCreateStructureOpen(true);
	};

	const handleSaveStructure = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			if (editingStructureId) {
				await api.fees.updateStructure(editingStructureId, {
					name: structForm.name,
					classId: structForm.classId,
					totalAmountInRupees: Number(structForm.totalAmountInRupees),
					description: structForm.description,
				});
			} else {
				await api.fees.createStructure({
					academicSessionId: "sess-2026-27",
					classId: structForm.classId,
					name: structForm.name,
					totalAmountInRupees: Number(structForm.totalAmountInRupees),
					description: structForm.description,
				});
			}
			setIsCreateStructureOpen(false);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to save fee structure");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteStructure = async (id: string) => {
		if (!confirm("Are you sure you want to delete this fee plan?")) return;
		try {
			await api.fees.deleteStructure(id);
			loadData();
		} catch (err: any) {
			alert(err?.message || "Cannot delete fee structure. Make sure no student obligations are linked to it.");
		}
	};

	// 2. Student Obligation Handlers
	const handleOpenAssignObligation = () => {
		setEditingObligationId(null);
		setObForm({
			studentId: students[0]?.id || "",
			feeStructureId: structures[0]?.id || "",
			installmentTitle: "Installment 1 (Advance)",
			dueDate: new Date().toISOString().split("T")[0],
			baseAmountInRupees: 40000,
			concessionAmountInRupees: 0,
		});
		setIsAssignObligationOpen(true);
	};

	const handleOpenEditObligation = (ob: StudentObligation) => {
		setEditingObligationId(ob.id);
		setObForm({
			studentId: ob.studentId,
			feeStructureId: ob.feeStructureId,
			installmentTitle: ob.installmentTitle,
			dueDate: ob.dueDate,
			baseAmountInRupees: ob.baseAmountInRupees,
			concessionAmountInRupees: ob.concessionAmountInRupees,
		});
		setIsAssignObligationOpen(true);
	};

	const handleSaveObligation = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			if (editingObligationId) {
				await api.fees.updateObligation(editingObligationId, {
					installmentTitle: obForm.installmentTitle,
					dueDate: obForm.dueDate,
					baseAmountInRupees: Number(obForm.baseAmountInRupees),
					concessionAmountInRupees: Number(obForm.concessionAmountInRupees),
				});
			} else {
				await api.fees.createObligation({
					studentId: obForm.studentId,
					feeStructureId: obForm.feeStructureId,
					academicSessionId: "sess-2026-27",
					installmentTitle: obForm.installmentTitle,
					dueDate: obForm.dueDate,
					baseAmountInRupees: Number(obForm.baseAmountInRupees),
					concessionAmountInRupees: Number(obForm.concessionAmountInRupees),
				});
			}
			setIsAssignObligationOpen(false);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to save fee obligation");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteObligation = async (id: string) => {
		if (!confirm("Are you sure you want to delete this fee obligation for the student?")) return;
		try {
			await api.fees.deleteObligation(id);
			loadData();
		} catch (err: any) {
			alert(err?.message || "Failed to delete fee obligation.");
		}
	};

	const handleOpenQuickDueDate = (ob: StudentObligation) => {
		setQuickDueModal({
			isOpen: true,
			obligationId: ob.id,
			title: `${ob.fullName} • ${ob.installmentTitle}`,
			currentDueDate: ob.dueDate,
			newDueDate: ob.dueDate || new Date().toISOString().split("T")[0],
			saving: false,
		});
	};

	const handleSaveQuickDueDate = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!quickDueModal.obligationId || !quickDueModal.newDueDate) return;
		setQuickDueModal((prev) => ({ ...prev, saving: true }));
		try {
			await api.fees.updateObligation(quickDueModal.obligationId, {
				dueDate: quickDueModal.newDueDate,
			});
			setQuickDueModal({
				isOpen: false,
				obligationId: "",
				title: "",
				currentDueDate: "",
				newDueDate: "",
				saving: false,
			});
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to update payment due date");
		} finally {
			setQuickDueModal((prev) => ({ ...prev, saving: false }));
		}
	};

	// Filtered obligations
	const todayStr = new Date().toISOString().split("T")[0];
	const filteredObligations = obligations.filter((ob) => {
		const matchesSearch =
			!searchQuery ||
			ob.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ob.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ob.installmentTitle?.toLowerCase().includes(searchQuery.toLowerCase());
		
		const isPaid = ob.status === "paid" || ob.balanceInRupees <= 0;
		const isDueNow = !isPaid && Boolean(ob.dueDate && ob.dueDate <= todayStr);
		const isUpcoming = !isPaid && Boolean(ob.dueDate && ob.dueDate > todayStr);

		let matchesStatus = true;
		if (statusFilter === "all") matchesStatus = true;
		else if (statusFilter === "due_now") matchesStatus = isDueNow;
		else if (statusFilter === "upcoming") matchesStatus = isUpcoming;
		else if (statusFilter === "paid") matchesStatus = isPaid;
		else if (statusFilter === "partially_paid") matchesStatus = ob.status === "partially_paid";
		else matchesStatus = ob.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			{/* Top Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center space-x-2">
						<span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
							Financial Operations
						</span>
						<span className="text-xs text-slate-400">•</span>
						<span className="text-xs text-slate-500 font-medium">Fee Ledger & Plans</span>
					</div>
					<h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
						Fee Structures & Student Obligations
					</h1>
					<p className="text-xs text-slate-500 mt-1">
						Configure institute tuition fee plans, assign installment dues to enrolled students, and manage obligations.
					</p>
				</div>
				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						onClick={handleOpenCreateStructure}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs transition"
					>
						<Plus className="w-3.5 h-3.5 text-indigo-600" />
						Create Fee Plan
					</button>
					<button
						onClick={handleOpenAssignObligation}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
					>
						<Plus className="w-3.5 h-3.5" />
						Assign Fee to Student
					</button>
				</div>
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
					<button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Section 1: Fee Structures Grid */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-base font-black text-slate-900">Institute Fee Plans</h2>
						<p className="text-xs text-slate-500">Standardized course packages by class</p>
					</div>
					<span className="text-xs font-bold text-slate-500">{structures.length} Plans</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{loading ? (
						<div className="col-span-full">
							<BouncingLoader text="Loading institute fee plans & structures..." color="indigo" />
						</div>
					) : structures.length === 0 ? (
						<div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
							No fee structures configured. Click "Create Fee Plan" above.
						</div>
					) : (
						structures.map((s) => (
							<div
								key={s.id}
								className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition"
							>
								<div>
									<div className="flex items-start justify-between gap-2">
										<div>
											<h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
											<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
												{s.className}
											</span>
										</div>
										<div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
											<CreditCard className="w-4 h-4" />
										</div>
									</div>

									<div className="pt-3">
										<div className="text-[11px] text-slate-400 font-medium">Standard Tuition Fee</div>
										<div className="text-2xl font-black text-slate-900 tracking-tight">
											₹{(s.totalAmountInCents / 100).toLocaleString("en-IN")}
										</div>
									</div>

									{s.description && (
										<p className="text-xs text-slate-500 pt-2 leading-relaxed">{s.description}</p>
									)}
								</div>

								{/* Action Buttons: Edit & Delete */}
								<div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
									<button
										onClick={() => handleOpenEditStructure(s)}
										className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
										title="Edit Fee Plan"
									>
										<Edit2 className="w-3.5 h-3.5" />
										<span>Edit</span>
									</button>
									<button
										onClick={() => handleDeleteStructure(s.id)}
										className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
										title="Delete Fee Plan"
									>
										<Trash2 className="w-3.5 h-3.5" />
										<span>Delete</span>
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Section 2: Student Obligations Ledger */}
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-base font-black text-slate-900">Student Fee Obligations & Dues</h2>
						<p className="text-xs text-slate-500">Live installment obligations assigned to students</p>
					</div>

					{/* Search & Status Filter */}
					<div className="flex items-center gap-2.5 flex-wrap">
						<div className="relative">
							<Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
							<input
								type="text"
								placeholder="Search student..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs w-44"
							/>
						</div>

						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
						>
							<option value="all">All Obligations</option>
							<option value="due_now">Due Now / Overdue</option>
							<option value="upcoming">Upcoming / Scheduled</option>
							<option value="paid">Paid</option>
							<option value="partially_paid">Partially Paid</option>
						</select>
					</div>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
					{loading ? (
						<BouncingLoader text="Loading student fee obligations ledger..." color="indigo" />
					) : filteredObligations.length === 0 ? (
						<div className="p-12 text-center text-xs text-slate-400">
							{obligations.length === 0
								? "No fee obligations assigned yet. Click 'Assign Fee to Student' above."
								: "No obligations match your filter."}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
									<tr>
										<th className="py-3 px-4">Student</th>
										<th className="py-3 px-4">Installment</th>
										<th className="py-3 px-4">Due Date</th>
										<th className="py-3 px-4">Base Fee</th>
										<th className="py-3 px-4">Concession</th>
										<th className="py-3 px-4">Net Payable</th>
										<th className="py-3 px-4">Paid</th>
										<th className="py-3 px-4">Status</th>
										<th className="py-3 px-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{filteredObligations.map((ob) => {
										const isPaid = ob.status === "paid" || ob.balanceInRupees <= 0;
										const isDueNow = !isPaid && ob.dueDate && ob.dueDate <= todayStr;
										return (
											<tr key={ob.id} className="hover:bg-slate-50/60 transition">
												<td className="py-3 px-4">
													<div className="font-bold text-slate-900">{ob.fullName}</div>
													<div className="text-[10px] text-slate-400 font-mono">
														{ob.username} {ob.admissionNumber ? `• Adm: ${ob.admissionNumber}` : ""}
													</div>
												</td>
												<td className="py-3 px-4">
													<div className="font-semibold text-slate-800">{ob.installmentTitle}</div>
													<div className="text-[10px] text-indigo-600">{ob.structureName}</div>
												</td>
												<td className="py-3 px-4 text-slate-600 whitespace-nowrap">
													<div className="flex items-center gap-1.5 group">
														<Calendar className={`w-3.5 h-3.5 ${isDueNow ? "text-rose-500" : "text-slate-400"}`} />
														<span className={`font-semibold ${isDueNow ? "text-rose-700" : "text-slate-700"}`}>
															{ob.dueDate}
														</span>
														<button
															onClick={() => handleOpenQuickDueDate(ob)}
															className="ml-1 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
															title="Quickly Update Due Date"
														>
															<Edit2 className="w-3 h-3" />
														</button>
													</div>
												</td>
												<td className="py-3 px-4 font-semibold text-slate-700">
													₹{ob.baseAmountInRupees.toLocaleString("en-IN")}
												</td>
												<td className="py-3 px-4 text-slate-500">
													{ob.concessionAmountInRupees > 0
														? `₹${ob.concessionAmountInRupees.toLocaleString("en-IN")}`
														: "—"}
												</td>
												<td className="py-3 px-4 font-black text-slate-900">
													₹{ob.netAmountInRupees.toLocaleString("en-IN")}
												</td>
												<td className="py-3 px-4 font-bold text-emerald-600">
													₹{ob.paidAmountInRupees.toLocaleString("en-IN")}
												</td>
												<td className="py-3 px-4">
													{isPaid ? (
														<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
															Paid
														</span>
													) : isDueNow ? (
														<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
															Due Now
														</span>
													) : ob.status === "partially_paid" ? (
														<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
															Partially Paid
														</span>
													) : (
														<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
															Scheduled
														</span>
													)}
												</td>
											<td className="py-3 px-4 text-right">
												<div className="inline-flex items-center gap-1">
													{ob.paidAmountInRupees > 0 && (
														<button
															onClick={() => {
																setViewingInvoice({
																	receiptNumber: `REC-${ob.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
																	studentName: ob.fullName,
																	studentUsername: ob.username,
																	admissionNumber: ob.admissionNumber,
																	batchName: "Proventus Academic Batch",
																	amountPaidInRupees: ob.paidAmountInRupees,
																	paymentMode: "ONLINE / CASH COUNTER",
																	installmentTitle: ob.installmentTitle,
																	structureName: ob.structureName || "Standard Academic Plan",
																	paymentDate: new Date().toLocaleDateString("en-IN"),
																	transactionRef: ob.id,
																	notes: "Official institutional tax receipt & voucher."
																});
															}}
															className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
															title="View / Print Official Tax Invoice"
														>
															<Receipt className="w-3.5 h-3.5" />
														</button>
													)}
													<button
														onClick={() => handleOpenEditObligation(ob)}
														className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
														title="Edit Obligation"
													>
														<Edit2 className="w-3.5 h-3.5" />
													</button>
													<button
														onClick={() => handleDeleteObligation(ob.id)}
														className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
														title="Delete Obligation"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* Modal 1: Create / Edit Fee Structure */}
			{isCreateStructureOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">
								{editingStructureId ? "Edit Fee Plan" : "Create New Fee Plan"}
							</h3>
							<button onClick={() => setIsCreateStructureOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSaveStructure} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Fee Plan Name *</label>
								<input
									type="text"
									required
									value={structForm.name}
									onChange={(e) => setStructForm({ ...structForm, name: e.target.value })}
									placeholder="e.g. Class 10 Board & NIOS Package"
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Class *</label>
								<select
									required
									value={structForm.classId}
									onChange={(e) => setStructForm({ ...structForm, classId: e.target.value })}
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								>
									<option value="">Select Target Class</option>
									{classes.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} ({c.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Total Package Amount (₹) *</label>
								<input
									type="number"
									required
									value={structForm.totalAmountInRupees}
									onChange={(e) => setStructForm({ ...structForm, totalAmountInRupees: Number(e.target.value) })}
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
								<textarea
									value={structForm.description}
									onChange={(e) => setStructForm({ ...structForm, description: e.target.value })}
									placeholder="Includes classroom instruction, mock tests, and mentorship."
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									rows={2}
								/>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsCreateStructureOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-bold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : editingStructureId ? "Update Plan" : "Save Plan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal 2: Assign / Edit Student Obligation */}
			{isAssignObligationOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">
								{editingObligationId ? "Edit Student Fee Obligation" : "Assign Fee Obligation to Student"}
							</h3>
							<button onClick={() => setIsAssignObligationOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSaveObligation} className="space-y-3 text-xs">
							{!editingObligationId && (
								<>
									<div>
										<label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
										<select
											required
											value={obForm.studentId}
											onChange={(e) => setObForm({ ...obForm, studentId: e.target.value })}
											className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
										>
											<option value="">Select Student</option>
											{students.map((s) => (
												<option key={s.id} value={s.id}>
													{s.fullName} ({s.username})
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block font-semibold text-slate-700 mb-1">Fee Structure *</label>
										<select
											required
											value={obForm.feeStructureId}
											onChange={(e) => setObForm({ ...obForm, feeStructureId: e.target.value })}
											className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
										>
											<option value="">Select Fee Structure</option>
											{structures.map((s) => (
												<option key={s.id} value={s.id}>
													{s.name} (₹{(s.totalAmountInCents / 100).toLocaleString("en-IN")})
												</option>
											))}
										</select>
									</div>
								</>
							)}

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Installment Title *</label>
								<input
									type="text"
									required
									value={obForm.installmentTitle}
									onChange={(e) => setObForm({ ...obForm, installmentTitle: e.target.value })}
									placeholder="e.g. Term 1 Advance Tuition"
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Base Amount (₹) *</label>
									<input
										type="number"
										required
										value={obForm.baseAmountInRupees}
										onChange={(e) => setObForm({ ...obForm, baseAmountInRupees: Number(e.target.value) })}
										className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Concession (₹)</label>
									<input
										type="number"
										value={obForm.concessionAmountInRupees}
										onChange={(e) => setObForm({ ...obForm, concessionAmountInRupees: Number(e.target.value) })}
										className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
								<input
									type="date"
									required
									value={obForm.dueDate}
									onChange={(e) => setObForm({ ...obForm, dueDate: e.target.value })}
									className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex justify-between items-center text-xs">
								<span className="font-semibold text-indigo-900">Net Payable by Student:</span>
								<span className="font-extrabold text-indigo-700 text-sm">
									₹{Math.max(0, obForm.baseAmountInRupees - obForm.concessionAmountInRupees).toLocaleString("en-IN")}
								</span>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsAssignObligationOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-bold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : editingObligationId ? "Update Obligation" : "Assign Obligation"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Quick Change Due Date Modal */}
			{quickDueModal.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-indigo-600" />
								<h3 className="font-bold text-slate-900 text-sm">Update Payment Due Date</h3>
							</div>
							<button
								onClick={() => setQuickDueModal((prev) => ({ ...prev, isOpen: false }))}
								className="text-slate-400 hover:text-slate-600"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSaveQuickDueDate} className="p-5 space-y-4 text-xs">
							<div>
								<div className="font-semibold text-slate-800">{quickDueModal.title}</div>
								<div className="text-[11px] text-slate-500 mt-0.5">
									Current Due Date: <span className="font-semibold text-slate-700">{quickDueModal.currentDueDate || "Not set"}</span>
								</div>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1.5">New Payment Due Date *</label>
								<input
									type="date"
									required
									value={quickDueModal.newDueDate}
									onChange={(e) => setQuickDueModal((prev) => ({ ...prev, newDueDate: e.target.value }))}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								/>
								<p className="text-[10px] text-slate-400 mt-1">
									Note: Outstanding fees will only be shown as Due Now to parents and admin on/after this date.
								</p>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setQuickDueModal((prev) => ({ ...prev, isOpen: false }))}
									className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={quickDueModal.saving}
									className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{quickDueModal.saving ? "Saving..." : "Update Due Date"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Official Parent / Student Tax Invoice Modal */}
			{viewingInvoice && (
				<ParentInvoiceModal
					invoice={viewingInvoice}
					onClose={() => setViewingInvoice(null)}
				/>
			)}
		</div>
	);
}

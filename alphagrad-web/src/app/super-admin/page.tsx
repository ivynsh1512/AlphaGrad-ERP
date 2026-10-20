"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
	Building2,
	Plus,
	Search,
	CheckCircle2,
	XCircle,
	SlidersHorizontal,
	Copy,
	Check,
	ExternalLink,
	KeyRound,
	Users,
	GraduationCap,
	Sparkles,
	Layers,
	ShieldAlert,
	RefreshCw,
	Settings2,
	Trash2,
	Ban,
	CheckCircle,
	AlertCircle,
	X,
	MapPin,
	Mail,
	Phone,
	UserCheck,
} from "lucide-react";

export interface ModuleDefinition {
	key: string;
	label: string;
	category: string;
	desc: string;
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
	{ key: "academic", label: "Academics & Batches", category: "Core", desc: "Classes, Batches, Subjects & Sessions" },
	{ key: "students", label: "Students Directory", category: "Core", desc: "Admissions, Enrollments & ID Cards" },
	{ key: "teachers", label: "Faculty Directory", category: "Core", desc: "Staff profiles & Subject assignments" },
	{ key: "attendance", label: "Daily Attendance", category: "Classroom", desc: "Student & Teacher Attendance Marker" },
	{ key: "timetable", label: "Weekly Timetables", category: "Classroom", desc: "Schedule planner & period allocator" },
	{ key: "homework", label: "Homework Desk", category: "Classroom", desc: "Assignment publishing & submissions" },
	{ key: "remarks", label: "Teacher Remarks", category: "Classroom", desc: "Student behavioral & academic remarks" },
	{ key: "assessments", label: "Monthly Assessments", category: "Evaluations", desc: "Tests, Marks, Grades & Ranks" },
	{ key: "syllabus", label: "Syllabus Tracker", category: "Classroom", desc: "Chapter portion completion progress" },
	{ key: "tasks", label: "Task Delegation", category: "Management", desc: "Staff & Student to-do workflows" },
	{ key: "notices", label: "Circulars & Notices", category: "Communication", desc: "Digital bulletin board & alerts" },
	{ key: "complaints", label: "Helpdesk Grievance", category: "Communication", desc: "Support tickets & parent inquiries" },
	{ key: "fees", label: "Fees & Invoices", category: "Finance", desc: "Fee structures, obligations & online checkout" },
	{ key: "calendar", label: "Academic Calendar", category: "Management", desc: "Holidays, exam schedules & events" },
	{ key: "accounting", label: "Operating Ledger", category: "Finance", desc: "Expenditures & Staff Salary Disbursements" },
	{ key: "campaigns", label: "Admissions Campaigns", category: "Growth", desc: "Dynamic banners & lead generation" },
	{ key: "aiTutor", label: "24/7 AI Student Tutor", category: "AI Suite", desc: "Interactive conversational tutor bot" },
	{ key: "worksheets", label: "AI Worksheet Generator", category: "AI Suite", desc: "Automated practice sheets & grading" },
	{ key: "tests", label: "AI CBT Online Tests", category: "AI Suite", desc: "Computer-based mock exams & timers" },
	{ key: "aiAdmin", label: "Institute AI Copilot", category: "AI Suite", desc: "Admin intelligence & usage analytics" },
];

export default function SuperAdminDashboard() {
	const [stats, setStats] = useState<any>(null);
	const [schools, setSchools] = useState<any[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	// Modals
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
	const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
	const [featureEditMap, setFeatureEditMap] = useState<Record<string, number>>({});
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// New School Form State
	const [newSchool, setNewSchool] = useState({
		name: "",
		code: "",
		brand: "AlphaGrad",
		tagline: "",
		address: "",
		city: "Bangalore",
		state: "Karnataka",
		contactEmail: "",
		contactPhone: "",
		themePrimary: "#2563eb",
		adminFullName: "Institute Administrator",
		adminUsername: "Alpha1000",
		adminPassword: "Alpha@2026",
	});

	const [newSchoolFeatures, setNewSchoolFeatures] = useState<Record<string, number>>(
		MODULE_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.key]: 1 }), {})
	);

	const loadData = async () => {
		try {
			setLoading(true);
			setErrorMessage(null);
			const [statsRes, schoolsRes] = await Promise.all([
				api.superAdmin.getStats(),
				api.superAdmin.getSchools(),
			]);
			setStats(statsRes);
			setSchools(schoolsRes.schools || []);
		} catch (err: any) {
			setErrorMessage(err?.message || "Failed to load super admin data from server");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleCopyUrl = (code: string) => {
		const origin = typeof window !== "undefined" ? window.location.origin : "https://erp.novaxai.in";
		const url = `${origin}/${code}/login`;
		navigator.clipboard.writeText(url);
		setCopiedCode(code);
		setTimeout(() => setCopiedCode(null), 2500);
	};

	// Open Feature Edit Modal
	const openFeatureModal = (school: any) => {
		setSelectedSchool(school);
		const currentFeat = school.features || {};
		const initialMap: Record<string, number> = {};
		MODULE_DEFINITIONS.forEach((m) => {
			initialMap[m.key] = currentFeat[m.key] !== undefined ? currentFeat[m.key] : 1;
		});
		setFeatureEditMap(initialMap);
		setIsFeatureModalOpen(true);
	};

	// Save Feature Matrix
	const handleSaveFeatures = async () => {
		if (!selectedSchool) return;
		try {
			await api.superAdmin.updateFeatures(selectedSchool.id, featureEditMap);
			setActionMessage(`Features for "${selectedSchool.name}" updated successfully!`);
			setIsFeatureModalOpen(false);
			await loadData();
			setTimeout(() => setActionMessage(null), 4000);
		} catch (err: any) {
			alert(err?.message || "Failed to update features");
		}
	};

	// Create School
	const handleCreateSchool = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.superAdmin.createSchool({
				...newSchool,
				code: newSchool.code.toLowerCase().trim(),
				features: newSchoolFeatures,
			});
			setActionMessage(`School "${newSchool.name}" (Code: ${newSchool.code}) created successfully!`);
			setIsAddModalOpen(false);
			setNewSchool({
				name: "",
				code: "",
				brand: "AlphaGrad",
				tagline: "",
				address: "",
				city: "Bangalore",
				state: "Karnataka",
				contactEmail: "",
				contactPhone: "",
				themePrimary: "#2563eb",
				adminFullName: "Institute Administrator",
				adminUsername: "Alpha1000",
				adminPassword: "Alpha@2026",
			});
			await loadData();
			setTimeout(() => setActionMessage(null), 5000);
		} catch (err: any) {
			alert(err?.message || "Failed to create school");
		}
	};

	// Reset Admin Password
	const handleResetPassword = async (school: any) => {
		const newPass = prompt(`Enter new password for ${school.name} administrator (${school.adminUser?.username || "Admin"}):`, "Alpha@2026");
		if (!newPass) return;
		try {
			const res = await api.superAdmin.resetAdminPassword(school.id, newPass);
			alert(`Password for ${res.username} reset to: ${res.password}`);
			await loadData();
		} catch (err: any) {
			alert(err?.message || "Failed to reset password");
		}
	};

	// Toggle School Status
	const handleToggleStatus = async (school: any) => {
		const nextStatus = school.status === "active" ? "suspended" : "active";
		const confirmed = confirm(`Are you sure you want to mark "${school.name}" as ${nextStatus.toUpperCase()}?`);
		if (!confirmed) return;
		try {
			await api.superAdmin.updateSchool(school.id, { status: nextStatus });
			setActionMessage(`School "${school.name}" status changed to ${nextStatus}.`);
			await loadData();
			setTimeout(() => setActionMessage(null), 4000);
		} catch (err: any) {
			alert(err?.message || "Failed to update school status");
		}
	};

	// Delete School
	const handleDeleteSchool = async (school: any) => {
		const promptText = prompt(`⚠️ CAUTION: Deleting "${school.name}" will permanently erase all its students, teachers, classes, and records.\n\nType the school code "${school.code}" to confirm deletion:`);
		if (promptText !== school.code) {
			if (promptText !== null) alert("Code does not match. Deletion cancelled.");
			return;
		}
		try {
			await api.superAdmin.deleteSchool(school.id);
			setActionMessage(`School "${school.name}" has been permanently deleted.`);
			await loadData();
			setTimeout(() => setActionMessage(null), 4000);
		} catch (err: any) {
			alert(err?.message || "Failed to delete school");
		}
	};

	const filteredSchools = schools.filter((s) => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return true;
		return (
			s.name?.toLowerCase().includes(q) ||
			s.code?.toLowerCase().includes(q) ||
			s.city?.toLowerCase().includes(q) ||
			s.brand?.toLowerCase().includes(q)
		);
	});

	return (
		<div className="space-y-8">
			{/* Banner Notifications */}
			{actionMessage && (
				<div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
						<span>{actionMessage}</span>
					</div>
					<button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{errorMessage && (
				<div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between shadow-xs">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
						<span>{errorMessage}</span>
					</div>
					<button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Top Header & Quick Action Buttons */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
				<div>
					<h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
						Schools & Institutes Directory
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Provision new tenants, assign custom school codes, and dynamically control the 20-module ERP feature matrix.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={loadData}
						disabled={loading}
						className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs disabled:opacity-50"
					>
						<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
						<span>Refresh</span>
					</button>

					<button
						onClick={() => setIsAddModalOpen(true)}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 active:scale-95"
					>
						<Plus className="w-4 h-4" />
						<span>Register New School</span>
					</button>
				</div>
			</div>

			{/* Metric KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Registered</p>
						<h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalSchools ?? schools.length}</h3>
						<p className="text-[11px] text-slate-400 mt-0.5">Autonomous School Tenants</p>
					</div>
					<div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
						<Building2 className="w-6 h-6" />
					</div>
				</div>

				<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Campuses</p>
						<h3 className="text-2xl font-black text-emerald-600 mt-1">
							{stats?.activeSchools ?? schools.filter((s) => s.status === "active").length}
						</h3>
						<p className="text-[11px] text-slate-400 mt-0.5">Live Portals Accessible</p>
					</div>
					<div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
						<CheckCircle2 className="w-6 h-6" />
					</div>
				</div>

				<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Directory</p>
						<h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalStudents ?? 0}</h3>
						<p className="text-[11px] text-slate-400 mt-0.5">Enrolled Across All Tenants</p>
					</div>
					<div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
						<GraduationCap className="w-6 h-6" />
					</div>
				</div>

				<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Faculty Network</p>
						<h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalTeachers ?? 0}</h3>
						<p className="text-[11px] text-slate-400 mt-0.5">Active Subject Teachers</p>
					</div>
					<div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
						<Users className="w-6 h-6" />
					</div>
				</div>
			</div>

			{/* Search & Filter Bar */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div className="relative w-full sm:max-w-md">
					<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
						<Search className="w-4 h-4" />
					</div>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search by school name, code, city, brand..."
						className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
					/>
				</div>

				<div className="text-xs font-semibold text-slate-500">
					Showing <span className="text-slate-900">{filteredSchools.length}</span> of {schools.length} institutes
				</div>
			</div>

			{/* School Tenants Table */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
				{loading ? (
					<div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
						<div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
						<p className="text-xs font-semibold">Querying Cloudflare D1 Database...</p>
					</div>
				) : filteredSchools.length === 0 ? (
					<div className="py-20 px-6 text-center text-slate-500">
						<div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
							<Building2 className="w-7 h-7" />
						</div>
						<h3 className="text-base font-bold text-slate-900">No Schools Found</h3>
						<p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
							{searchQuery
								? `No schools matched your search "${searchQuery}". Clear query to view all.`
								: "No school tenants are currently registered. Click 'Register New School' above to add your first tenant."}
						</p>
						{!searchQuery && (
							<button
								onClick={() => setIsAddModalOpen(true)}
								className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
							>
								<Plus className="w-4 h-4" />
								<span>Add Your First School</span>
							</button>
						)}
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								<tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
									<th className="py-3.5 px-5">Institute Details</th>
									<th className="py-3.5 px-5">School Code & Portal</th>
									<th className="py-3.5 px-5">Admin Credentials</th>
									<th className="py-3.5 px-5 text-center">Modules Active</th>
									<th className="py-3.5 px-5 text-center">Status</th>
									<th className="py-3.5 px-5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredSchools.map((school) => {
									const feat = school.features || {};
									const activeCount = Object.entries(feat).filter(
										([k, v]) => v === 1 && k !== "updatedAt" && k !== "id" && k !== "schoolId"
									).length;

									return (
										<tr key={school.id} className="hover:bg-slate-50/70 transition-colors">
											{/* School Info */}
											<td className="py-4 px-5">
												<div className="flex items-center gap-3">
													<div
														className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs"
														style={{ backgroundColor: school.themePrimary || "#2563eb" }}
													>
														{school.name.charAt(0)}
													</div>
													<div>
														<div className="font-bold text-slate-900 text-sm leading-tight">
															{school.name}
														</div>
														<div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
															<MapPin className="w-3 h-3 text-slate-400" />
															<span>{school.city || "Bangalore"}, {school.state || "Karnataka"}</span>
															{school.brand && (
																<span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
																	{school.brand}
																</span>
															)}
														</div>
													</div>
												</div>
											</td>

											{/* Code & 1-Click Copy */}
											<td className="py-4 px-5">
												<div className="flex items-center gap-2">
													<span className="px-2.5 py-1 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
														{school.code}
													</span>
													<button
														type="button"
														onClick={() => handleCopyUrl(school.code)}
														className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition"
														title="Copy Public Login URL"
													>
														{copiedCode === school.code ? (
															<Check className="w-3.5 h-3.5 text-emerald-600" />
														) : (
															<Copy className="w-3.5 h-3.5" />
														)}
													</button>
													<Link
														href={`/${school.code}/login`}
														target="_blank"
														className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition"
														title="Open Portal in New Tab"
													>
														<ExternalLink className="w-3.5 h-3.5" />
													</Link>
												</div>
												<div className="text-[10px] text-slate-400 mt-1 font-mono">
													/{school.code}/login
												</div>
											</td>

											{/* Admin Credentials */}
											<td className="py-4 px-5">
												<div className="space-y-0.5">
													<div className="font-mono text-[11px] font-bold text-slate-800">
														Username: {school.adminUser?.username || "Admin"}
													</div>
													<div className="font-mono text-[11px] text-slate-500">
														Pass: {school.adminUser?.plainPassword || "••••••••"}
													</div>
												</div>
											</td>

											{/* Active Modules Badge */}
											<td className="py-4 px-5 text-center">
												<button
													type="button"
													onClick={() => openFeatureModal(school)}
													className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition hover:scale-105 shadow-2xs border bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
												>
													<SlidersHorizontal className="w-3 h-3" />
													<span>{activeCount} / {MODULE_DEFINITIONS.length} Modules</span>
												</button>
											</td>

											{/* Status */}
											<td className="py-4 px-5 text-center">
												<span
													className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
														school.status === "active"
															? "bg-emerald-50 text-emerald-700 border-emerald-200"
															: "bg-amber-50 text-amber-700 border-amber-200"
													}`}
												>
													<span
														className={`w-1.5 h-1.5 rounded-full ${
															school.status === "active" ? "bg-emerald-500" : "bg-amber-500"
														}`}
													/>
													<span className="capitalize">{school.status || "active"}</span>
												</span>
											</td>

											{/* Action Buttons */}
											<td className="py-4 px-5 text-right">
												<div className="flex items-center justify-end gap-1">
													<button
														type="button"
														onClick={() => openFeatureModal(school)}
														className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition"
														title="Configure Enabled Modules"
													>
														<SlidersHorizontal className="w-3.5 h-3.5" />
													</button>

													<button
														type="button"
														onClick={() => handleResetPassword(school)}
														className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-amber-600 transition"
														title="Reset Admin Password"
													>
														<KeyRound className="w-3.5 h-3.5" />
													</button>

													<button
														type="button"
														onClick={() => handleToggleStatus(school)}
														className={`p-1.5 rounded-lg border transition ${
															school.status === "active"
																? "border-slate-200 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600"
																: "border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600"
														}`}
														title={school.status === "active" ? "Suspend School" : "Activate School"}
													>
														{school.status === "active" ? (
															<Ban className="w-3.5 h-3.5" />
														) : (
															<CheckCircle className="w-3.5 h-3.5" />
														)}
													</button>

													<button
														type="button"
														onClick={() => handleDeleteSchool(school)}
														className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
														title="Delete School"
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

			{/* ============================================================== */}
			{/* MODAL 1: REGISTER NEW SCHOOL (WHITE THEME)                     */}
			{/* ============================================================== */}
			{isAddModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						{/* Header */}
						<div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
									<Building2 className="w-5 h-5" />
								</div>
								<div>
									<h2 className="text-lg font-black text-slate-900 tracking-tight">
										Register New School Tenant
									</h2>
									<p className="text-xs text-slate-500">
										Create isolated institute tenant with custom URL and selected module suite.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsAddModalOpen(false)}
								className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Form Content */}
						<form onSubmit={handleCreateSchool} className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Section 1: Basic Identity */}
							<div>
								<h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
									<Building2 className="w-3.5 h-3.5" />
									<span>Institute Identity & Portal URL</span>
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">
											School / Institute Name *
										</label>
										<input
											type="text"
											required
											value={newSchool.name}
											onChange={(e) => {
												const val = e.target.value;
												const autoCode = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20);
												setNewSchool({ ...newSchool, name: val, code: newSchool.code ? newSchool.code : autoCode });
											}}
											placeholder="e.g. Resonance Delhi, DPS Bangalore"
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">
											Unique School Code (URL Slug) *
										</label>
										<div className="relative">
											<input
												type="text"
												required
												pattern="^[a-z0-9-]+$"
												value={newSchool.code}
												onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value.toLowerCase().trim() })}
												placeholder="e.g. resonance-delhi, zenith"
												className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
											/>
										</div>
										<p className="text-[10px] text-slate-400 mt-1 font-mono">
											Login URL: /{newSchool.code || "your-code"}/login
										</p>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">City</label>
										<input
											type="text"
											value={newSchool.city}
											onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
											placeholder="Bangalore, Delhi, Mumbai..."
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">State</label>
										<input
											type="text"
											value={newSchool.state}
											onChange={(e) => setNewSchool({ ...newSchool, state: e.target.value })}
											placeholder="Karnataka, Delhi..."
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
										<input
											type="email"
											value={newSchool.contactEmail}
											onChange={(e) => setNewSchool({ ...newSchool, contactEmail: e.target.value })}
											placeholder="contact@school.com"
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
										<input
											type="text"
											value={newSchool.tagline}
											onChange={(e) => setNewSchool({ ...newSchool, tagline: e.target.value })}
											placeholder="Transforming Minds Through Rigor..."
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>
								</div>
							</div>

							{/* Section 2: Administrator Credentials */}
							<div className="pt-4 border-t border-slate-100">
								<h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
									<UserCheck className="w-3.5 h-3.5" />
									<span>Initial School Administrator Access</span>
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">Admin Full Name</label>
										<input
											type="text"
											required
											value={newSchool.adminFullName}
											onChange={(e) => setNewSchool({ ...newSchool, adminFullName: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">Admin Username</label>
										<input
											type="text"
											required
											value={newSchool.adminUsername}
											onChange={(e) => setNewSchool({ ...newSchool, adminUsername: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-slate-700 mb-1">Admin Password</label>
										<input
											type="text"
											required
											value={newSchool.adminPassword}
											onChange={(e) => setNewSchool({ ...newSchool, adminPassword: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
										/>
									</div>
								</div>
							</div>

							{/* Section 3: 20-Module Feature Matrix Selector */}
							<div className="pt-4 border-t border-slate-100">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
										<Layers className="w-3.5 h-3.5" />
										<span>Subscribed Module Matrix (20 Features)</span>
									</h3>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => {
												const allOn = MODULE_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.key]: 1 }), {});
												setNewSchoolFeatures(allOn);
											}}
											className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold"
										>
											Select All
										</button>
										<button
											type="button"
											onClick={() => {
												const core = MODULE_DEFINITIONS.reduce(
													(acc, m) => ({
														...acc,
														[m.key]: ["academic", "students", "teachers", "attendance", "fees", "notices"].includes(m.key) ? 1 : 0,
													}),
													{}
												);
												setNewSchoolFeatures(core);
											}}
											className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
										>
											Core Only
										</button>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									{MODULE_DEFINITIONS.map((mod) => {
										const isChecked = newSchoolFeatures[mod.key] === 1;
										return (
											<label
												key={mod.key}
												className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
													isChecked
														? "bg-indigo-50/50 border-indigo-200 text-slate-900"
														: "bg-slate-50 border-slate-200 text-slate-500 opacity-60"
												}`}
											>
												<input
													type="checkbox"
													checked={isChecked}
													onChange={(e) => {
														setNewSchoolFeatures({
															...newSchoolFeatures,
															[mod.key]: e.target.checked ? 1 : 0,
														});
													}}
													className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
												/>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between">
														<span className="font-bold text-xs">{mod.label}</span>
														<span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
															{mod.category}
														</span>
													</div>
													<p className="text-[11px] text-slate-500 truncate mt-0.5">{mod.desc}</p>
												</div>
											</label>
										);
									})}
								</div>
							</div>

							{/* Actions */}
							<div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
								<button
									type="button"
									onClick={() => setIsAddModalOpen(false)}
									className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 active:scale-95"
								>
									Provision School Tenant
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ============================================================== */}
			{/* MODAL 2: EDIT MODULE MATRIX FOR SCHOOL (WHITE THEME)           */}
			{/* ============================================================== */}
			{isFeatureModalOpen && selectedSchool && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						{/* Header */}
						<div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
									<SlidersHorizontal className="w-5 h-5" />
								</div>
								<div>
									<h2 className="text-lg font-black text-slate-900 tracking-tight">
										Configure Module Entitlements
									</h2>
									<p className="text-xs text-slate-500">
										Tenant: <strong className="text-slate-800">{selectedSchool.name}</strong> ({selectedSchool.code})
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsFeatureModalOpen(false)}
								className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Presets & Controls */}
						<div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
							<span className="font-semibold text-slate-500">Quick Presets:</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => {
										const allOn = MODULE_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.key]: 1 }), {});
										setFeatureEditMap(allOn);
									}}
									className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px]"
								>
									Enable All (20)
								</button>
								<button
									type="button"
									onClick={() => {
										const core = MODULE_DEFINITIONS.reduce(
											(acc, m) => ({
												...acc,
												[m.key]: ["academic", "students", "teachers", "attendance", "fees", "notices"].includes(m.key) ? 1 : 0,
											}),
											{}
										);
										setFeatureEditMap(core);
									}}
									className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
								>
									Core Modules Only
								</button>
							</div>
						</div>

						{/* Module List with Toggles */}
						<div className="flex-1 overflow-y-auto p-6 space-y-2.5">
							{MODULE_DEFINITIONS.map((mod) => {
								const isEnabled = featureEditMap[mod.key] === 1;
								return (
									<div
										key={mod.key}
										className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
											isEnabled ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-50/70 border-slate-200 opacity-60"
										}`}
									>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-bold text-slate-900 text-xs">{mod.label}</span>
												<span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
													{mod.category}
												</span>
											</div>
											<p className="text-[11px] text-slate-500 mt-0.5">{mod.desc}</p>
										</div>

										<button
											type="button"
											onClick={() => {
												setFeatureEditMap({
													...featureEditMap,
													[mod.key]: isEnabled ? 0 : 1,
												});
											}}
											className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
												isEnabled ? "bg-indigo-600" : "bg-slate-300"
											}`}
										>
											<span
												className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
													isEnabled ? "translate-x-5" : "translate-x-0"
												}`}
											/>
										</button>
									</div>
								);
							})}
						</div>

						{/* Footer */}
						<div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/70">
							<button
								type="button"
								onClick={() => setIsFeatureModalOpen(false)}
								className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSaveFeatures}
								className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
							>
								Save Module Entitlements
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

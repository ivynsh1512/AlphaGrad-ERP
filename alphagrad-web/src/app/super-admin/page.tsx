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
} from "lucide-react";

const MODULE_DEFINITIONS = [
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
	{ key: "fees", label: "Fees & Razorpay", category: "Finance", desc: "Fee structures, obligations & online checkout" },
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
			const [statsRes, schoolsRes] = await Promise.all([
				api.superAdmin.getStats(),
				api.superAdmin.getSchools(),
			]);
			setStats(statsRes);
			setSchools(schoolsRes.schools || []);
		} catch (err) {
			console.error("Failed to load super admin data", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleCopyUrl = (code: string) => {
		const url = `https://erp.novaxai.in/${code}/login`;
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

	// Save Updated Features
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
			setIsAddModalOpen(false);
			setActionMessage(`Institute "${newSchool.name}" registered with code "${newSchool.code.toLowerCase()}"!`);
			// Reset form
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
	const handleResetAdminPassword = async (school: any) => {
		const newPass = prompt(`Enter new password for ${school.name} Admin:`, `Alpha@${Math.floor(1000 + Math.random() * 9000)}`);
		if (!newPass) return;

		try {
			const res = await api.superAdmin.resetAdminPassword(school.id, newPass);
			alert(`Admin password for ${res.username} reset to:\n${res.password}`);
			await loadData();
		} catch (err: any) {
			alert(err?.message || "Failed to reset password");
		}
	};

	const filteredSchools = schools.filter(
		(s) =>
			s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="space-y-8">
			{/* Top Action Notification */}
			{actionMessage && (
				<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-in fade-in duration-200">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-5 h-5 shrink-0" />
						<span>{actionMessage}</span>
					</div>
					<button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-emerald-200">
						✕
					</button>
				</div>
			)}

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Institutes</span>
						<div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
							<Building2 className="w-5 h-5" />
						</div>
					</div>
					<div className="mt-4 text-3xl font-extrabold text-white">{stats?.totalSchools ?? 0}</div>
					<div className="mt-1 text-xs text-slate-500">{stats?.activeSchools ?? 0} Active Subscriptions</div>
				</div>

				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Students</span>
						<div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
							<Users className="w-5 h-5" />
						</div>
					</div>
					<div className="mt-4 text-3xl font-extrabold text-white">{stats?.totalStudents ?? 0}</div>
					<div className="mt-1 text-xs text-slate-500">Enrolled across all schools</div>
				</div>

				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Faculty</span>
						<div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
							<GraduationCap className="w-5 h-5" />
						</div>
					</div>
					<div className="mt-4 text-3xl font-extrabold text-white">{stats?.totalTeachers ?? 0}</div>
					<div className="mt-1 text-xs text-slate-500">Teachers actively assigned</div>
				</div>

				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ERP Capabilities</span>
						<div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
							<Layers className="w-5 h-5" />
						</div>
					</div>
					<div className="mt-4 text-3xl font-extrabold text-white">20 Modules</div>
					<div className="mt-1 text-xs text-slate-500">Independently toggleable per school</div>
				</div>
			</div>

			{/* Controls & Schools List */}
			<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
					<div>
						<h2 className="text-xl font-bold text-white tracking-tight">Registered Institutes & Schools</h2>
						<p className="text-xs text-slate-400 mt-1">
							Assign unique school codes, configure feature access, and manage institute administrators.
						</p>
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto">
						<div className="relative flex-1 sm:w-64">
							<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search school or code..."
								className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<button
							onClick={() => setIsAddModalOpen(true)}
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 shrink-0"
						>
							<Plus className="w-4 h-4" />
							<span>Register School</span>
						</button>
					</div>
				</div>

				{/* School Cards / Table */}
				{loading ? (
					<div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
						<RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
						Loading institutes from Cloudflare D1...
					</div>
				) : filteredSchools.length === 0 ? (
					<div className="py-16 text-center text-slate-500 text-sm">
						No institutes found. Click "Register School" to create your first school!
					</div>
				) : (
					<div className="mt-6 grid grid-cols-1 gap-4">
						{filteredSchools.map((school) => {
							const featCount = school.features
								? Object.entries(school.features).filter(([k, v]) => v === 1 && k !== "updatedAt").length
								: 20;

							return (
								<div
									key={school.id}
									className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
								>
									{/* School Info */}
									<div className="flex items-start gap-4">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-900/60 to-slate-800 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg shrink-0">
											{school.name.charAt(0)}
										</div>

										<div>
											<div className="flex items-center gap-2 flex-wrap">
												<h3 className="font-bold text-base text-white">{school.name}</h3>
												<span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
													{school.code}
												</span>
												<span
													className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
														school.status === "active"
															? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
															: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
													}`}
												>
													{school.status.toUpperCase()}
												</span>
											</div>

											<div className="mt-1 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
												<span>
													{school.city}, {school.state}
												</span>
												<span>•</span>
												<span>{school.studentCount} Students</span>
												<span>•</span>
												<span>{school.teacherCount} Teachers</span>
												<span>•</span>
												<span className="text-indigo-400 font-medium">{featCount} / 20 Modules Active</span>
											</div>

											{/* Admin Credentials Badge */}
											{school.adminUser && (
												<div className="mt-2.5 inline-flex items-center gap-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
													<span className="text-slate-500">Admin Login:</span>
													<span className="font-mono font-medium text-slate-200">
														{school.adminUser.username}
													</span>
													<span className="text-slate-600">/</span>
													<span className="font-mono text-slate-400">
														{school.adminUser.plainPassword || "••••••••"}
													</span>
													<button
														type="button"
														onClick={() => handleResetAdminPassword(school)}
														className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold underline ml-1"
													>
														Reset Pass
													</button>
												</div>
											)}
										</div>
									</div>

									{/* School Actions */}
									<div className="flex items-center gap-2.5 self-stretch lg:self-auto justify-end border-t border-slate-800 lg:border-t-0 pt-3 lg:pt-0">
										{/* Copy Login URL */}
										<button
											onClick={() => handleCopyUrl(school.code)}
											className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors"
											title="Copy portal URL"
										>
											{copiedCode === school.code ? (
												<>
													<Check className="w-3.5 h-3.5 text-emerald-400" />
													<span className="text-emerald-400 font-medium">Copied!</span>
												</>
											) : (
												<>
													<Copy className="w-3.5 h-3.5 text-slate-400" />
													<span>Copy URL</span>
												</>
											)}
										</button>

										{/* Manage Features */}
										<button
											onClick={() => openFeatureModal(school)}
											className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
										>
											<SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
											<span>Manage Features</span>
										</button>

										{/* Launch Portal */}
										<Link
											href={`/${school.code}/login`}
											target="_blank"
											className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
										>
											<span>Launch</span>
											<ExternalLink className="w-3.5 h-3.5" />
										</Link>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ========================================================= */}
			{/* MODAL 1: ADD NEW SCHOOL */}
			{/* ========================================================= */}
			{isAddModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
					<div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
						<div className="flex items-center justify-between border-b border-slate-800 pb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
									<Building2 className="w-6 h-6" />
								</div>
								<div>
									<h3 className="text-lg font-bold text-white">Register New School / Coaching Institute</h3>
									<p className="text-xs text-slate-400">
										Creates an isolated tenant environment, school code, admin credentials, and initial feature pack.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsAddModalOpen(false)}
								className="text-slate-400 hover:text-white text-xl p-1"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleCreateSchool} className="space-y-6">
							{/* Institute Basics */}
							<div>
								<h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
									1. Institute Information
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">
											Institute Name *
										</label>
										<input
											type="text"
											required
											value={newSchool.name}
											onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
											placeholder="e.g. Delhi Public School Bangalore"
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">
											Unique School Code (Slug) *
										</label>
										<div className="flex items-center">
											<span className="px-3 py-2.5 bg-slate-800 text-slate-400 border border-r-0 border-slate-700 rounded-l-xl text-xs">
												erp.novaxai.in/
											</span>
											<input
												type="text"
												required
												value={newSchool.code}
												onChange={(e) =>
													setNewSchool({
														...newSchool,
														code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
													})
												}
												placeholder="dps-blr"
												className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-r-xl text-xs font-mono text-indigo-300 focus:ring-2 focus:ring-indigo-500"
											/>
										</div>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">Contact Email</label>
										<input
											type="email"
											value={newSchool.contactEmail}
											onChange={(e) => setNewSchool({ ...newSchool, contactEmail: e.target.value })}
											placeholder="admin@school.edu"
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
										<input
											type="text"
											value={newSchool.contactPhone}
											onChange={(e) => setNewSchool({ ...newSchool, contactPhone: e.target.value })}
											placeholder="+91-9876543210"
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">City</label>
										<input
											type="text"
											value={newSchool.city}
											onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">State</label>
										<input
											type="text"
											value={newSchool.state}
											onChange={(e) => setNewSchool({ ...newSchool, state: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								</div>
							</div>

							{/* School Admin Provisioning */}
							<div className="pt-4 border-t border-slate-800">
								<h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
									2. Initial School Administrator Credentials
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name</label>
										<input
											type="text"
											required
											value={newSchool.adminFullName}
											onChange={(e) => setNewSchool({ ...newSchool, adminFullName: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">Admin Username</label>
										<input
											type="text"
											required
											value={newSchool.adminUsername}
											onChange={(e) => setNewSchool({ ...newSchool, adminUsername: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-slate-300 mb-1">Initial Password</label>
										<input
											type="text"
											required
											value={newSchool.adminPassword}
											onChange={(e) => setNewSchool({ ...newSchool, adminPassword: e.target.value })}
											className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white"
										/>
									</div>
								</div>
							</div>

							{/* Feature Matrix Selector */}
							<div className="pt-4 border-t border-slate-800">
								<div className="flex items-center justify-between mb-3">
									<div>
										<h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
											3. Select Features to Grant to this School
										</h4>
										<p className="text-[11px] text-slate-400">
											Only selected features will be visible in their admin, teacher, and student portals.
										</p>
									</div>

									<div className="flex items-center gap-2 text-xs">
										<button
											type="button"
											onClick={() => {
												const allOn = MODULE_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.key]: 1 }), {});
												setNewSchoolFeatures(allOn);
											}}
											className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold hover:bg-indigo-500/30 text-[11px]"
										>
											Select All (20)
										</button>
										<button
											type="button"
											onClick={() => {
												// Core only preset
												const coreOnly = MODULE_DEFINITIONS.reduce(
													(acc, m) => ({
														...acc,
														[m.key]: ["academic", "students", "teachers", "attendance", "fees", "notices"].includes(m.key) ? 1 : 0,
													}),
													{}
												);
												setNewSchoolFeatures(coreOnly);
											}}
											className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-[11px]"
										>
											Core Only (6)
										</button>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1 bg-slate-950/40 rounded-2xl border border-slate-800">
									{MODULE_DEFINITIONS.map((mod) => {
										const isChecked = newSchoolFeatures[mod.key] === 1;
										return (
											<label
												key={mod.key}
												className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
													isChecked
														? "bg-indigo-950/30 border-indigo-500/40 text-slate-100"
														: "bg-slate-950/20 border-slate-800 text-slate-400"
												}`}
											>
												<input
													type="checkbox"
													checked={isChecked}
													onChange={(e) =>
														setNewSchoolFeatures({
															...newSchoolFeatures,
															[mod.key]: e.target.checked ? 1 : 0,
														})
													}
													className="mt-1 w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
												/>
												<div>
													<div className="text-xs font-semibold">{mod.label}</div>
													<div className="text-[10px] text-slate-500">{mod.desc}</div>
												</div>
											</label>
										);
									})}
								</div>
							</div>

							<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
								<button
									type="button"
									onClick={() => setIsAddModalOpen(false)}
									className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
								>
									Confirm & Launch School
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ========================================================= */}
			{/* MODAL 2: MANAGE SCHOOL FEATURES */}
			{/* ========================================================= */}
			{isFeatureModalOpen && selectedSchool && (
				<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
						<div className="flex items-center justify-between border-b border-slate-800 pb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
									<SlidersHorizontal className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-white">
										Manage Features for: {selectedSchool.name}
									</h3>
									<p className="text-xs text-slate-400">
										Toggle features ON or OFF in real-time. Disabled features disappear immediately from this school's portals.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsFeatureModalOpen(false)}
								className="text-slate-400 hover:text-white text-xl p-1"
							>
								✕
							</button>
						</div>

						{/* Quick Presets */}
						<div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
							<span className="text-slate-400 font-medium">Bulk Action Presets:</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => {
										const allOn = MODULE_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.key]: 1 }), {});
										setFeatureEditMap(allOn);
									}}
									className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold hover:bg-indigo-500/30 text-[11px]"
								>
									Enable All (Full Suite)
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
									className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-[11px]"
								>
									Basic Core
								</button>
							</div>
						</div>

						{/* Feature List */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
							{MODULE_DEFINITIONS.map((mod) => {
								const isEnabled = featureEditMap[mod.key] === 1;
								return (
									<div
										key={mod.key}
										onClick={() =>
											setFeatureEditMap({
												...featureEditMap,
												[mod.key]: isEnabled ? 0 : 1,
											})
										}
										className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between gap-3 ${
											isEnabled
												? "bg-indigo-950/20 border-indigo-500/30 text-white"
												: "bg-slate-950/40 border-slate-800 text-slate-500 opacity-60"
										}`}
									>
										<div>
											<div className="text-xs font-semibold flex items-center gap-1.5">
												<span>{mod.label}</span>
												{mod.category === "AI Suite" && (
													<span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[9px] rounded font-bold">
														AI
													</span>
												)}
											</div>
											<div className="text-[10px] text-slate-400 mt-0.5">{mod.desc}</div>
										</div>

										<div
											className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
												isEnabled ? "bg-indigo-600" : "bg-slate-800"
											}`}
										>
											<div
												className={`w-5 h-5 rounded-full bg-white transition-transform ${
													isEnabled ? "translate-x-5" : "translate-x-0"
												}`}
											></div>
										</div>
									</div>
								);
							})}
						</div>

						<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
							<button
								type="button"
								onClick={() => setIsFeatureModalOpen(false)}
								className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSaveFeatures}
								className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
							>
								Save Feature Changes
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

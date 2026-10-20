"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
	BookMarked,
	Plus,
	Search,
	X,
	AlertCircle,
	CheckCircle2,
	Trash2,
	Layers,
	GraduationCap,
	Sparkles,
	BookOpen,
	ArrowRight,
} from "lucide-react";

interface Subject {
	id: string;
	name: string;
	code: string;
	description?: string | null;
	createdAt?: number;
}

const COMMON_SUBJECT_PRESETS = [
	{ name: "French", code: "FRE", description: "French Language & Literature (Secondary & Sr. Secondary)" },
	{ name: "Sanskrit", code: "SKT", description: "Sanskrit Language & Grammar (Secondary & Sr. Secondary)" },
	{ name: "Computer Science", code: "CS", description: "Computer Science & Information Technology" },
	{ name: "Economics", code: "ECO", description: "Economics & Indian Economic Development" },
	{ name: "Psychology", code: "PSY", description: "Psychology & Behavioral Sciences (NIOS / CBSE)" },
	{ name: "Business Studies", code: "BST", description: "Principles of Business & Management" },
	{ name: "Accountancy", code: "ACC", description: "Financial Accounting & Bookkeeping" },
	{ name: "Political Science", code: "POL", description: "Indian Constitution, Politics & Governance" },
	{ name: "Sociology", code: "SOC", description: "Structure of Indian Society & Social Change" },
	{ name: "Data Entry Operations", code: "DEO", description: "NIOS Vocational & Practical Data Operations" },
	{ name: "Physics", code: "PHY", description: "Physics for Secondary, Sr. Secondary & Competitive Exams" },
	{ name: "Chemistry", code: "CHE", description: "Chemistry (Inorganic, Organic & Physical)" },
	{ name: "Mathematics", code: "MATH", description: "Pure & Applied Mathematics" },
	{ name: "Biology", code: "BIO", description: "Botany, Zoology & Life Sciences" },
	{ name: "English Language & Lit", code: "ENG", description: "English Core & Elective Curriculum" },
	{ name: "Social Studies", code: "SST", description: "History, Geography, Civics & Economics" },
];

export default function AdminSubjectsPage() {
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [form, setForm] = useState({
		name: "",
		code: "",
		description: "",
	});

	useEffect(() => {
		loadSubjects();
	}, []);

	async function loadSubjects() {
		setLoading(true);
		setError(null);
		try {
			const res = await api.academic.subjects();
			setSubjects(res.subjects || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load academic subjects.");
		} finally {
			setLoading(false);
		}
	}

	const handleOpenModal = (preset?: typeof COMMON_SUBJECT_PRESETS[0]) => {
		if (preset) {
			setForm({
				name: preset.name,
				code: preset.code,
				description: preset.description,
			});
		} else {
			setForm({ name: "", code: "", description: "" });
		}
		setError(null);
		setIsModalOpen(true);
	};

	const handleCreateSubject = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim() || !form.code.trim()) {
			setError("Subject name and code are mandatory.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.academic.createSubject({
				name: form.name.trim(),
				code: form.code.trim().toUpperCase(),
				description: form.description.trim() || undefined,
			});

			setSuccessMsg(`Subject "${form.name.trim()}" created successfully!`);
			setIsModalOpen(false);
			setForm({ name: "", code: "", description: "" });
			setTimeout(() => setSuccessMsg(null), 4000);
			await loadSubjects();
		} catch (err: any) {
			setError(err?.message || "Failed to create subject.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteSubject = async (sub: Subject) => {
		const confirmDelete = window.confirm(
			`Are you sure you want to delete subject "${sub.name}" (${sub.code})?\n\nThis will remove the subject from curriculum listings, timetables, and teacher assignments.`
		);
		if (!confirmDelete) return;

		try {
			await api.academic.deleteSubject(sub.id);
			setSuccessMsg(`Subject "${sub.name}" removed successfully.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadSubjects();
		} catch (err: any) {
			alert(`Failed to delete subject: ${err?.message || "Server error"}`);
		}
	};

	const filteredSubjects = subjects.filter((s) => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return true;
		return (
			s.name.toLowerCase().includes(query) ||
			s.code.toLowerCase().includes(query) ||
			(s.description && s.description.toLowerCase().includes(query))
		);
	});

	// Quick check if preset subject is already added
	const existingCodes = new Set(subjects.map((s) => s.code.toUpperCase()));

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-12">
			{/* Top Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center space-x-2">
						<span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
							Institute Curriculum
						</span>
						<span className="text-xs text-slate-400">•</span>
						<span className="text-xs text-slate-500 font-medium">Academic Catalog</span>
					</div>
					<h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
						Subjects Management
					</h1>
					<p className="text-xs text-slate-500 mt-1">
						Define academic subjects (e.g. French, Sanskrit, Mathematics, Physics), assign official curriculum codes, and allocate faculty.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Link
						href="/admin/classes"
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs transition"
					>
						<BookOpen className="w-3.5 h-3.5 text-slate-500" />
						Classes & Batches
					</Link>
					<button
						onClick={() => handleOpenModal()}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
					>
						<Plus className="w-4 h-4" />
						Add New Subject
					</button>
				</div>
			</div>

			{/* Success Alert */}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
						<span>{successMsg}</span>
					</div>
					<button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Error Alert */}
			{error && !isModalOpen && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between animate-fadeIn">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 flex-shrink-0" />
						<span>{error}</span>
					</div>
					<button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Summary Metrics & Quick Add Bar */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Total Subjects</span>
						<div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
							<BookMarked className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{subjects.length}
						</span>
						<span className="text-xs font-bold text-slate-500">Active Offerings</span>
					</div>
					<p className="text-[11px] text-slate-400 mt-1">Available across CBSE, ICSE & NIOS cohorts</p>
				</div>

				<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Curriculum Portions</span>
						<div className="p-2 rounded-xl bg-purple-50 text-purple-600">
							<Layers className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{subjects.filter((s) => s.code).length}
						</span>
						<span className="text-xs font-bold text-purple-600">Configured Codes</span>
					</div>
					<div className="mt-2">
						<Link
							href="/admin/syllabus"
							className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
						>
							Manage Chapters & Syllabus <ArrowRight className="w-3 h-3" />
						</Link>
					</div>
				</div>

				<div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl border border-indigo-950 text-white shadow-xs flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-1.5 text-indigo-200 text-xs font-bold uppercase tracking-wider">
							<Sparkles className="w-3.5 h-3.5 text-amber-400" />
							<span>Quick Subject Setup</span>
						</div>
						<p className="text-xs text-slate-300 mt-1.5">
							Need to add a language or elective like French or Sanskrit? Click to quickly register a new subject.
						</p>
					</div>
					<button
						onClick={() => handleOpenModal()}
						className="mt-3 w-full py-2 px-3 bg-white text-indigo-950 font-bold text-xs rounded-xl hover:bg-slate-100 transition shadow-xs text-center"
					>
						+ Add Subject Now
					</button>
				</div>
			</div>

			{/* Common Subject Quick Presets */}
			<div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
							Quick Add Common Subjects & Electives
						</h3>
						<p className="text-[11px] text-slate-500">
							Click any unadded subject below to prefill and add it instantly to your institute catalog:
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 pt-1">
					{COMMON_SUBJECT_PRESETS.map((preset) => {
						const isAdded = existingCodes.has(preset.code.toUpperCase());
						return (
							<button
								key={preset.code}
								type="button"
								disabled={isAdded}
								onClick={() => handleOpenModal(preset)}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
									isAdded
										? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
										: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 active:scale-95"
								}`}
								title={isAdded ? "Subject already registered" : `Click to add ${preset.name}`}
							>
								{isAdded ? (
									<CheckCircle2 className="w-3 h-3 text-slate-400" />
								) : (
									<Plus className="w-3 h-3 text-indigo-600" />
								)}
								<span>{preset.name}</span>
								<span className="text-[10px] font-mono opacity-60">({preset.code})</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Search & Action Bar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="relative flex-1 max-w-md">
					<Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search subjects by name, code or description..."
						className="w-full pl-9 pr-4 py-2 bg-white text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-xs"
					/>
				</div>

				<div className="text-xs text-slate-500 font-medium">
					Showing <span className="font-bold text-slate-800">{filteredSubjects.length}</span> of {subjects.length} subjects
				</div>
			</div>

			{/* Subjects List / Grid */}
			{loading ? (
				<div className="bg-white p-16 rounded-2xl border border-slate-200 text-center">
					<div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-xs text-slate-500 font-semibold">Loading subjects directory...</p>
				</div>
			) : filteredSubjects.length === 0 ? (
				<div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
					<div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
						<BookMarked className="w-6 h-6" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-slate-900">
							{searchQuery ? "No matching subjects found" : "No subjects added yet"}
						</h3>
						<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
							{searchQuery
								? `No subjects match "${searchQuery}". Try a different search term or add a new subject.`
								: "Begin organizing your curriculum by registering your first subject (e.g. Physics, Mathematics, French)."}
						</p>
					</div>
					<button
						onClick={() => handleOpenModal()}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
					>
						<Plus className="w-4 h-4" />
						Add First Subject
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredSubjects.map((sub) => (
						<div
							key={sub.id}
							className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between group"
						>
							<div className="space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 border border-indigo-200/60 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 shadow-2xs">
											{sub.code.slice(0, 3)}
										</div>
										<div>
											<h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
												{sub.name}
											</h3>
											<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 mt-0.5">
												CODE: {sub.code}
											</span>
										</div>
									</div>

									<button
										onClick={() => handleDeleteSubject(sub)}
										className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
										title={`Delete ${sub.name}`}
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>

								<p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
									{sub.description || "Core subject curriculum offering for enrolled students."}
								</p>
							</div>

							<div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
								<Link
									href={`/admin/syllabus?subject=${sub.id}`}
									className="text-indigo-600 font-bold hover:text-indigo-800 inline-flex items-center gap-1 text-[11px]"
								>
									<Layers className="w-3 h-3" />
									<span>Chapters</span>
								</Link>

								<Link
									href="/admin/teachers"
									className="text-slate-500 font-semibold hover:text-slate-900 inline-flex items-center gap-1 text-[11px]"
								>
									<GraduationCap className="w-3.5 h-3.5 text-slate-400" />
									<span>Assign Faculty</span>
								</Link>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add Subject Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
									<BookMarked className="w-4 h-4" />
								</div>
								<div>
									<h3 className="font-bold text-slate-900 text-sm">Add New Academic Subject</h3>
									<p className="text-[11px] text-slate-500">Register a subject into the institute curriculum</p>
								</div>
							</div>
							<button
								onClick={() => setIsModalOpen(false)}
								className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{error && (
							<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						{/* Quick preset selector inside modal */}
						<div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
							<p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
								Quick Presets:
							</p>
							<div className="flex flex-wrap gap-1.5">
								{COMMON_SUBJECT_PRESETS.slice(0, 8).map((preset) => (
									<button
										key={preset.code}
										type="button"
										onClick={() => {
											setForm({
												name: preset.name,
												code: preset.code,
												description: preset.description,
											});
										}}
										className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition"
									>
										+ {preset.name}
									</button>
								))}
							</div>
						</div>

						<form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Subject Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									required
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									placeholder="e.g. French, Sanskrit, Psychology, Mathematics"
									className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Subject Code <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									required
									value={form.code}
									onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
									placeholder="e.g. FRE, SKT, PSY, MATH"
									className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono uppercase"
								/>
								<p className="text-[10px] text-slate-400 mt-1">
									Unique identifier used in timetables, assessments, and gradebooks.
								</p>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Description & Curriculum Stream
								</label>
								<textarea
									rows={2}
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									placeholder="e.g. NIOS Senior Secondary French curriculum and literature"
									className="w-full px-3.5 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
								>
									{submitting ? "Saving..." : "Save Subject"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

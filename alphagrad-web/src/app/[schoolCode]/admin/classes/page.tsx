"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BookOpen, Plus, Layers, X, AlertCircle, CheckCircle2, Trash2, School, GraduationCap, BookMarked, Sparkles } from "lucide-react";
import BouncingLoader from "@/components/BouncingLoader";

export default function AdminClassesPage() {
	const [activeTab, setActiveTab] = useState<"batches" | "classes" | "subjects">("batches");
	const [classes, setClasses] = useState<any[]>([]);
	const [batches, setBatches] = useState<any[]>([]);
	const [subjects, setSubjects] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Modals
	const [isClassOpen, setIsClassOpen] = useState(false);
	const [isBatchOpen, setIsBatchOpen] = useState(false);
	const [isSubjectOpen, setIsSubjectOpen] = useState(false);

	const [classForm, setClassForm] = useState({ name: "", code: "", description: "" });
	const [batchForm, setBatchForm] = useState({ classId: "", name: "", code: "", capacity: 40 });
	const [subjectForm, setSubjectForm] = useState({ name: "", code: "", description: "" });
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			const tab = params.get("tab");
			if (tab === "subjects" || tab === "classes" || tab === "batches") {
				setActiveTab(tab);
			}
		}
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		setError(null);
		try {
			const [clsRes, batchRes, subRes] = await Promise.all([
				api.academic.classes(),
				api.academic.batches(),
				api.academic.subjects(),
			]);
			setClasses(clsRes.classes || []);
			setBatches(batchRes.batches || []);
			setSubjects(subRes.subjects || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load academic classes, batches and subjects");
		} finally {
			setLoading(false);
		}
	}

	const handleCreateClass = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.academic.createClass({
				name: classForm.name.trim(),
				code: classForm.code.trim(),
				description: classForm.description.trim() || undefined,
			});
			setIsClassOpen(false);
			setClassForm({ name: "", code: "", description: "" });
			setSuccessMsg("Academic class created successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to create class");
		} finally {
			setSubmitting(false);
		}
	};

	const handleCreateBatch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!batchForm.classId) {
			setError("Please select a target class for this batch.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await api.academic.createBatch({
				classId: batchForm.classId,
				name: batchForm.name.trim(),
				code: batchForm.code.trim() || undefined,
				capacity: Number(batchForm.capacity) || 40,
			});
			setIsBatchOpen(false);
			setBatchForm({ classId: "", name: "", code: "", capacity: 40 });
			setSuccessMsg("Batch created successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to create batch");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteBatch = async (batch: any) => {
		const confirmDelete = window.confirm(
			`Are you sure you want to delete batch "${batch.name}"?\n\nThis will remove the batch cohort and associated schedules.`
		);
		if (!confirmDelete) return;

		try {
			await api.academic.deleteBatch(batch.id);
			setSuccessMsg(`Batch "${batch.name}" deleted.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to delete batch: ${err?.message || "Server error"}`);
		}
	};

	const handleDeleteClass = async (cls: any) => {
		const batchesInClass = batches.filter((b) => b.classId === cls.id);
		if (batchesInClass.length > 0) {
			alert(
				`Cannot delete class "${cls.name}" because it currently contains ${batchesInClass.length} active batch(es). Please delete those batches first.`
			);
			return;
		}

		const confirmDelete = window.confirm(
			`Are you sure you want to delete class "${cls.name}" (${cls.code})?\n\nThis action cannot be undone.`
		);
		if (!confirmDelete) return;

		try {
			await api.academic.deleteClass(cls.id);
			setSuccessMsg(`Class "${cls.name}" deleted successfully.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to delete class: ${err?.message || "Server error"}`);
		}
	};

	const handleCreateSubject = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
			setError("Subject name and code are required.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await api.academic.createSubject({
				name: subjectForm.name.trim(),
				code: subjectForm.code.trim().toUpperCase(),
				description: subjectForm.description.trim() || undefined,
			});
			setIsSubjectOpen(false);
			setSubjectForm({ name: "", code: "", description: "" });
			setSuccessMsg("Subject registered successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to create subject");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteSubject = async (sub: any) => {
		const confirmDelete = window.confirm(
			`Are you sure you want to delete subject "${sub.name}" (${sub.code})?\n\nThis will remove the subject from timetables and allocations.`
		);
		if (!confirmDelete) return;

		try {
			await api.academic.deleteSubject(sub.id);
			setSuccessMsg(`Subject "${sub.name}" deleted.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to delete subject: ${err?.message || "Server error"}`);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Classes, Batches & Subjects</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Organize academic programs, classroom cohorts, student capacities, and subject disciplines.
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						onClick={() => setIsSubjectOpen(true)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
					>
						<Plus className="w-3.5 h-3.5" />
						Add Subject
					</button>
					<button
						onClick={() => setIsClassOpen(true)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition"
					>
						<Plus className="w-3.5 h-3.5" />
						Create Class
					</button>
					<button
						onClick={() => setIsBatchOpen(true)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
					>
						<Plus className="w-3.5 h-3.5" />
						Create Batch
					</button>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="flex items-center gap-2 border-b border-slate-200 pb-2">
				<button
					onClick={() => setActiveTab("batches")}
					className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
						activeTab === "batches"
							? "bg-indigo-50 text-indigo-700 border border-indigo-200"
							: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
					}`}
				>
					<BookOpen className="w-3.5 h-3.5" />
					Batches ({batches.length})
				</button>
				<button
					onClick={() => setActiveTab("classes")}
					className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
						activeTab === "classes"
							? "bg-indigo-50 text-indigo-700 border border-indigo-200"
							: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
					}`}
				>
					<Layers className="w-3.5 h-3.5" />
					Classes & Programs ({classes.length})
				</button>
				<button
					onClick={() => setActiveTab("subjects")}
					className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
						activeTab === "subjects"
							? "bg-indigo-50 text-indigo-700 border border-indigo-200"
							: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
					}`}
				>
					<BookMarked className="w-3.5 h-3.5" />
					Subjects ({subjects.length})
				</button>
			</div>

			{/* Alerts */}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
						<span>{successMsg}</span>
					</div>
					<button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{error && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 flex-shrink-0" />
						<span>{error}</span>
					</div>
					<button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Tab 1: Batches Grid */}
			{activeTab === "batches" && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{loading ? (
						<div className="col-span-full">
							<BouncingLoader text="Loading academic batches..." color="indigo" />
						</div>
					) : batches.length === 0 ? (
						<div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
							<BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
							<p className="font-semibold text-sm text-slate-800">No batches created yet</p>
							<p className="text-xs text-slate-400 mt-1">Click &quot;Create Batch&quot; to set up batches for students and faculty.</p>
							<button
								onClick={() => setIsBatchOpen(true)}
								className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
							>
								<Plus className="w-3.5 h-3.5" />
								Create Batch
							</button>
						</div>
					) : (
						batches.map((b) => (
							<div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition">
								<div className="space-y-2">
									<div className="flex items-start justify-between">
										<div>
											<h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
											<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
												{b.className && b.className !== b.name ? `${b.className} • ` : ""}Code: {b.code || "—"}
											</span>
										</div>
										<div className="p-2 rounded-xl bg-slate-50 text-slate-600">
											<BookOpen className="w-4 h-4" />
										</div>
									</div>

									<div className="text-xs text-slate-500 pt-1">
										Enrolled: <span className="font-semibold text-slate-800">{b.enrolledCount || 0}</span> / {b.capacity} Students
									</div>
								</div>

								<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
									<span className="text-emerald-600 font-semibold text-[11px]">Active Batch</span>
									<button
										onClick={() => handleDeleteBatch(b)}
										className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
										title="Delete Batch"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Tab 2: Classes Grid */}
			{activeTab === "classes" && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{loading ? (
						<div className="col-span-full">
							<BouncingLoader text="Loading academic classes & programs..." color="indigo" />
						</div>
					) : classes.length === 0 ? (
						<div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
							<GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
							<p className="font-semibold text-sm text-slate-800">No classes created yet</p>
							<p className="text-xs text-slate-400 mt-1">Click &quot;Create Class&quot; to define grades and curriculum streams.</p>
							<button
								onClick={() => setIsClassOpen(true)}
								className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
							>
								<Plus className="w-3.5 h-3.5" />
								Create Class
							</button>
						</div>
					) : (
						classes.map((cls) => {
							const batchCount = batches.filter((b) => b.classId === cls.id).length;
							return (
								<div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition">
									<div className="space-y-2">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
												<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
													Code: {cls.code}
												</span>
											</div>
											<div className="p-2 rounded-xl bg-slate-50 text-slate-600">
												<School className="w-4 h-4" />
											</div>
										</div>

										<p className="text-xs text-slate-500 line-clamp-2">
											{cls.description || "Curriculum & academic program cohort."}
										</p>
									</div>

									<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
										<span className="text-indigo-600 font-semibold text-[11px]">
											{batchCount} {batchCount === 1 ? "Batch" : "Batches"}
										</span>
										<button
											onClick={() => handleDeleteClass(cls)}
											className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
											title="Delete Class"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			{/* Tab 3: Subjects Grid */}
			{activeTab === "subjects" && (
				<div className="space-y-4">
					{/* Quick Preset bar */}
					<div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
						<div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
							<Sparkles className="w-3.5 h-3.5 text-indigo-600" />
							<span>Quick Add Subject Presets</span>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{[
								{ name: "French", code: "FRE", description: "French Language & Literature" },
								{ name: "Sanskrit", code: "SKT", description: "Sanskrit Language & Grammar" },
								{ name: "Computer Science", code: "CS", description: "Computer Science & IT" },
								{ name: "Economics", code: "ECO", description: "Economics & Indian Development" },
								{ name: "Psychology", code: "PSY", description: "Psychology & Behavioral Studies" },
								{ name: "Business Studies", code: "BST", description: "Principles of Business & Management" },
								{ name: "Accountancy", code: "ACC", description: "Financial Accounting" },
								{ name: "Political Science", code: "POL", description: "Political Science & Governance" },
							].map((p) => {
								const exists = subjects.some((s) => s.code?.toUpperCase() === p.code);
								return (
									<button
										key={p.code}
										type="button"
										disabled={exists}
										onClick={() => {
											setSubjectForm(p);
											setIsSubjectOpen(true);
										}}
										className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
											exists
												? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
												: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
										}`}
									>
										<span>{exists ? "✓" : "+"}</span>
										<span>{p.name}</span>
										<span className="text-[10px] font-mono opacity-60">({p.code})</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
						{loading ? (
							<div className="col-span-full">
								<BouncingLoader text="Loading academic subjects & curriculum offerings..." color="indigo" />
							</div>
						) : subjects.length === 0 ? (
							<div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
								<BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-2" />
								<p className="font-semibold text-sm text-slate-800">No subjects registered yet</p>
								<p className="text-xs text-slate-400 mt-1">Click &quot;Add Subject&quot; to configure academic offerings.</p>
								<button
									onClick={() => {
										setSubjectForm({ name: "", code: "", description: "" });
										setIsSubjectOpen(true);
									}}
									className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
								>
									<Plus className="w-3.5 h-3.5" />
									Add Subject
								</button>
							</div>
						) : (
							subjects.map((sub) => (
								<div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition">
									<div className="space-y-2">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-bold text-slate-900 text-sm">{sub.name}</h3>
												<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
													CODE: {sub.code}
												</span>
											</div>
											<div className="p-2 rounded-xl bg-slate-50 text-slate-600">
												<BookMarked className="w-4 h-4" />
											</div>
										</div>

										<p className="text-xs text-slate-500 line-clamp-2">
											{sub.description || "Academic subject curriculum offering."}
										</p>
									</div>

									<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
										<span className="text-emerald-600 font-semibold text-[11px]">Active Subject</span>
										<button
											onClick={() => handleDeleteSubject(sub)}
											className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
											title="Delete Subject"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* Create Class Modal */}
			{isClassOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">Create New Academic Class</h3>
							<button onClick={() => setIsClassOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleCreateClass} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Class Name *</label>
								<input
									type="text"
									required
									value={classForm.name}
									onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
									placeholder="e.g. NIOS Open School (9th & 10th)"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Class Code *</label>
								<input
									type="text"
									required
									value={classForm.code}
									onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
									placeholder="e.g. NIOS-9-10"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Description</label>
								<input
									type="text"
									value={classForm.description}
									onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
									placeholder="e.g. NIOS Admissions & Coaching (9:00 AM - 12:30 PM)"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsClassOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : "Save Class"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create Batch Modal */}
			{isBatchOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">Create New Batch</h3>
							<button onClick={() => setIsBatchOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Target Class *</label>
								<select
									required
									value={batchForm.classId}
									onChange={(e) => setBatchForm({ ...batchForm, classId: e.target.value })}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								>
									<option value="" className="bg-white text-slate-900">
										-- Select Class --
									</option>
									{classes.map((c) => (
										<option key={c.id} value={c.id} className="bg-white text-slate-900">
											{c.name} ({c.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Batch Name *</label>
								<input
									type="text"
									required
									value={batchForm.name}
									onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
									placeholder="e.g. NIOS Morning Session A"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Batch Code</label>
									<input
										type="text"
										value={batchForm.code}
										onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })}
										placeholder="e.g. NIOS-AM-A"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Capacity</label>
									<input
										type="number"
										value={batchForm.capacity}
										onChange={(e) => setBatchForm({ ...batchForm, capacity: Number(e.target.value) })}
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsBatchOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : "Save Batch"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create Subject Modal */}
			{isSubjectOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
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
							<button onClick={() => setIsSubjectOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Quick preset selector inside modal */}
						<div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
							<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</p>
							<div className="flex flex-wrap gap-1">
								{[
									{ name: "French", code: "FRE", description: "French Language & Literature" },
									{ name: "Sanskrit", code: "SKT", description: "Sanskrit Language & Grammar" },
									{ name: "Computer Science", code: "CS", description: "Computer Science & IT" },
									{ name: "Economics", code: "ECO", description: "Economics & Development" },
									{ name: "Psychology", code: "PSY", description: "Psychology & Behavioral Studies" },
									{ name: "Business Studies", code: "BST", description: "Principles of Business & Management" },
								].map((p) => (
									<button
										key={p.code}
										type="button"
										onClick={() => setSubjectForm(p)}
										className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition"
									>
										+ {p.name}
									</button>
								))}
							</div>
						</div>

						<form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Subject Name *</label>
								<input
									type="text"
									required
									value={subjectForm.name}
									onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
									placeholder="e.g. French, Sanskrit, Psychology, Computer Science"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Subject Code *</label>
								<input
									type="text"
									required
									value={subjectForm.code}
									onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
									placeholder="e.g. FRE, SKT, PSY, CS"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono uppercase"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Description</label>
								<input
									type="text"
									value={subjectForm.description}
									onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
									placeholder="e.g. NIOS / CBSE Senior Secondary Elective"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsSubjectOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-medium"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
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

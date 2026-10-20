"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Bell, Plus, Pin, Calendar, AlertCircle, X, Trash2, CheckCircle2, Sparkles } from "lucide-react";

export default function AdminNoticesPage() {
	const [notices, setNotices] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [form, setForm] = useState({
		title: "",
		content: "",
		targetAudience: "all",
		isPinned: false,
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadNotices();
	}, []);

	async function loadNotices() {
		setLoading(true);
		setError(null);
		try {
			const res = await api.notices.list();
			setNotices(res.notices || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load notices");
		} finally {
			setLoading(false);
		}
	}

	const handleCreateNotice = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await api.notices.publish({
				title: form.title.trim(),
				content: form.content.trim(),
				targetAudience: form.targetAudience,
				isPinned: form.isPinned,
			});
			setIsCreateOpen(false);
			setForm({ title: "", content: "", targetAudience: "all", isPinned: false });
			setSuccessMsg("Notice broadcasted successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadNotices();
		} catch (err: any) {
			setError(err?.message || "Failed to publish notice");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteNotice = async (id: string, title: string) => {
		const confirmDelete = window.confirm(`Are you sure you want to delete the notice "${title}"?`);
		if (!confirmDelete) return;

		try {
			await api.notices.delete(id);
			setSuccessMsg("Notice deleted successfully.");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadNotices();
		} catch (err: any) {
			alert(`Failed to delete notice: ${err?.message || "Server error"}`);
		}
	};

	const applyTemplate = (type: "holiday" | "exam" | "fee") => {
		if (type === "holiday") {
			setForm({
				title: "Institute Holiday Notice",
				content: "Dear Students & Parents, Please note that Proventus Academy will remain closed on [Date] on account of [Occasion]. Regular classes will resume on [Next Working Day].",
				targetAudience: "all",
				isPinned: true,
			});
		} else if (type === "exam") {
			setForm({
				title: "Upcoming Assessment & Mock Test Schedule",
				content: "Dear Students, The upcoming formative assessment and chapter revision tests are scheduled from [Start Date] to [End Date]. Please ensure thorough preparation and timely arrival.",
				targetAudience: "students",
				isPinned: true,
			});
		} else if (type === "fee") {
			setForm({
				title: "Monthly Tuition Fee Reminder",
				content: "Dear Parents, This is a gentle reminder that the monthly tuition installment for the current billing cycle is due by the 5th of this month. Please log in to the Student & Parent Portal to settle dues securely via Razorpay.",
				targetAudience: "parents",
				isPinned: false,
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Institute Announcements & Notices</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Broadcast official updates, holiday notices, and exam schedules to students and families.
					</p>
				</div>
				<button
					onClick={() => setIsCreateOpen(true)}
					className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
				>
					<Plus className="w-4 h-4" />
					Broadcast Announcement
				</button>
			</div>

			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
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
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
					<AlertCircle className="w-4 h-4 flex-shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				{loading ? (
					<div className="col-span-full p-12 text-center text-xs text-slate-400">Loading notices...</div>
				) : notices.length === 0 ? (
					<div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
						<Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
						<p className="font-semibold text-sm text-slate-800">No announcements published yet</p>
						<p className="text-xs text-slate-400 mt-1">
							Click &quot;Broadcast Announcement&quot; to publish holidays, updates, or schedules.
						</p>
					</div>
				) : (
					notices.map((n) => (
						<div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
							<div className="space-y-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-2">
										{n.isPinned === 1 && (
											<span className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-200" title="Pinned Notice">
												<Pin className="w-3.5 h-3.5" />
											</span>
										)}
										<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
											Audience: {n.targetAudience}
										</span>
									</div>
									<span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
										<Calendar className="w-3 h-3" />
										{new Date(n.publishedAt * 1000).toLocaleDateString()}
									</span>
								</div>

								<h3 className="font-bold text-slate-900 text-sm leading-snug">{n.title}</h3>
								<p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>
							</div>

							<div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
								<span>
									Published by: <strong className="text-slate-700">{n.publisherName}</strong>
								</span>
								<button
									onClick={() => handleDeleteNotice(n.id, n.title)}
									className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
									title="Delete Notice"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Create Notice Modal */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">Broadcast Announcement</h3>
							<button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Quick Templates */}
						<div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
							<div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
								<Sparkles className="w-3.5 h-3.5 text-indigo-600" />
								<span>Quick Announcement Templates:</span>
							</div>
							<div className="flex flex-wrap gap-2 text-[10px]">
								<button
									type="button"
									onClick={() => applyTemplate("holiday")}
									className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:border-indigo-600 font-medium text-slate-700 transition"
								>
									🏖️ Public Holiday
								</button>
								<button
									type="button"
									onClick={() => applyTemplate("exam")}
									className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:border-indigo-600 font-medium text-slate-700 transition"
								>
									📝 Exam Schedule
								</button>
								<button
									type="button"
									onClick={() => applyTemplate("fee")}
									className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:border-indigo-600 font-medium text-slate-700 transition"
								>
									💳 Fee Reminder
								</button>
							</div>
						</div>

						<form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Announcement Title *</label>
								<input
									type="text"
									required
									value={form.title}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
									placeholder="e.g. Dussehra Holidays Notice"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
								<select
									value={form.targetAudience}
									onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								>
									<option value="all" className="bg-white text-slate-900">
										All (Students, Parents & Faculty)
									</option>
									<option value="students" className="bg-white text-slate-900">
										Students Only
									</option>
									<option value="parents" className="bg-white text-slate-900">
										Parents Only
									</option>
									<option value="teachers" className="bg-white text-slate-900">
										Faculty Only
									</option>
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Notice Details & Content *</label>
								<textarea
									required
									value={form.content}
									onChange={(e) => setForm({ ...form, content: e.target.value })}
									placeholder="Write the full announcement text here..."
									rows={5}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium resize-none"
								/>
							</div>

							<div className="flex items-center gap-2 pt-1">
								<input
									type="checkbox"
									id="pinNotice"
									checked={form.isPinned}
									onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
									className="rounded text-indigo-600 focus:ring-indigo-500"
								/>
								<label htmlFor="pinNotice" className="text-slate-700 font-medium">
									Pin this announcement to top of dashboard
								</label>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Publishing..." : "Broadcast Announcement"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

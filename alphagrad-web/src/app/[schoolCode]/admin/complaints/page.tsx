"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	MessageSquareWarning,
	Clock,
	CheckCircle2,
	AlertCircle,
	X,
	Send,
	User,
	Trash2,
} from "lucide-react";

export default function AdminComplaintsPage() {
	const [complaints, setComplaints] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Detail view modal
	const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
	const [complaintDetail, setComplaintDetail] = useState<any>(null);
	const [responseMessage, setResponseMessage] = useState("");
	const [updateStatus, setUpdateStatus] = useState("resolved");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadComplaints();
	}, []);

	async function loadComplaints() {
		setLoading(true);
		setError(null);
		try {
			const res = await api.complaints.list();
			setComplaints(res.complaints || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load complaints");
		} finally {
			setLoading(false);
		}
	}

	async function openDetail(comp: any) {
		setSelectedComplaint(comp);
		try {
			const res = await api.complaints.get(comp.id);
			setComplaintDetail(res);
		} catch {
			setComplaintDetail({ complaint: comp, responses: [] });
		}
	}

	const handleRespond = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedComplaint) return;
		setSubmitting(true);

		try {
			await api.complaints.respond(selectedComplaint.id, {
				message: responseMessage,
				updateStatus,
				resolutionNotes: responseMessage,
			});
			setResponseMessage("");
			const updated = await api.complaints.get(selectedComplaint.id);
			setComplaintDetail(updated);
			loadComplaints();
		} catch (err: any) {
			alert("Failed to submit response: " + err?.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteComplaint = async (id: string, ticketNumber: string) => {
		const confirmDelete = window.confirm(`Permanently delete inquiry ticket #${ticketNumber}?`);
		if (!confirmDelete) return;

		try {
			await api.complaints.delete(id);
			if (selectedComplaint?.id === id) {
				setSelectedComplaint(null);
				setComplaintDetail(null);
			}
			loadComplaints();
		} catch (err: any) {
			alert("Failed to delete ticket: " + (err?.message || "Server error"));
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold text-slate-900">Complaints & Helpdesk Console</h1>
				<p className="text-xs text-slate-500 mt-0.5">
					Track student and guardian inquiries, faculty feedback, and resolution status.
				</p>
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
					<AlertCircle className="w-4 h-4 flex-shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{loading ? (
					<div className="p-12 text-center text-xs text-slate-400">Loading complaints...</div>
				) : complaints.length === 0 ? (
					<div className="p-12 text-center text-xs text-slate-400">No complaints registered. All clear!</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
								<tr>
									<th className="py-3 px-4">Ticket #</th>
									<th className="py-3 px-4">Student</th>
									<th className="py-3 px-4">Category</th>
									<th className="py-3 px-4">Subject</th>
									<th className="py-3 px-4">Priority</th>
									<th className="py-3 px-4">Status</th>
									<th className="py-3 px-4 text-right">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{complaints.map((c) => (
									<tr key={c.id} className="hover:bg-slate-50/60 transition">
										<td className="py-3 px-4 font-mono font-bold text-indigo-700">{c.ticketNumber}</td>
										<td className="py-3 px-4 font-semibold text-slate-900">{c.studentName}</td>
										<td className="py-3 px-4 capitalize text-slate-600">{c.category}</td>
										<td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">{c.title}</td>
										<td className="py-3 px-4">
											<span
												className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
													c.priority === "urgent" || c.priority === "high"
														? "bg-red-50 text-red-700 border border-red-200"
														: "bg-slate-100 text-slate-700"
												}`}
											>
												{c.priority}
											</span>
										</td>
										<td className="py-3 px-4">
											<span
												className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
													c.status === "resolved"
														? "bg-emerald-50 text-emerald-700 border border-emerald-200"
														: "bg-amber-50 text-amber-700 border border-amber-200"
												}`}
											>
												{c.status}
											</span>
										</td>
										<td className="py-3 px-4 text-right">
											<div className="flex items-center justify-end gap-1.5">
												<button
													onClick={() => openDetail(c)}
													className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
												>
													Review
												</button>
												<button
													onClick={() => handleDeleteComplaint(c.id, c.ticketNumber)}
													className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
													title="Delete Ticket"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Detail and Response Modal */}
			{selectedComplaint && complaintDetail && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
							<div>
								<span className="font-mono text-xs font-bold text-indigo-600">
									{complaintDetail.complaint.ticketNumber}
								</span>
								<h3 className="font-bold text-slate-900 text-sm mt-0.5">{complaintDetail.complaint.title}</h3>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => handleDeleteComplaint(selectedComplaint.id, complaintDetail.complaint.ticketNumber)}
									className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
									title="Delete Ticket"
								>
									<Trash2 className="w-4 h-4" />
								</button>
								<button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600">
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>

						<div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
							<div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
								{complaintDetail.complaint.description}
							</div>

							<div className="pt-2 border-t border-slate-100">
								<h4 className="font-bold text-slate-900 mb-2">Resolution Thread</h4>
								{complaintDetail.responses?.length === 0 ? (
									<div className="text-slate-400 py-2">No responses yet. Add resolution notes below.</div>
								) : (
									<div className="space-y-3">
										{complaintDetail.responses.map((resp: any) => (
											<div key={resp.id} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60 space-y-1">
												<div className="flex items-center justify-between font-semibold text-slate-800">
													<span>{resp.responderName}</span>
													<span className="text-[10px] text-slate-400">{new Date(resp.createdAt * 1000).toLocaleString()}</span>
												</div>
												<div className="text-slate-600">{resp.message}</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						<form onSubmit={handleRespond} className="p-4 border-t border-slate-100 bg-slate-50 space-y-3 text-xs">
							<textarea
								required
								value={responseMessage}
								onChange={(e) => setResponseMessage(e.target.value)}
								placeholder="Enter official resolution notes or response..."
								className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
								rows={2}
							/>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<label className="font-semibold text-slate-700 text-[11px]">Set Status:</label>
									<select
										value={updateStatus}
										onChange={(e) => setUpdateStatus(e.target.value)}
										className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
									>
										<option value="in_progress">In Progress</option>
										<option value="resolved">Resolved</option>
										<option value="escalated">Escalated</option>
									</select>
								</div>

								<button
									type="submit"
									disabled={submitting}
									className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									<Send className="w-3.5 h-3.5" />
									Submit Response
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

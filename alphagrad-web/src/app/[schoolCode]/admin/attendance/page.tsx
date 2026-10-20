"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CalendarCheck, Users, Calendar, AlertCircle } from "lucide-react";

export default function AdminAttendancePage() {
	const [batches, setBatches] = useState<any[]>([]);
	const [selectedBatchId, setSelectedBatchId] = useState("");
	const [sessions, setSessions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const res = await api.academic.batches();
				setBatches(res.batches || []);
				if (res.batches?.length > 0) {
					setSelectedBatchId(res.batches[0].id);
				}
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	useEffect(() => {
		if (selectedBatchId) {
			api.attendance.batchSessions(selectedBatchId).then((res) => {
				setSessions(res.sessions || []);
			});
		}
	}, [selectedBatchId]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold text-slate-900">Attendance Monitoring</h1>
				<p className="text-xs text-slate-500 mt-0.5">
					Review logged attendance sessions across all coaching cohorts.
				</p>
			</div>

			{/* Batch Selector */}
			<div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-xs">
				<span className="font-semibold text-slate-700">Filter by Cohort:</span>
				<select
					value={selectedBatchId}
					onChange={(e) => setSelectedBatchId(e.target.value)}
					className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium text-slate-800"
				>
					{batches.map((b) => (
						<option key={b.id} value={b.id}>
							{b.name} ({b.className})
						</option>
					))}
				</select>
			</div>

			{/* Session Records Table */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{loading ? (
					<div className="p-12 text-center text-xs text-slate-400">Loading attendance sessions...</div>
				) : sessions.length === 0 ? (
					<div className="p-12 text-center text-xs text-slate-400">
						No attendance sessions logged for this cohort yet.
					</div>
				) : (
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
							<tr>
								<th className="py-3 px-4">Date</th>
								<th className="py-3 px-4">Session ID</th>
								<th className="py-3 px-4">Logged At</th>
								<th className="py-3 px-4">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{sessions.map((s) => (
								<tr key={s.id} className="hover:bg-slate-50/60 transition">
									<td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
										<Calendar className="w-3.5 h-3.5 text-indigo-500" />
										{s.sessionDate}
									</td>
									<td className="py-3 px-4 font-mono text-slate-500">{s.id.slice(0, 13)}...</td>
									<td className="py-3 px-4 text-slate-600">
										{new Date(s.createdAt * 1000).toLocaleString()}
									</td>
									<td className="py-3 px-4">
										<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
											Verified Logged
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

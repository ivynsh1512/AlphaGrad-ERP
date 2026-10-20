"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
	FileText,
	Calendar,
	CheckCircle,
	Clock,
	Users,
	ArrowRight,
	AlertCircle,
	ClipboardCheck,
} from "lucide-react";

export default function TeacherAssignmentsPage() {
	const [assignments, setAssignments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadAssignments() {
			try {
				const res = await api.worksheets.teacherAssignments();
				setAssignments(res.assignments || []);
			} catch (err: any) {
				setError(err?.message || "Failed to load published assignments");
			} finally {
				setLoading(false);
			}
		}

		loadAssignments();
	}, []);

	if (loading) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
				<div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
				<p className="text-xs font-semibold text-slate-600">Loading Assigned Worksheets...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
						<ClipboardCheck className="w-6 h-6 text-emerald-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Assigned Worksheets Monitoring</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Track real-time student delivery, submission counts, pending reviews, and evaluation status.
						</p>
					</div>
				</div>

				<Link
					href="/teacher/worksheets"
					className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs shrink-0"
				>
					+ Create New Worksheet
				</Link>
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{assignments.length === 0 ? (
					<div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
						<FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
						<p className="font-semibold text-slate-600">No Assignments Published Yet</p>
						<p className="mt-1">Worksheets assigned from the AI Worksheet Studio will appear here.</p>
					</div>
				) : (
					assignments.map((asgn) => {
						const subPct = asgn.totalAssigned > 0 ? Math.round((asgn.submittedCount / asgn.totalAssigned) * 100) : 0;
						return (
							<div
								key={asgn.id}
								className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between space-y-4"
							>
								<div>
									<div className="flex items-center justify-between gap-2 mb-2">
										<span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
											{asgn.batchName}
										</span>
										<span className="text-[10px] font-bold text-slate-400 uppercase">
											Due {asgn.dueDate}
										</span>
									</div>

									<h3 className="text-sm font-bold text-slate-900 line-clamp-1">{asgn.title}</h3>
									<p className="text-xs text-slate-500 mt-1 line-clamp-1">
										Based on: {asgn.worksheetTitle} ({asgn.totalMarks || 25} Marks)
									</p>

									{/* Progress stats */}
									<div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
										<div className="flex items-center justify-between text-xs font-semibold">
											<span className="text-slate-500">Submissions Rate:</span>
											<span className="text-slate-900">
												{asgn.submittedCount} / {asgn.totalAssigned} ({subPct}%)
											</span>
										</div>
										<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
											<div className="h-full bg-emerald-500 rounded-full" style={{ width: `${subPct}%` }} />
										</div>

										<div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
											<div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
												<span className="text-[10px] text-slate-400 uppercase font-bold">Graded</span>
												<p className="font-bold text-emerald-700">{asgn.gradedCount || 0}</p>
											</div>
											<div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
												<span className="text-[10px] text-slate-400 uppercase font-bold">Pending Review</span>
												<p className="font-bold text-amber-700">
													{Math.max(0, (asgn.submittedCount || 0) - (asgn.gradedCount || 0))}
												</p>
											</div>
										</div>
									</div>
								</div>

								<Link
									href={`/teacher/submissions?assignmentId=${asgn.id}`}
									className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
								>
									<span>Grade Submissions</span>
									<ArrowRight className="w-3.5 h-3.5" />
								</Link>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

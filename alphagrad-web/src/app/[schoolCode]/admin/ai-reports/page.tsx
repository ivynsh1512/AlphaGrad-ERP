"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	BarChart3,
	Cpu,
	DollarSign,
	AlertTriangle,
	CheckCircle,
	Users,
	FileText,
	MessageSquare,
	Layers,
	Clock,
	Activity,
} from "lucide-react";

export default function AdminAiReportsPage() {
	const [academicReports, setAcademicReports] = useState<any | null>(null);
	const [usageReports, setUsageReports] = useState<any | null>(null);
	const [days, setDays] = useState(30);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadReports();
	}, [days]);

	const loadReports = async () => {
		setLoading(true);
		try {
			const [acadRes, usageRes] = await Promise.all([
				api.ai.admin.getAcademicReports(),
				api.ai.admin.getUsageReports(days),
			]);
			setAcademicReports(acadRes);
			setUsageReports(usageRes);
		} catch (err: any) {
			setError(err?.message || "Failed to load reports");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
				<div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
				<p className="text-xs font-semibold text-slate-600">Compiling Academic & AI Analytics...</p>
			</div>
		);
	}

	const usageSummary = usageReports?.summary || {};
	const submissions = academicReports?.submissions || {};
	const tests = academicReports?.tests || {};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
						<BarChart3 className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
							AI Learning & Academic Reports
						</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Holistic analytics on AI tutor queries, worksheet distributions, test series results, and API cost expenditure.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-slate-500">Period:</span>
					<select
						value={days}
						onChange={(e) => setDays(Number(e.target.value))}
						className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800"
					>
						<option value={7}>Last 7 Days</option>
						<option value={30}>Last 30 Days</option>
						<option value={90}>Last Quarter (90 Days)</option>
					</select>
				</div>
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
					{error}
				</div>
			)}

			{/* KPI Metric Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total AI Queries</span>
					<p className="text-2xl font-black text-indigo-600 mt-1">{usageSummary.totalRequests || 0}</p>
					<span className="text-[11px] text-slate-500 mt-1 block">
						Success: <strong className="text-emerald-600">{usageSummary.successfulRequests || 0}</strong> • Rate-limited:{" "}
						<strong className="text-amber-600">{usageSummary.rateLimitedRequests || 0}</strong>
					</span>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated API Cost</span>
					<p className="text-2xl font-black text-slate-900 mt-1">
						${Number(usageSummary.totalEstimatedCostUsd || 0).toFixed(4)}
					</p>
					<span className="text-[11px] text-slate-500 mt-1 block">
						Tokens: <strong className="text-slate-800 font-mono">{usageSummary.totalTokens?.toLocaleString()}</strong>
					</span>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Worksheet Delivery</span>
					<p className="text-2xl font-black text-emerald-600 mt-1">{academicReports?.assignmentsCount || 0}</p>
					<span className="text-[11px] text-slate-500 mt-1 block">
						Submissions: <strong className="text-slate-800">{submissions.total || 0}</strong> • Graded:{" "}
						<strong className="text-emerald-700">{submissions.graded || 0}</strong>
					</span>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Test Attempts</span>
					<p className="text-2xl font-black text-purple-600 mt-1">{tests.totalAttempts || 0}</p>
					<span className="text-[11px] text-slate-500 mt-1 block">
						Passed: <strong className="text-purple-700">{tests.passedAttempts || 0}</strong> • Avg Score:{" "}
						<strong className="text-slate-800">{tests.avgPercentage || 0}%</strong>
					</span>
				</div>
			</div>

			{/* Breakdown Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Breakdown by Action */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
					<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<Activity className="w-4 h-4 text-indigo-600" />
						<span>AI Requests by Functional Module</span>
					</h3>
					<div className="space-y-2">
						{usageReports?.actionBreakdown?.map((a: any) => (
							<div key={a.actionType} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
								<span className="font-bold text-slate-800 capitalize">
									{a.actionType.replace("_", " ")}
								</span>
								<div className="text-right">
									<span className="font-bold text-indigo-700 mr-3">{a.count} calls</span>
									<span className="text-slate-500 font-mono text-[11px]">${Number(a.cost || 0).toFixed(4)}</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Breakdown by Model */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
					<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<Cpu className="w-4 h-4 text-emerald-600" />
						<span>Model Execution & Token Breakdown</span>
					</h3>
					<div className="space-y-2">
						{usageReports?.modelBreakdown?.map((m: any) => (
							<div key={m.model} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
								<span className="font-mono font-bold text-slate-800">{m.model}</span>
								<div className="text-right">
									<span className="font-bold text-slate-700 mr-3">{m.tokens?.toLocaleString()} tokens</span>
									<span className="text-slate-500 font-mono text-[11px]">${Number(m.cost || 0).toFixed(4)}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Recent Student Doubt Sessions Log */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
				<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
					<MessageSquare className="w-4 h-4 text-indigo-600" />
					<span>Recent Student Doubt Inquiries (Administrative Audit Log)</span>
				</h3>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
							<tr>
								<th className="p-3">Student Name</th>
								<th className="p-3">Admission No</th>
								<th className="p-3">Doubt Topic / Question Title</th>
								<th className="p-3 text-right">Timestamp</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 font-medium text-slate-800">
							{academicReports?.recentConversations?.map((c: any) => (
								<tr key={c.id} className="hover:bg-slate-50 transition">
									<td className="p-3 font-bold text-slate-900">{c.studentName}</td>
									<td className="p-3 font-mono text-slate-500 text-[11px]">{c.admissionNumber}</td>
									<td className="p-3 text-slate-700">{c.title}</td>
									<td className="p-3 text-right text-slate-400 text-[11px]">
										{new Date(c.createdAt * 1000).toLocaleString("en-IN", {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

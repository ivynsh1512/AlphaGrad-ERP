"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
	Users,
	GraduationCap,
	BookOpen,
	DollarSign,
	CalendarCheck,
	Clock,
	Award,
	Bell,
	LifeBuoy,
	Bot,
	TrendingUp,
	Check,
	Copy,
	ExternalLink,
	Sparkles,
	ArrowUpRight,
	Calendar,
} from "lucide-react";

export default function SchoolAdminDashboard() {
	const params = useParams();
	const schoolCode = (params.schoolCode as string)?.toLowerCase();
	const { user, school, features, hasFeature } = useAuth();

	const [stats, setStats] = useState({
		studentsCount: 0,
		teachersCount: 0,
		batchesCount: 0,
		obligationsCount: 0,
	});
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		async function fetchStats() {
			try {
				const [stRes, tcRes, btRes] = await Promise.all([
					api.students.list().catch(() => ({ students: [] })),
					api.teachers.list().catch(() => ({ teachers: [] })),
					api.academic.batches().catch(() => ({ batches: [] })),
				]);

				setStats({
					studentsCount: stRes.students?.length || 0,
					teachersCount: tcRes.teachers?.length || 0,
					batchesCount: btRes.batches?.length || 0,
					obligationsCount: 0,
				});
			} catch (err) {
				console.error("Failed to load school metrics", err);
			} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, [schoolCode]);

	const handleCopyUrl = () => {
		navigator.clipboard.writeText(`https://erp.novaxai.in/${schoolCode}/login`);
		setCopied(true);
		setTimeout(() => setCopied(false), 2500);
	};

	const featureCards = [
		{
			title: "Student Admissions",
			desc: "Manage enrolments, student roll numbers & credentials",
			href: `/${schoolCode}/admin/students`,
			icon: Users,
			color: "text-blue-400 bg-blue-500/10",
			featureKey: "students",
		},
		{
			title: "Faculty Directory",
			desc: "Staff profiles, subject assignments & contact directory",
			href: `/${schoolCode}/admin/teachers`,
			icon: GraduationCap,
			color: "text-emerald-400 bg-emerald-500/10",
			featureKey: "teachers",
		},
		{
			title: "Classes & Batches",
			desc: "Academic programs, coaching batches & room capacities",
			href: `/${schoolCode}/admin/classes`,
			icon: BookOpen,
			color: "text-purple-400 bg-purple-500/10",
			featureKey: "academic",
		},
		{
			title: "Daily Attendance",
			desc: "Student classroom logs, teacher daily punch & attendance rate",
			href: `/${schoolCode}/admin/attendance`,
			icon: CalendarCheck,
			color: "text-amber-400 bg-amber-500/10",
			featureKey: "attendance",
		},
		{
			title: "Fees & Razorpay",
			desc: "Installment structures, fee collection & digital receipts",
			href: `/${schoolCode}/admin/fees`,
			icon: DollarSign,
			color: "text-green-400 bg-green-500/10",
			featureKey: "fees",
		},
		{
			title: "Weekly Timetable",
			desc: "Period timings, faculty schedule & conflict detection",
			href: `/${schoolCode}/admin/timetable`,
			icon: Clock,
			color: "text-sky-400 bg-sky-500/10",
			featureKey: "timetable",
		},
		{
			title: "Portion & Syllabus",
			desc: "Chapter-wise curriculum status & portion completion %",
			href: `/${schoolCode}/admin/syllabus`,
			icon: BookOpen,
			color: "text-indigo-400 bg-indigo-500/10",
			featureKey: "syllabus",
		},
		{
			title: "Assessments & Ranks",
			desc: "Monthly evaluations, student scores, ranks & report cards",
			href: `/${schoolCode}/admin/assessments`,
			icon: Award,
			color: "text-rose-400 bg-rose-500/10",
			featureKey: "assessments",
		},
		{
			title: "Operating Ledger",
			desc: "Expenditures, facility costs & teacher salary disbursements",
			href: `/${schoolCode}/admin/accounting`,
			icon: TrendingUp,
			color: "text-yellow-400 bg-yellow-500/10",
			featureKey: "accounting",
		},
		{
			title: "Notices & Circulars",
			desc: "Publish announcements to students, parents and staff",
			href: `/${schoolCode}/admin/notices`,
			icon: Bell,
			color: "text-cyan-400 bg-cyan-500/10",
			featureKey: "notices",
		},
		{
			title: "Helpdesk & Complaints",
			desc: "Parent inquiries, student grievances & response desk",
			href: `/${schoolCode}/admin/complaints`,
			icon: LifeBuoy,
			color: "text-orange-400 bg-orange-500/10",
			featureKey: "complaints",
		},
		{
			title: "AI Model Config & Copilot",
			desc: "Set AI tutor prompt rules, tokens limits & usage analytics",
			href: `/${schoolCode}/admin/ai-config`,
			icon: Bot,
			color: "text-violet-400 bg-violet-500/10",
			featureKey: "aiAdmin",
		},
	];

	// Filter cards by enabled features
	const visibleCards = featureCards.filter((c) => !c.featureKey || hasFeature(c.featureKey));

	return (
		<div className="space-y-8">
			{/* Welcome & School Info Card */}
			<div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
							Institute Administrator
						</span>
						<span className="text-xs text-slate-400">Academic Year 2026–2027</span>
					</div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
						Welcome to {school?.name || "Institute ERP"}
					</h1>
					<p className="mt-1 text-sm text-slate-400 max-w-xl">
						Manage admissions, faculty assignments, fee collections, academic portion tracking, and student
						performance across your coaching center.
					</p>
				</div>

				{/* School Portal Link Box */}
				<div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2 shrink-0 w-full md:w-auto">
					<div className="text-[11px] font-semibold text-slate-400">School Code:</div>
					<div className="font-mono text-sm font-bold text-indigo-400">{schoolCode}</div>
					<div className="flex items-center gap-2 mt-1">
						<button
							onClick={handleCopyUrl}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
						>
							{copied ? (
								<>
									<Check className="w-3.5 h-3.5" />
									<span>Copied Link</span>
								</>
							) : (
								<>
									<Copy className="w-3.5 h-3.5" />
									<span>Copy Portal URL</span>
								</>
							)}
						</button>
						<Link
							href={`/${schoolCode}/portal`}
							target="_blank"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
						>
							<span>PWA Portal</span>
							<ExternalLink className="w-3 h-3" />
						</Link>
					</div>
				</div>
			</div>

			{/* Metric Counters */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
					<div className="text-xs font-semibold text-slate-400">Total Enrolled Students</div>
					<div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
						{loading ? "..." : stats.studentsCount}
					</div>
					<div className="mt-1 text-[11px] text-indigo-400">Active admissions</div>
				</div>

				<div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
					<div className="text-xs font-semibold text-slate-400">Assigned Faculty</div>
					<div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
						{loading ? "..." : stats.teachersCount}
					</div>
					<div className="mt-1 text-[11px] text-emerald-400">Subject teachers</div>
				</div>

				<div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
					<div className="text-xs font-semibold text-slate-400">Academic Batches</div>
					<div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
						{loading ? "..." : stats.batchesCount}
					</div>
					<div className="mt-1 text-[11px] text-purple-400">Coaching batches</div>
				</div>

				<div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
					<div className="text-xs font-semibold text-slate-400">Subscribed Capabilities</div>
					<div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
						{visibleCards.length}
					</div>
					<div className="mt-1 text-[11px] text-sky-400">Active ERP Modules</div>
				</div>
			</div>

			{/* Feature Cards Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-bold text-white tracking-tight">Active ERP Modules</h2>
					<span className="text-xs text-slate-400">
						Configured via Super Admin feature policy
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{visibleCards.map((card, idx) => {
						const Icon = card.icon;
						return (
							<Link
								key={idx}
								href={card.href}
								className="group bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
											<Icon className="w-5 h-5" />
										</div>
										<ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
									</div>

									<h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
										{card.title}
									</h3>
									<p className="mt-1 text-xs text-slate-400 leading-relaxed">{card.desc}</p>
								</div>

								<div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
									<span className="text-indigo-400 font-semibold group-hover:underline">Open Workspace</span>
									<span className="text-emerald-400 font-medium">Active</span>
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}

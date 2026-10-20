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
	BookMarked,
	Layers,
	FileText,
	CheckSquare,
	Megaphone,
	BarChart3,
	Settings,
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
		const url = typeof window !== "undefined" ? `${window.location.origin}/${schoolCode}/login` : `https://erp.novaxai.in/${schoolCode}/login`;
		navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2500);
	};

	const featureCards = [
		{
			title: "Student Admissions",
			desc: "Manage enrolments, roll numbers, credentials & student directory",
			href: `/${schoolCode}/admin/students`,
			icon: Users,
			color: "text-blue-600 bg-blue-50",
			featureKey: "students",
		},
		{
			title: "Faculty Directory",
			desc: "Staff profiles, subject assignments & contact directory",
			href: `/${schoolCode}/admin/teachers`,
			icon: GraduationCap,
			color: "text-emerald-600 bg-emerald-50",
			featureKey: "teachers",
		},
		{
			title: "Classes & Batches",
			desc: "Academic programs, coaching batches & room allocations",
			href: `/${schoolCode}/admin/classes`,
			icon: BookOpen,
			color: "text-purple-600 bg-purple-50",
			featureKey: "academic",
		},
		{
			title: "Subject Master",
			desc: "Course codes, syllabus milestones & teaching allocations",
			href: `/${schoolCode}/admin/subjects`,
			icon: BookMarked,
			color: "text-indigo-600 bg-indigo-50",
			featureKey: "academic",
		},
		{
			title: "Daily Attendance",
			desc: "Student classroom logs, faculty punch & attendance analytics",
			href: `/${schoolCode}/admin/attendance`,
			icon: CalendarCheck,
			color: "text-amber-600 bg-amber-50",
			featureKey: "attendance",
		},
		{
			title: "Timetable & Schedules",
			desc: "Weekly lecture schedules, room occupancy & timing slots",
			href: `/${schoolCode}/admin/timetable`,
			icon: Clock,
			color: "text-orange-600 bg-orange-50",
			featureKey: "timetable",
		},
		{
			title: "Curriculum & Portion Tracker",
			desc: "Monitor syllabus completion percentage per subject & batch",
			href: `/${schoolCode}/admin/syllabus`,
			icon: Layers,
			color: "text-teal-600 bg-teal-50",
			featureKey: "syllabus",
		},
		{
			title: "Assessments & Results",
			desc: "Class exams, mark entry, gradecards & performance trends",
			href: `/${schoolCode}/admin/assessments`,
			icon: Award,
			color: "text-yellow-600 bg-yellow-50",
			featureKey: "assessments",
		},
		{
			title: "Staff Tasks & Logs",
			desc: "Assign internal operational tasks to faculty and coordinators",
			href: `/${schoolCode}/admin/tasks`,
			icon: CheckSquare,
			color: "text-rose-600 bg-rose-50",
			featureKey: "tasks",
		},
		{
			title: "Fees & Payment Gateway",
			desc: "Tuition fee structures, student dues & Razorpay transactions",
			href: `/${schoolCode}/admin/fees`,
			icon: DollarSign,
			color: "text-emerald-600 bg-emerald-50",
			featureKey: "fees",
		},
		{
			title: "Accounts & Financial Ledger",
			desc: "Staff payroll, center expense vouchers & cashflow reports",
			href: `/${schoolCode}/admin/accounting`,
			icon: TrendingUp,
			color: "text-blue-600 bg-blue-50",
			featureKey: "accounting",
		},
		{
			title: "Academic Calendar",
			desc: "Holidays, term exam dates, events & institute milestones",
			href: `/${schoolCode}/admin/calendar`,
			icon: Calendar,
			color: "text-indigo-600 bg-indigo-50",
			featureKey: "calendar",
		},
		{
			title: "Announcements & Notices",
			desc: "Publish instant broadcast circulars to student and parent PWAs",
			href: `/${schoolCode}/admin/notices`,
			icon: Bell,
			color: "text-cyan-600 bg-cyan-50",
			featureKey: "notices",
		},
		{
			title: "Helpdesk & Complaints",
			desc: "Parent inquiries, student grievances & resolution desk",
			href: `/${schoolCode}/admin/complaints`,
			icon: LifeBuoy,
			color: "text-orange-600 bg-orange-50",
			featureKey: "complaints",
		},
		{
			title: "Campaigns & Inquiries",
			desc: "Admission lead generation, CRM tracking & conversion funnel",
			href: `/${schoolCode}/admin/campaigns`,
			icon: Megaphone,
			color: "text-pink-600 bg-pink-50",
			featureKey: "campaigns",
		},
		{
			title: "AI Model Config & Copilot",
			desc: "Set AI tutor prompt rules, tokens limits & usage analytics",
			href: `/${schoolCode}/admin/ai-config`,
			icon: Bot,
			color: "text-violet-600 bg-violet-50",
			featureKey: "aiAdmin",
		},
		{
			title: "AI Academic Reports",
			desc: "Automated student performance insights & progress reports",
			href: `/${schoolCode}/admin/ai-reports`,
			icon: BarChart3,
			color: "text-indigo-600 bg-indigo-50",
			featureKey: "aiAdmin",
		},
	];

	// Filter cards by enabled features
	const visibleCards = featureCards.filter((c) => !c.featureKey || hasFeature(c.featureKey));

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			{/* Welcome & School Info Hero Banner */}
			<div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-indigo-900/50">
				<div className="space-y-2 max-w-2xl">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/60 border border-indigo-600/40 text-[11px] font-bold uppercase tracking-wider text-indigo-200">
						<Sparkles className="w-3.5 h-3.5 text-amber-400" />
						<span>Session 2026–2027 Active</span>
					</div>
					<h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
						{school?.name || "Institute Management Console"}
					</h1>
					<p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
						Integrated operational oversight of student admissions, curriculum portion completion, faculty roll-call attendance, and verified fee collections.
					</p>
				</div>

				{/* School Portal Link Box */}
				<div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex flex-col gap-2 shrink-0 w-full sm:w-auto">
					<div className="flex items-center justify-between gap-4">
						<span className="text-[11px] font-semibold text-indigo-200">School Code:</span>
						<span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white">{schoolCode}</span>
					</div>
					<div className="flex items-center gap-2 mt-1">
						<button
							onClick={handleCopyUrl}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-indigo-950 hover:bg-slate-100 text-xs font-bold shadow-xs transition"
						>
							{copied ? (
								<>
									<Check className="w-3.5 h-3.5 text-emerald-600" />
									<span>Copied Link</span>
								</>
							) : (
								<>
									<Copy className="w-3.5 h-3.5 text-indigo-600" />
									<span>Copy Portal URL</span>
								</>
							)}
						</button>
						<Link
							href={`/${schoolCode}/portal`}
							target="_blank"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold border border-indigo-600/40 transition"
						>
							<span>PWA Portal</span>
							<ExternalLink className="w-3 h-3 text-indigo-300" />
						</Link>
					</div>
				</div>
			</div>

			{/* Core Metric Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
				{/* Total Enrolled Students */}
				<div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Enrolled Students</span>
						<div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
							<Users className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{loading ? "..." : stats.studentsCount}
						</span>
						<span className="text-xs font-bold text-emerald-600">Active</span>
					</div>
					<div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span>Batches: {stats.batchesCount}</span>
						<Link href={`/${schoolCode}/admin/students`} className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
							Manage <ArrowUpRight className="w-3 h-3" />
						</Link>
					</div>
				</div>

				{/* Total Faculty */}
				<div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Assigned Faculty</span>
						<div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
							<GraduationCap className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{loading ? "..." : stats.teachersCount}
						</span>
						<span className="text-xs font-bold text-emerald-600">On Duty</span>
					</div>
					<div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span>Teaching Staff</span>
						<Link href={`/${schoolCode}/admin/teachers`} className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
							Directory <ArrowUpRight className="w-3 h-3" />
						</Link>
					</div>
				</div>

				{/* Academic Batches */}
				<div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Coaching Batches</span>
						<div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
							<BookOpen className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{loading ? "..." : stats.batchesCount}
						</span>
						<span className="text-xs font-bold text-indigo-600">Running</span>
					</div>
					<div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span>Academic Programs</span>
						<Link href={`/${schoolCode}/admin/classes`} className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
							Classes <ArrowUpRight className="w-3 h-3" />
						</Link>
					</div>
				</div>

				{/* Subscribed Capabilities */}
				<div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Active Capabilities</span>
						<div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
							<Sparkles className="w-4 h-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-3xl font-black text-slate-900 tracking-tight">
							{visibleCards.length}
						</span>
						<span className="text-xs font-bold text-sky-600">Modules</span>
					</div>
					<div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span>Super Admin Entitled</span>
						<span className="text-slate-400 font-medium">Licensed</span>
					</div>
				</div>
			</div>

			{/* Feature Cards Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-lg font-bold text-slate-900 tracking-tight">Active ERP Modules</h2>
						<p className="text-xs text-slate-500 mt-0.5">
							Configured and licensed for your institute via Super Admin policy
						</p>
					</div>
					<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
						{visibleCards.length} Modules Available
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{visibleCards.map((card, idx) => {
						const Icon = card.icon;
						return (
							<Link
								key={idx}
								href={card.href}
								className="group bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 p-5 rounded-2xl transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
											<Icon className="w-5 h-5" />
										</div>
										<ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
									</div>

									<h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
										{card.title}
									</h3>
									<p className="mt-1 text-xs text-slate-500 leading-relaxed">{card.desc}</p>
								</div>

								<div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
									<span className="text-indigo-600 font-semibold group-hover:underline">Open Workspace</span>
									<span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
										Active
									</span>
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}

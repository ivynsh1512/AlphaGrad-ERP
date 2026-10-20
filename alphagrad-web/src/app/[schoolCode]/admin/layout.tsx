"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
	LayoutDashboard,
	Users,
	GraduationCap,
	CalendarCheck,
	Clock,
	FileText,
	DollarSign,
	BookOpen,
	Award,
	CheckSquare,
	Bell,
	LifeBuoy,
	Calendar,
	TrendingUp,
	Megaphone,
	Bot,
	BarChart3,
	Settings,
	LogOut,
	Building2,
	ChevronRight,
	Menu,
	X,
	ShieldAlert,
} from "lucide-react";

interface NavItem {
	title: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	featureKey?: string;
	badge?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const params = useParams();
	const schoolCode = (params.schoolCode as string)?.toLowerCase();
	const pathname = usePathname();
	const router = useRouter();
	const { user, school, features, logout, loading, hasFeature } = useAuth();
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		if (!loading && (!user || user.role !== "admin")) {
			router.push(`/${schoolCode}/login`);
		}
	}, [user, loading, router, schoolCode]);

	if (loading || !user) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
				<div className="flex items-center gap-3">
					<div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
					<span className="text-sm font-medium">Loading Administrator Workspace...</span>
				</div>
			</div>
		);
	}

	const navSections: { label: string; items: NavItem[] }[] = [
		{
			label: "Overview",
			items: [
				{ title: "Dashboard", href: `/${schoolCode}/admin`, icon: LayoutDashboard },
			],
		},
		{
			label: "Academics & People",
			items: [
				{ title: "Students", href: `/${schoolCode}/admin/students`, icon: Users, featureKey: "students" },
				{ title: "Faculty", href: `/${schoolCode}/admin/teachers`, icon: GraduationCap, featureKey: "teachers" },
				{ title: "Classes & Batches", href: `/${schoolCode}/admin/classes`, icon: BookOpen, featureKey: "academic" },
				{ title: "Subject Master", href: `/${schoolCode}/admin/subjects`, icon: FileText, featureKey: "academic" },
				{ title: "Timetable", href: `/${schoolCode}/admin/timetable`, icon: Clock, featureKey: "timetable" },
				{ title: "Daily Attendance", href: `/${schoolCode}/admin/attendance`, icon: CalendarCheck, featureKey: "attendance" },
			],
		},
		{
			label: "Curriculum & Evaluations",
			items: [
				{ title: "Syllabus Tracker", href: `/${schoolCode}/admin/syllabus`, icon: BookOpen, featureKey: "syllabus" },
				{ title: "Assessments", href: `/${schoolCode}/admin/assessments`, icon: Award, featureKey: "assessments" },
				{ title: "Staff Tasks", href: `/${schoolCode}/admin/tasks`, icon: CheckSquare, featureKey: "tasks" },
			],
		},
		{
			label: "Finance & Operations",
			items: [
				{ title: "Fees & Razorpay", href: `/${schoolCode}/admin/fees`, icon: DollarSign, featureKey: "fees" },
				{ title: "Ledger & Payroll", href: `/${schoolCode}/admin/accounting`, icon: TrendingUp, featureKey: "accounting" },
				{ title: "Academic Calendar", href: `/${schoolCode}/admin/calendar`, icon: Calendar, featureKey: "calendar" },
			],
		},
		{
			label: "Communication & Growth",
			items: [
				{ title: "Circulars & Notices", href: `/${schoolCode}/admin/notices`, icon: Bell, featureKey: "notices" },
				{ title: "Helpdesk Tickets", href: `/${schoolCode}/admin/complaints`, icon: LifeBuoy, featureKey: "complaints" },
				{ title: "Campaigns & SEO", href: `/${schoolCode}/admin/campaigns`, icon: Megaphone, featureKey: "campaigns" },
			],
		},
		{
			label: "AI Governance",
			items: [
				{ title: "AI Model Config", href: `/${schoolCode}/admin/ai-config`, icon: Bot, featureKey: "aiAdmin", badge: "AI" },
				{ title: "AI Usage Analytics", href: `/${schoolCode}/admin/ai-reports`, icon: BarChart3, featureKey: "aiAdmin" },
				{ title: "School Settings", href: `/${schoolCode}/admin/settings`, icon: Settings },
			],
		},
	];

	return (
		<div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
			{/* Mobile Header */}
			<div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
						{school?.name?.charAt(0) || "A"}
					</div>
					<span className="font-bold text-sm text-white truncate max-w-[200px]">
						{school?.name || "Institute"}
					</span>
				</div>
				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					className="p-2 text-slate-400 hover:text-white"
				>
					{mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
				</button>
			</div>

			{/* Sidebar Navigation */}
			<aside
				className={`${
					mobileOpen ? "block" : "hidden"
				} md:block w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-30`}
			>
				{/* Institute Profile Header */}
				<div className="p-5 border-b border-slate-800/80">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
							{school?.name?.charAt(0) || "A"}
						</div>
						<div className="overflow-hidden">
							<div className="font-bold text-sm text-white truncate leading-tight">
								{school?.name || "School Institute"}
							</div>
							<div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
								<span className="font-mono text-indigo-400 font-semibold">{schoolCode}</span>
								<span>•</span>
								<span className="text-emerald-400 font-medium">Active</span>
							</div>
						</div>
					</div>
				</div>

				{/* Nav Links */}
				<div className="flex-1 overflow-y-auto p-3 space-y-6">
					{navSections.map((section, sIdx) => {
						// Filter items based on enabled features
						const visibleItems = section.items.filter((item) => {
							if (!item.featureKey) return true;
							return hasFeature(item.featureKey);
						});

						if (visibleItems.length === 0) return null;

						return (
							<div key={sIdx} className="space-y-1">
								<div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
									{section.label}
								</div>
								<div className="mt-1 space-y-0.5">
									{visibleItems.map((item) => {
										const isActive = pathname === item.href;
										const Icon = item.icon;
										return (
											<Link
												key={item.href}
												href={item.href}
												onClick={() => setMobileOpen(false)}
												className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
													isActive
														? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
														: "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
												}`}
											>
												<div className="flex items-center gap-2.5">
													<Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
													<span>{item.title}</span>
												</div>
												{item.badge && (
													<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
														{item.badge}
													</span>
												)}
											</Link>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>

				{/* Current Admin User & Sign Out */}
				<div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
					<div className="flex items-center justify-between gap-3">
						<div className="overflow-hidden">
							<div className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</div>
							<div className="text-[10px] text-slate-400 font-mono">{user.username} (Admin)</div>
						</div>
						<button
							onClick={logout}
							className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors"
							title="Sign Out"
						>
							<LogOut className="w-4 h-4" />
						</button>
					</div>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top Header */}
				<header className="hidden md:flex h-16 bg-slate-950/60 backdrop-blur-md border-b border-slate-800 px-8 items-center justify-between sticky top-0 z-20">
					<div className="flex items-center gap-3">
						<span className="text-xs font-semibold text-slate-400">Workspace:</span>
						<span className="text-xs font-bold text-slate-200 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
							{school?.name} ({schoolCode})
						</span>
					</div>

					<div className="flex items-center gap-4">
						<Link
							href={`/${schoolCode}/portal`}
							target="_blank"
							className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
						>
							<span>Student PWA Preview</span>
							<ChevronRight className="w-3.5 h-3.5" />
						</Link>
						<div className="h-4 w-px bg-slate-800"></div>
						<span className="text-xs text-slate-400">Admin Console</span>
					</div>
				</header>

				<main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
			</div>
		</div>
	);
}

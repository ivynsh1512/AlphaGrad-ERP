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
	ShieldCheck,
	ExternalLink,
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

	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	if (loading || !user || user.role !== "admin") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
				<div className="flex flex-col items-center gap-3">
					<div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
					<p className="text-xs font-semibold text-slate-600">Verifying Admin Permissions...</p>
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
		<div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800">
			{/* Mobile Top Header */}
			<header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg overflow-hidden bg-indigo-600 p-0.5 shadow-xs shrink-0 flex items-center justify-center text-white font-bold text-sm">
						{school?.name?.charAt(0) || "A"}
					</div>
					<div>
						<h1 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px]">
							{school?.name || "Institute"}
						</h1>
						<p className="text-[10px] text-indigo-600 font-semibold">{schoolCode} • Admin</p>
					</div>
				</div>

				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
					aria-label="Toggle menu"
				>
					{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</header>

			{/* Mobile Backdrop Overlay */}
			{mobileOpen && (
				<div
					onClick={() => setMobileOpen(false)}
					className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
				/>
			)}

			{/* Responsive Sidebar (Slide-over on mobile, static on desktop) */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 bg-white text-slate-700 flex flex-col flex-shrink-0 border-r border-slate-200 shadow-lg md:shadow-none transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Institute Brand Header */}
				<div className="p-4 border-b border-slate-100 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-xs shrink-0 flex items-center justify-center text-white font-bold text-base">
							{school?.name?.charAt(0) || "A"}
						</div>
						<div className="overflow-hidden">
							<div className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate max-w-[140px]">
								{school?.name || "School Institute"}
							</div>
							<div className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1 font-mono">
								<span>{schoolCode}</span>
								<span className="text-slate-300">•</span>
								<span className="text-emerald-600 font-sans font-medium">Online</span>
							</div>
						</div>
					</div>

					<button
						onClick={() => setMobileOpen(false)}
						className="md:hidden text-slate-400 hover:text-slate-600"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Nav links by section */}
				<nav className="flex-1 p-3 space-y-5 overflow-y-auto">
					{navSections.map((section, sIdx) => {
						const visibleItems = section.items.filter((item) => {
							if (!item.featureKey) return true;
							return hasFeature(item.featureKey);
						});

						if (visibleItems.length === 0) return null;

						return (
							<div key={sIdx} className="space-y-1">
								<div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
									{section.label}
								</div>
								<div className="space-y-0.5">
									{visibleItems.map((item) => {
										const isActive = pathname === item.href;
										const Icon = item.icon;
										return (
											<Link
												key={item.href}
												href={item.href}
												className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
													isActive
														? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-xs"
														: "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
												}`}
											>
												<div className="flex items-center gap-2.5">
													<Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
													<span>{item.title}</span>
												</div>
												{item.badge && (
													<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
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
				</nav>

				{/* User Profile & Logout */}
				<div className="p-3 border-t border-slate-100">
					<div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
						<div className="truncate mr-2">
							<div className="text-xs font-bold text-slate-900 truncate">{user.fullName}</div>
							<div className="text-[10px] text-indigo-600 font-mono font-medium truncate">{user.username} (Admin)</div>
						</div>
						<button
							onClick={logout}
							title="Sign Out"
							className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
						>
							<LogOut className="w-4 h-4" />
						</button>
					</div>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
				{/* Top Header */}
				<header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 hidden md:flex items-center justify-between flex-shrink-0">
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<span className="font-semibold text-slate-700">{school?.name || "Institute"}</span>
						<ChevronRight className="w-3.5 h-3.5 text-slate-400" />
						<span className="text-indigo-600 font-semibold capitalize">
							{pathname.replace(`/${schoolCode}/admin/`, "").replace(`/${schoolCode}/admin`, "Dashboard") || "Dashboard"}
						</span>
					</div>

					<div className="flex items-center gap-3">
						<Link
							href={`/${schoolCode}/portal`}
							target="_blank"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
						>
							<span>Student PWA</span>
							<ExternalLink className="w-3.5 h-3.5 text-slate-500" />
						</Link>
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
							Admin Session Active
						</span>
						<button
							onClick={logout}
							className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
						>
							Logout
						</button>
					</div>
				</header>

				<main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">{children}</main>
			</div>
		</div>
	);
}

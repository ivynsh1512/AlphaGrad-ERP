"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
	Building2,
	ShieldCheck,
	ArrowRight,
	Sparkles,
	GraduationCap,
	BookOpen,
	Users,
	Search,
	Layers,
	Lock,
	CheckCircle2,
	ChevronRight,
	Award,
	Clock,
	DollarSign,
	TrendingUp,
	Bot,
	FileText,
	CalendarDays,
	Bell,
	LifeBuoy,
	ExternalLink,
} from "lucide-react";

export default function HomePage() {
	const [schoolCode, setSchoolCode] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	// Search schools with debounce
	useEffect(() => {
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			setSearchResults([]);
			setSearching(false);
			return;
		}

		setSearching(true);
		const timeout = setTimeout(async () => {
			try {
				const res = await api.school.search(trimmed);
				setSearchResults(res.schools || []);
				setDropdownOpen(true);
			} catch (err) {
				console.error("School search error:", err);
			} finally {
				setSearching(false);
			}
		}, 250);

		return () => clearTimeout(timeout);
	}, [searchQuery]);

	// Close dropdown when clicked outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleNavigateToSchool = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = (searchQuery || schoolCode).trim().toLowerCase();
		if (!trimmed) {
			setError("Please enter your institute code or name");
			return;
		}
		router.push(`/${trimmed}/login`);
	};

	const modules = [
		{ name: "Student Admissions", icon: Users, desc: "End-to-end student records, batch enrolments & credentials" },
		{ name: "Faculty Management", icon: GraduationCap, desc: "Teacher allocations, subject mapping & staff directory" },
		{ name: "Portion Tracking", icon: Layers, desc: "Chapter-by-chapter curriculum progress & milestone logs" },
		{ name: "Daily Attendance", icon: CheckCircle2, desc: "Instant roll-call punch, SMS alerts & monthly attendance %" },
		{ name: "Examinations & Marks", icon: Award, desc: "Gradecards, rank lists, subject marks & progress cards" },
		{ name: "Fee Management", icon: DollarSign, desc: "Fee structures, pending dues ledger & automated receipts" },
		{ name: "Class Timetable", icon: Clock, desc: "Weekly schedules, period allocations & room capacity" },
		{ name: "AI Tutor 24/7", icon: Bot, desc: "Instant doubt solving & concept explanations for students" },
		{ name: "AI Worksheets Studio", icon: FileText, desc: "Automated question paper generator from any syllabus topic" },
		{ name: "Accounts & Payroll", icon: TrendingUp, desc: "Staff salaries, voucher ledger & financial accounting" },
		{ name: "Academic Calendar", icon: CalendarDays, desc: "Term dates, holidays, exam schedules & institute events" },
		{ name: "Circulars & Notices", icon: Bell, desc: "Instant broadcast announcements to student & parent PWAs" },
	];

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
			{/* Top Header */}
			<header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
							<GraduationCap className="w-6 h-6" />
						</div>
						<div>
							<span className="text-xl font-black tracking-tight text-slate-900">AlphaGrad</span>
							<span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
								ERP Multi-Tenant
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<Link
							href="/super-admin/login"
							className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition"
						>
							<ShieldCheck className="w-4 h-4 text-indigo-600" />
							<span>Super Admin Console</span>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero & Quick School Portal Finder */}
			<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
				<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-6 shadow-xs">
					<Sparkles className="w-4 h-4 text-indigo-600" />
					Multi-Tenant Edge Architecture • Cloudflare D1 & Workers
				</div>

				<h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 max-w-4xl leading-[1.12]">
					The Operating System for <br />
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600">
						Coaching Institutes & Schools
					</span>
				</h1>

				<p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
					Single deployment, multi-tenant school isolation. Every institute gets a dedicated subpath, dynamic feature
					gating, and integrated workspaces for Admins, Faculty, Students, and Parents.
				</p>

				{/* School Search / Access Card */}
				<div className="mt-10 w-full max-w-xl bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 relative text-left">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<Building2 className="w-5 h-5 text-indigo-600" />
							<span className="text-sm font-bold text-slate-900">Find or Enter Your Institute Code</span>
						</div>
						<span className="text-[11px] font-mono text-slate-400">erp.novaxai.in/:schoolCode</span>
					</div>

					<form onSubmit={handleNavigateToSchool} className="relative">
						<div className="relative flex flex-col sm:flex-row gap-2.5" ref={dropdownRef}>
							<div className="relative flex-1">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<Search className="w-4 h-4" />
								</div>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setError("");
									}}
									onFocus={() => {
										if (searchResults.length > 0) setDropdownOpen(true);
									}}
									placeholder="Search school name or enter code (e.g. zenith)"
									className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
								/>
							</div>

							<button
								type="submit"
								className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/25 active:scale-98 shrink-0"
							>
								<span>Access ERP</span>
								<ArrowRight className="w-4 h-4" />
							</button>

							{/* Live Autocomplete Dropdown */}
							{dropdownOpen && searchResults.length > 0 && (
								<div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 max-h-64 overflow-y-auto">
									<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
										Matching Institutes
									</div>
									{searchResults.map((sch) => (
										<button
											key={sch.id}
											type="button"
											onClick={() => {
												setDropdownOpen(false);
												router.push(`/${sch.code}/login`);
											}}
											className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 text-left transition group"
										>
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
													{sch.name?.charAt(0) || "S"}
												</div>
												<div>
													<div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
														{sch.name}
													</div>
													<div className="text-[11px] text-slate-500">
														{sch.city ? `${sch.city}, ${sch.state || ""}` : "Active Institute"}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-1.5">
												<span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-700">
													{sch.code}
												</span>
												<ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</form>

					{error && <p className="mt-2 text-xs text-rose-600 text-left font-semibold">{error}</p>}

					{/* Quick Hint */}
					<div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span className="font-medium text-slate-500">Managing institute onboarding?</span>
						<Link
							href="/super-admin/login"
							className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
						>
							<span>Super Admin Console</span>
							<ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
				</div>

				{/* 3 Core Architecture Pillars */}
				<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
					<div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
						<div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">Multi-Tenant Isolation</h3>
						<p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-normal">
							Every institute receives dedicated tenant partitioning, secure school codes, isolated databases, and customized branding.
						</p>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
						<div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
							<Layers className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">Dynamic Feature Gating</h3>
						<p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-normal">
							Super Admin selectively enables or disables up to 20 ERP capabilities per school with instant runtime enforcement.
						</p>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition">
						<div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
							<Sparkles className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">Cloudflare Edge Speed</h3>
						<p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-normal">
							Zero cold-starts powered by Cloudflare Workers and global distributed SQLite D1 storage with millisecond response times.
						</p>
					</div>
				</div>

				{/* Modular Capabilities Matrix */}
				<div className="mt-20 w-full max-w-5xl text-left">
					<div className="text-center mb-10">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-3">
							Complete Enterprise Suite
						</div>
						<h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
							20 Modular Capabilities Built For Scale
						</h2>
						<p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
							Activate only the tools each coaching center or school needs. All modules are seamlessly integrated.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{modules.map((m, i) => {
							const Icon = m.icon;
							return (
								<div
									key={i}
									className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition"
								>
									<div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
										<Icon className="w-4 h-4" />
									</div>
									<h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
									<p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">{m.desc}</p>
								</div>
							);
						})}
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="w-full border-t border-slate-200 bg-white py-6">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
					<div className="flex items-center gap-2">
						<GraduationCap className="w-4 h-4 text-indigo-600" />
						<span>© 2026 AlphaGrad ERP. Multi-Tenant Enterprise Coaching Architecture.</span>
					</div>
					<div className="flex items-center gap-6">
						<Link href="/super-admin/login" className="hover:text-indigo-600 font-bold">
							Super Admin Console
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

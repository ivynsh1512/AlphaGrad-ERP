"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

export default function HomePage() {
	const [schoolCode, setSchoolCode] = useState("");
	const [error, setError] = useState("");
	const router = useRouter();

	const handleNavigateToSchool = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = schoolCode.trim().toLowerCase();
		if (!trimmed) {
			setError("Please enter your school code");
			return;
		}
		router.push(`/${trimmed}/login`);
	};

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
			{/* Navigation */}
			<header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
							<GraduationCap className="w-6 h-6" />
						</div>
						<div>
							<span className="text-xl font-bold tracking-tight text-slate-900">AlphaGrad</span>
							<span className="text-xs font-semibold ml-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
								ERP Multi-Tenant
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<Link
							href="/super-admin/login"
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
						>
							<ShieldCheck className="w-4 h-4 text-indigo-600" />
							Super Admin Portal
						</Link>
					</div>
				</div>
			</header>

			{/* Hero & Quick School Portal Finder */}
			<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
				<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-6">
					<Sparkles className="w-4 h-4 text-indigo-600" />
					Cloudflare D1 & Workers Multi-Tenant Infrastructure
				</div>

				<h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-[1.15]">
					Central Operating System for <br />
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600">
						Coaching Institutes & Schools
					</span>
				</h1>

				<p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
					Unified multi-tenant platform delivering isolated portals for Admins, Faculty, Students, and Parents.
					Powered by real-time feature toggling and AI learning assistance.
				</p>

				{/* School Code Entry Card */}
				<div className="mt-10 w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
					<div className="flex items-center gap-2 text-left mb-3">
						<Building2 className="w-5 h-5 text-indigo-600" />
						<span className="text-sm font-semibold text-slate-900">Enter Your Institute Code</span>
					</div>

					<form onSubmit={handleNavigateToSchool} className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
								<Search className="w-4 h-4" />
							</div>
							<input
								type="text"
								value={schoolCode}
								onChange={(e) => {
									setSchoolCode(e.target.value);
									setError("");
								}}
								placeholder="e.g. your-school-code"
								className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
							/>
						</div>
						<button
							type="submit"
							className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 active:scale-95"
						>
							<span>Access ERP</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</form>

					{error && <p className="mt-2 text-xs text-rose-600 text-left font-medium">{error}</p>}

					{/* Quick Hint */}
					<div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<span className="font-medium text-slate-400">Need to add a school?</span>
						<Link
							href="/super-admin/login"
							className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
						>
							Launch Super Admin Console &rarr;
						</Link>
					</div>
				</div>

				{/* 3 Pillars / Feature Highlights */}
				<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
					<div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">Super Admin Governance</h3>
						<p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
							Register new schools in seconds, assign custom school codes, and selectively grant access to 20
							modular ERP features.
						</p>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
							<Layers className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">Dynamic Feature Gating</h3>
						<p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
							If Super Admin disables a module (e.g. AI Tutor or Accounting), it is immediately removed from the
							school navigation and secured at the API boundary.
						</p>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
							<Sparkles className="w-5 h-5" />
						</div>
						<h3 className="text-base font-bold text-slate-900">AI Education Ecosystem</h3>
						<p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
							24/7 student chat tutor, automated worksheet generator, computer-based test series, and institute AI
							copilot.
						</p>
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
						<Link href="/super-admin/login" className="hover:text-indigo-600 font-medium">
							Super Admin Console
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

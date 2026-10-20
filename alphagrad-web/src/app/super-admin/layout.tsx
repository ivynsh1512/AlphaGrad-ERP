"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, LogOut, Globe, ExternalLink, Sparkles } from "lucide-react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const { superAdmin, superLogout, loading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!loading && !superAdmin && pathname !== "/super-admin/login") {
			router.push("/super-admin/login");
		}
	}, [superAdmin, loading, pathname, router]);

	if (pathname === "/super-admin/login") {
		return <>{children}</>;
	}

	if (loading || !superAdmin) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center text-slate-600">
				<div className="flex items-center gap-3">
					<div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
					<span className="text-sm font-semibold">Authorizing Super Administrator...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
			{/* Top Bar — Crisp White Header */}
			<header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-bold text-base text-slate-900 tracking-tight">AlphaGrad</span>
								<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
									Super Admin Console
								</span>
							</div>
							<p className="text-[11px] text-slate-500 font-medium hidden sm:block">
								Multi-Tenant Platform Governance & Module Matrix
							</p>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<Link
							href="/"
							target="_blank"
							className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 font-medium"
						>
							<Globe className="w-3.5 h-3.5 text-slate-400" />
							<span>Platform Root</span>
							<ExternalLink className="w-3 h-3 opacity-60" />
						</Link>

						<div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

						<div className="flex items-center gap-3">
							<div className="text-right hidden sm:block">
								<div className="text-xs font-bold text-slate-900">{superAdmin.fullName}</div>
								<div className="text-[11px] text-slate-500">{superAdmin.email}</div>
							</div>

							<button
								onClick={superLogout}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all"
								title="Sign out of Super Admin"
							>
								<LogOut className="w-3.5 h-3.5" />
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
		</div>
	);
}

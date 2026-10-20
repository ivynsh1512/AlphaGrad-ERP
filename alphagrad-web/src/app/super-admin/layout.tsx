"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, LogOut, Building2, LayoutDashboard, Globe, ExternalLink } from "lucide-react";

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
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
				<div className="flex items-center gap-3">
					<div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
					<span className="text-sm font-medium">Validating Super Admin Authorization...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
			{/* Top Bar */}
			<header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-bold text-base text-white tracking-tight">AlphaGrad</span>
								<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
									Super Admin Master
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<Link
							href="/"
							target="_blank"
							className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
						>
							<Globe className="w-3.5 h-3.5" />
							<span>Platform Root</span>
							<ExternalLink className="w-3 h-3 opacity-60" />
						</Link>

						<div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

						<div className="flex items-center gap-3">
							<div className="text-right hidden sm:block">
								<div className="text-xs font-semibold text-slate-200">{superAdmin.fullName}</div>
								<div className="text-[10px] text-slate-400">{superAdmin.email}</div>
							</div>

							<button
								onClick={superLogout}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-medium border border-slate-700 hover:border-rose-500/30 transition-all"
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

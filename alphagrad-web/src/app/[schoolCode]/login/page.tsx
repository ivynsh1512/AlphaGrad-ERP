"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
	Building2,
	Lock,
	User as UserIcon,
	ArrowRight,
	AlertCircle,
	Sparkles,
	GraduationCap,
	ShieldCheck,
	CheckCircle,
} from "lucide-react";

export default function SchoolLoginPage() {
	const params = useParams();
	const schoolCode = (params.schoolCode as string)?.toLowerCase();
	const { login, school, features } = useAuth();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await login(schoolCode, username, password);
		} catch (err: any) {
			setError(err?.message || "Invalid username or password");
		} finally {
			setLoading(false);
		}
	};

	const quickFill = (u: string, p: string) => {
		setUsername(u);
		setPassword(p);
		setError("");
	};

	const enabledModulesCount = features
		? Object.entries(features).filter(([k, v]) => v === 1 && k !== "updatedAt").length
		: 20;

	const isProventus = schoolCode === "proventus";
	const isZenith = schoolCode === "zenith";

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
			<div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
				{/* School Badge & Logo */}
				<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-500/25 mb-4">
					<GraduationCap className="w-8 h-8" />
				</div>

				<div className="flex items-center justify-center gap-2 mb-2">
					<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
						{schoolCode}
					</span>
					<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
						{school?.brand || "AlphaGrad"} ERP
					</span>
				</div>

				<h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
					{school?.name || "Institute Portal Login"}
				</h2>

				{school?.tagline && <p className="mt-1 text-xs text-slate-500 italic">{school.tagline}</p>}

				<div className="mt-2 text-xs text-slate-500">
					Unified Portal for Administrators, Faculty, Students & Parents
				</div>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
					{error && (
						<div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
							<div className="text-xs font-medium text-rose-800">{error}</div>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
								Username / Admission No / Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<UserIcon className="w-5 h-5" />
								</div>
								<input
									type="text"
									required
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
									placeholder="e.g. Alpha1000 or email"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
								Password
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<Lock className="w-5 h-5" />
								</div>
								<input
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
									placeholder="••••••••••••"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-md shadow-indigo-600/25 active:scale-98 disabled:opacity-50"
						>
							{loading ? (
								<span>Signing In...</span>
							) : (
								<>
									<span>Sign In to Portal</span>
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					{/* Quick Testing Credential Chips */}
					<div className="mt-6 pt-5 border-t border-slate-100">
						<div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
							<span className="font-semibold text-slate-700">Quick Test Credentials:</span>
							<span className="text-[11px] text-indigo-600 font-medium">Click to Fill</span>
						</div>

						{isProventus ? (
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => quickFill("Alpha1000", "Proventus@2026")}
									className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-xs flex items-center justify-between transition-colors group"
								>
									<div>
										<span className="font-semibold text-slate-800 group-hover:text-indigo-700">
											School Administrator:
										</span>{" "}
										<span className="font-mono text-slate-600">Alpha1000</span>
									</div>
									<span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
										Admin
									</span>
								</button>

								<button
									type="button"
									onClick={() => quickFill("Alpha1933", "Proventus@2026")}
									className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-xs flex items-center justify-between transition-colors group"
								>
									<div>
										<span className="font-semibold text-slate-800 group-hover:text-emerald-700">
											Subject Faculty (Math):
										</span>{" "}
										<span className="font-mono text-slate-600">Alpha1933</span>
									</div>
									<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
										Teacher
									</span>
								</button>

								<button
									type="button"
									onClick={() => quickFill("Alpha1935", "Proventus@2026")}
									className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 text-xs flex items-center justify-between transition-colors group"
								>
									<div>
										<span className="font-semibold text-slate-800 group-hover:text-purple-700">
											Student & Parent:
										</span>{" "}
										<span className="font-mono text-slate-600">Alpha1935</span>
									</div>
									<span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
										Student
									</span>
								</button>
							</div>
						) : isZenith ? (
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => quickFill("Zenith1000", "Zenith@2026")}
									className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-xs flex items-center justify-between transition-colors group"
								>
									<div>
										<span className="font-semibold text-slate-800 group-hover:text-emerald-700">
											School Administrator:
										</span>{" "}
										<span className="font-mono text-slate-600">Zenith1000</span>
									</div>
									<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
										Admin
									</span>
								</button>
							</div>
						) : (
							<div className="text-xs text-slate-500 italic">
								Please enter credentials provided by your Institute Administrator.
							</div>
						)}
					</div>

					{/* Active Modules Indicator */}
					<div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
						<span>Subscribed Capabilities:</span>
						<span className="font-semibold text-indigo-600">{enabledModulesCount} Active Modules</span>
					</div>
				</div>

				<div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
					<Link href="/" className="hover:text-slate-700 font-medium">
						Switch School Code
					</Link>
					<span>•</span>
					<Link href="/super-admin/login" className="hover:text-indigo-600 font-medium">
						Super Admin Portal
					</Link>
				</div>
			</div>
		</div>
	);
}

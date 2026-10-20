"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Building2 } from "lucide-react";

export default function SuperAdminLoginPage() {
	const { superLogin } = useAuth();
	const [email, setEmail] = useState("superadmin@alphagrad.in");
	const [password, setPassword] = useState("AlphaGrad@Super2026");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await superLogin(email, password);
		} catch (err: any) {
			setError(err?.message || "Failed to authenticate Super Admin");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
			<div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
				<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30 mb-4">
					<ShieldCheck className="w-8 h-8" />
				</div>
				<h2 className="text-3xl font-extrabold tracking-tight text-white">Super Admin Console</h2>
				<p className="mt-2 text-sm text-slate-400">
					AlphaGrad Global Platform & Institute Governance
				</p>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-700/80">
					{error && (
						<div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
							<div className="text-sm text-rose-200">{error}</div>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
								Super Admin Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<Mail className="w-5 h-5" />
								</div>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
									placeholder="superadmin@alphagrad.in"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
								Master Password
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
									className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
									placeholder="••••••••••••"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
						>
							{loading ? (
								<span>Authenticating Master Keys...</span>
							) : (
								<>
									<span>Access Super Admin</span>
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					{/* Demo Credential Helper */}
					<div className="mt-6 pt-5 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
						<span>Default Master Credential:</span>
						<button
							type="button"
							onClick={() => {
								setEmail("superadmin@alphagrad.in");
								setPassword("AlphaGrad@Super2026");
							}}
							className="text-indigo-400 hover:text-indigo-300 font-medium underline"
						>
							Auto-fill Default
						</button>
					</div>
				</div>

				<div className="mt-8 text-center text-xs text-slate-500">
					<Link href="/" className="hover:text-slate-400 font-medium inline-flex items-center gap-1.5">
						<Building2 className="w-3.5 h-3.5" />
						Back to School Portal Finder
					</Link>
				</div>
			</div>
		</div>
	);
}

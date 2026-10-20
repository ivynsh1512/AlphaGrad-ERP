"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
	ShieldCheck,
	Lock,
	Mail,
	ArrowRight,
	AlertCircle,
	ArrowLeft,
	Eye,
	EyeOff,
	Sparkles,
} from "lucide-react";

export default function SuperAdminLoginPage() {
	const { superLogin } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim() || !password) {
			setError("Please enter your Super Administrator email and password.");
			return;
		}

		setError("");
		setLoading(true);

		try {
			await superLogin(email.trim(), password);
		} catch (err: any) {
			setError(err?.message || "Failed to authenticate Super Admin. Verify your credentials.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 selection:bg-indigo-500 selection:text-white">
			{/* Top Header */}
			<header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-20">
				<Link
					href="/"
					className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
				>
					<ArrowLeft className="w-4 h-4" />
					<span>Back to AlphaGrad Platform</span>
				</Link>

				<div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
					<span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
					<span>Cloudflare Secured Governance</span>
				</div>
			</header>

			{/* Main Login Card */}
			<main className="flex-1 flex items-center justify-center p-4 sm:p-8">
				<div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 space-y-6">
					{/* Brand Header */}
					<div className="text-center space-y-2">
						<div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 mx-auto">
							<ShieldCheck className="w-8 h-8" />
						</div>
						<h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Console</h1>
						<p className="text-xs text-slate-500 max-w-xs mx-auto">
							Authorize with platform root credentials to manage schools, codes, and feature entitlements.
						</p>
					</div>

					{/* Error Alert */}
					{error && (
						<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
							<div className="text-xs text-rose-800 font-medium leading-relaxed">{error}</div>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
								Administrator Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<Mail className="w-4 h-4" />
								</div>
								<input
									type="email"
									required
									autoFocus
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="superadmin@alphagrad.in"
									className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
								Secret Master Password
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<Lock className="w-4 h-4" />
								</div>
								<input
									type={showPassword ? "text" : "password"}
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••••••"
									className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
									tabIndex={-1}
								>
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-[0.99] mt-2 cursor-pointer"
						>
							{loading ? (
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<>
									<span>Authenticate Master Console</span>
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					<div className="pt-2 text-center">
						<p className="text-[11px] text-slate-400">
							Protected by Cloudflare Worker API & Encrypted Environment Secrets
						</p>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white">
				<span>© 2026 AlphaGrad ERP. Multi-Tenant Enterprise Architecture.</span>
			</footer>
		</div>
	);
}

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
	Eye,
	EyeOff,
	ArrowLeft,
	ShieldCheck,
	CheckCircle,
} from "lucide-react";

export default function SchoolLoginPage() {
	const params = useParams();
	const schoolCode = (params.schoolCode as string)?.toLowerCase();
	const { login, school, features } = useAuth();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await login(schoolCode, username, password);
		} catch (err: any) {
			setError(err?.message || "Invalid username or password. Please verify credentials.");
		} finally {
			setLoading(false);
		}
	};

	const enabledModulesCount = features
		? Object.entries(features).filter(([k, v]) => v === 1 && k !== "updatedAt").length
		: 20;

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 selection:bg-indigo-500 selection:text-white">
			{/* Top Header Navigation */}
			<header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-20">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
				>
					<ArrowLeft className="w-4 h-4 text-slate-500" />
					<span>Back to AlphaGrad Institute Directory</span>
				</Link>

				<div className="flex items-center gap-3">
					<div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
						<span>Institute Code:</span>
						<span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
							{schoolCode}
						</span>
					</div>
					<Link
						href="/super-admin/login"
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
						<span>Super Admin</span>
					</Link>
				</div>
			</header>

			{/* Main Login Card */}
			<main className="flex-1 flex items-center justify-center p-4 sm:p-8">
				<div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6">
					{/* Brand Header */}
					<div className="text-center space-y-2">
						<div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-md shadow-indigo-500/20 flex items-center justify-center mx-auto text-white font-black text-2xl">
							{school?.name?.charAt(0) || "A"}
						</div>

						<div className="pt-1">
							<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
								<span>{schoolCode}</span>
								<span>•</span>
								<span>{school?.brand || "AlphaGrad"} ERP</span>
							</div>

							<h1 className="text-2xl font-black text-slate-900 tracking-tight">
								{school?.name || "Institute Portal Login"}
							</h1>

							{school?.tagline ? (
								<p className="text-xs text-slate-500 italic mt-0.5">{school.tagline}</p>
							) : (
								<p className="text-xs text-slate-500 mt-0.5">
									Unified Portal for Admins, Faculty, Students & Parents
								</p>
							)}
						</div>
					</div>

					{/* Error Alert */}
					{error && (
						<div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs">
							<AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
							<div className="flex-1 font-medium leading-relaxed">{error}</div>
						</div>
					)}

					{/* Login Form */}
					<form onSubmit={handleSubmit} className="space-y-4 text-xs">
						<div>
							<label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
								Username / Admission No / Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
									<UserIcon className="w-4 h-4" />
								</div>
								<input
									type="text"
									required
									autoFocus
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="e.g. Alpha1000 or admin email"
									className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
								/>
							</div>
						</div>

						<div>
							<label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
								Account Password
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
									placeholder="Enter your account password"
									className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
									aria-label="Toggle password visibility"
								>
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-md shadow-indigo-600/25 active:scale-98 disabled:opacity-50"
						>
							{loading ? (
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span>Signing In...</span>
								</div>
							) : (
								<>
									<span>Sign In to Workspace</span>
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					{/* Guidance */}
					<div className="pt-2 border-t border-slate-100 flex flex-col gap-3 text-center">
						<p className="text-[11px] text-slate-500">
							Credentials are provided by your institute administrator during admission or enrollment.
						</p>

						<div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
							<span className="font-medium">Active Capabilities:</span>
							<span className="font-bold text-indigo-700">{enabledModulesCount} Licensed Modules</span>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="w-full border-t border-slate-200 bg-white py-4 px-6">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
					<div className="flex items-center gap-2">
						<GraduationCap className="w-4 h-4 text-indigo-600" />
						<span>© 2026 AlphaGrad ERP. Multi-Tenant Enterprise Architecture.</span>
					</div>
					<div className="flex items-center gap-4">
						<Link href="/" className="hover:text-slate-800 font-medium">
							Change Institute
						</Link>
						<span>•</span>
						<Link href="/super-admin/login" className="hover:text-indigo-600 font-medium">
							Super Admin Portal
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

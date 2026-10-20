"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth, School } from "@/context/AuthContext";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
	const params = useParams();
	const router = useRouter();
	const schoolCode = (params.schoolCode as string)?.toLowerCase();
	const { school, setSchoolContext } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!schoolCode) return;

		let isMounted = true;

		async function fetchSchoolInfo() {
			try {
				const res = await api.school.getPublic(schoolCode);
				if (isMounted) {
					setSchoolContext(res.school, res.features);
					setLoading(false);
				}
			} catch (err: any) {
				if (isMounted) {
					setError(err?.message || `Institute "${schoolCode}" not found or account is not active.`);
					setLoading(false);
				}
			}
		}

		fetchSchoolInfo();

		return () => {
			isMounted = false;
		};
	}, [schoolCode]);

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
				<div className="flex items-center gap-3">
					<RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
					<span className="text-sm font-medium">Resolving Institute Workspace ({schoolCode})...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
				<div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
					<AlertCircle className="w-6 h-6" />
				</div>
				<h2 className="text-xl font-bold text-slate-900">Institute Not Found</h2>
				<p className="mt-2 text-sm text-slate-600 max-w-md">{error}</p>
				<Link
					href="/"
					className="mt-6 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
				>
					Return to AlphaGrad ERP Directory
				</Link>
			</div>
		);
	}

	return <>{children}</>;
}

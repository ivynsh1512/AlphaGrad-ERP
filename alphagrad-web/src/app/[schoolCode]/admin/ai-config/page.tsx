"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	Cpu,
	Sparkles,
	ShieldCheck,
	Save,
	CheckCircle,
	AlertCircle,
	Sliders,
	Lock,
	GraduationCap,
	BookOpen,
} from "lucide-react";

export default function AdminAiConfigPage() {
	const [config, setConfig] = useState<any | null>(null);
	const [directory, setDirectory] = useState<{ subjects: any[]; classes: any[]; availableModels: any[] }>({
		subjects: [],
		classes: [],
		availableModels: [],
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Editable fields
	const [isTutorEnabled, setIsTutorEnabled] = useState(true);
	const [isWorksheetGenEnabled, setIsWorksheetGenEnabled] = useState(true);
	const [isTestGenEnabled, setIsTestGenEnabled] = useState(true);
	const [defaultModel, setDefaultModel] = useState("openai/gpt-oss-120b");
	const [maxRequestLength, setMaxRequestLength] = useState(4000);
	const [dailyLimitPerStudent, setDailyLimitPerStudent] = useState(50);
	const [dailyLimitPerGrade, setDailyLimitPerGrade] = useState(500);
	const [teachingStyle, setTeachingStyle] = useState("encouraging_and_structured");
	const [systemPromptExtra, setSystemPromptExtra] = useState("");
	const [gradeGuidelines, setGradeGuidelines] = useState<Record<string, string>>({});

	useEffect(() => {
		async function loadConfig() {
			try {
				const res = await api.ai.admin.getConfig();
				setConfig(res.config);
				setDirectory(res.directory);

				setIsTutorEnabled(res.config.isTutorEnabled);
				setIsWorksheetGenEnabled(res.config.isWorksheetGenEnabled);
				setIsTestGenEnabled(res.config.isTestGenEnabled);
				setDefaultModel(res.config.defaultModel);
				setMaxRequestLength(res.config.maxRequestLength);
				setDailyLimitPerStudent(res.config.dailyLimitPerStudent);
				setDailyLimitPerGrade(res.config.dailyLimitPerGrade);
				setTeachingStyle(res.config.teachingStyle);
				setSystemPromptExtra(res.config.systemPromptExtra || "");
				setGradeGuidelines(res.config.gradeGuidelines || {});
			} catch (err: any) {
				setError(err?.message || "Failed to load AI configuration");
			} finally {
				setLoading(false);
			}
		}

		loadConfig();
	}, []);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccessMsg(null);

		try {
			await api.ai.admin.updateConfig({
				isTutorEnabled,
				isWorksheetGenEnabled,
				isTestGenEnabled,
				defaultModel,
				maxRequestLength,
				dailyLimitPerStudent,
				dailyLimitPerGrade,
				teachingStyle,
				systemPromptExtra,
				gradeGuidelines,
			});

			setSuccessMsg("AI Governance and Limits saved successfully!");
		} catch (err: any) {
			setError(err?.message || "Failed to save AI configuration");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
				<div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
				<p className="text-xs font-semibold text-slate-600">Loading AI Governance Settings...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
						<Cpu className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">AI Governance & Configuration</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Configure model providers, student daily rate limits, grade guidelines, and feature switches.
						</p>
					</div>
				</div>
			</div>

			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
					<CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
					<span className="font-semibold">{successMsg}</span>
				</div>
			)}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<form onSubmit={handleSave} className="space-y-6">
				{/* 1. Feature Enablement Toggles */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
					<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<Sliders className="w-4 h-4 text-indigo-600" />
						<span>Master Feature Switches</span>
					</h2>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<label className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
							<div>
								<span className="font-bold text-xs text-slate-900 block">AI Student Tutor</span>
								<span className="text-[11px] text-slate-500">Student doubt solving</span>
							</div>
							<input
								type="checkbox"
								checked={isTutorEnabled}
								onChange={(e) => setIsTutorEnabled(e.target.checked)}
								className="w-4 h-4 text-indigo-600 rounded"
							/>
						</label>

						<label className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
							<div>
								<span className="font-bold text-xs text-slate-900 block">AI Worksheet Studio</span>
								<span className="text-[11px] text-slate-500">Practice & homework generator</span>
							</div>
							<input
								type="checkbox"
								checked={isWorksheetGenEnabled}
								onChange={(e) => setIsWorksheetGenEnabled(e.target.checked)}
								className="w-4 h-4 text-indigo-600 rounded"
							/>
						</label>

						<label className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
							<div>
								<span className="font-bold text-xs text-slate-900 block">AI Test Series</span>
								<span className="text-[11px] text-slate-500">Exam generation & practice</span>
							</div>
							<input
								type="checkbox"
								checked={isTestGenEnabled}
								onChange={(e) => setIsTestGenEnabled(e.target.checked)}
								className="w-4 h-4 text-indigo-600 rounded"
							/>
						</label>
					</div>
				</div>

				{/* 2. Model & Provider Settings */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
					<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-amber-500" />
						<span>Groq AI Model & Provider Architecture</span>
					</h2>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
						<div>
							<label className="font-bold text-slate-700 block mb-1">Authoritative Default Model</label>
							<select
								value={defaultModel}
								onChange={(e) => setDefaultModel(e.target.value)}
								className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
							>
								{directory.availableModels?.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name}
									</option>
								))}
							</select>
							<p className="text-[11px] text-slate-400 mt-1">
								Executed through secure server-side Cloudflare Worker requests using Groq API.
							</p>
						</div>

						<div>
							<label className="font-bold text-slate-700 block mb-1">Max Request Input Length (Characters)</label>
							<input
								type="number"
								min="500"
								max="12000"
								step="500"
								value={maxRequestLength}
								onChange={(e) => setMaxRequestLength(Number(e.target.value))}
								className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold"
							/>
							<p className="text-[11px] text-slate-400 mt-1">Protects against buffer overflows and excessive token consumption.</p>
						</div>
					</div>
				</div>

				{/* 3. Rate Limits & Abuse Prevention */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
					<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<ShieldCheck className="w-4 h-4 text-emerald-600" />
						<span>Usage Limits & Abuse Mitigation</span>
					</h2>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
						<div>
							<label className="font-bold text-slate-700 block mb-1">Per-Student Daily Question Limit</label>
							<input
								type="number"
								min="5"
								max="200"
								value={dailyLimitPerStudent}
								onChange={(e) => setDailyLimitPerStudent(Number(e.target.value))}
								className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold"
							/>
							<p className="text-[11px] text-slate-400 mt-1">Resets automatically every midnight.</p>
						</div>

						<div>
							<label className="font-bold text-slate-700 block mb-1">Per-Grade Daily Aggregate Question Limit</label>
							<input
								type="number"
								min="50"
								max="5000"
								value={dailyLimitPerGrade}
								onChange={(e) => setDailyLimitPerGrade(Number(e.target.value))}
								className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold"
							/>
							<p className="text-[11px] text-slate-400 mt-1">Protects institute-wide API quota spending.</p>
						</div>
					</div>
				</div>

				{/* 4. Grade-Specific Teaching Guidelines */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
					<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<GraduationCap className="w-4 h-4 text-indigo-600" />
						<span>Grade-Specific Curricular Guidelines</span>
					</h2>
					<p className="text-xs text-slate-500">
						The AI Tutor dynamically injects these guidelines to calibrate vocabulary, derivation depth, and exam focus.
					</p>

					<div className="space-y-3">
						{directory.classes?.map((c) => (
							<div key={c.code} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
								<span className="text-xs font-bold text-slate-900">
									{c.name} ({c.code})
								</span>
								<textarea
									rows={2}
									value={gradeGuidelines[c.code] || ""}
									onChange={(e) =>
										setGradeGuidelines({
											...gradeGuidelines,
											[c.code]: e.target.value,
										})
									}
									placeholder={`Curriculum instructions for ${c.name}...`}
									className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
								/>
							</div>
						))}
					</div>
				</div>

				{/* 5. Additional System Prompt Ethos */}
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
					<label className="font-bold text-slate-900 text-xs block">
						School Institutional Ethos & Pedagogical Instructions
					</label>
					<textarea
						rows={3}
						value={systemPromptExtra}
						onChange={(e) => setSystemPromptExtra(e.target.value)}
						placeholder="Uphold the Tri-Pillar model: Educate, Equilibrate, Elevate..."
						className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800"
					/>
				</div>

				{/* Submit Button */}
				<div className="flex items-center justify-end">
					<button
						type="submit"
						disabled={saving}
						className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2"
					>
						<Save className="w-4 h-4" />
						<span>{saving ? "Saving Changes..." : "Save AI Governance Configuration"}</span>
					</button>
				</div>
			</form>
		</div>
	);
}

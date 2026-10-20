"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	FileText,
	Sparkles,
	Printer,
	BookOpen,
	GraduationCap,
	Clock,
	CheckCircle,
	HelpCircle,
	ChevronDown,
	ChevronUp,
	Plus,
	RotateCw,
	Layers,
	Eye,
	EyeOff,
} from "lucide-react";

export default function StudentWorksheetsPage() {
	const { user, school } = useAuth();
	const [academicProfile, setAcademicProfile] = useState<any>(null);
	const [savedWorksheets, setSavedWorksheets] = useState<any[]>([]);
	const [activeWorksheet, setActiveWorksheet] = useState<any | null>(null);

	// Generator Form state
	const [selectedSubjectId, setSelectedSubjectId] = useState("");
	const [selectedBoard, setSelectedBoard] = useState<"CBSE" | "ICSE" | "NIOS">("CBSE");
	const [chapter, setChapter] = useState("");
	const [topicsStr, setTopicsStr] = useState("");
	const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
	const [questionCount, setQuestionCount] = useState<number>(5);
	const [includeHints, setIncludeHints] = useState(true);
	const [includeSolutions, setIncludeSolutions] = useState(true);

	const [generating, setGenerating] = useState(false);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showSolutions, setShowSolutions] = useState(false);

	useEffect(() => {
		async function loadData() {
			try {
				const [profRes, listRes] = await Promise.all([
					api.ai.tutor.getProfile().catch(() => ({ profile: null })),
					api.worksheets.list().catch(() => ({ worksheets: [] })),
				]);

				if (profRes?.profile) {
					setAcademicProfile(profRes.profile);
					if (profRes.profile.board) {
						const b = String(profRes.profile.board).toUpperCase();
						if (b === "NIOS" || b === "ICSE" || b === "CBSE") {
							setSelectedBoard(b as "CBSE" | "ICSE" | "NIOS");
						}
					} else if (
						(profRes.profile.className || "").toLowerCase().includes("nios") ||
						(profRes.profile.targetExam || "").toLowerCase().includes("nios")
					) {
						setSelectedBoard("NIOS");
					} else if (
						(profRes.profile.className || "").toLowerCase().includes("icse") ||
						(profRes.profile.targetExam || "").toLowerCase().includes("icse")
					) {
						setSelectedBoard("ICSE");
					}

					if (profRes.profile.enrolledSubjects?.length > 0) {
						setSelectedSubjectId(profRes.profile.enrolledSubjects[0].id);
					}
				}

				if (listRes?.worksheets) {
					setSavedWorksheets(listRes.worksheets);
					if (listRes.worksheets.length > 0) {
						loadWorksheetDetails(listRes.worksheets[0].id);
					}
				}
			} catch (err: any) {
				setError(err?.message || "Failed to load worksheets");
			} finally {
				setLoadingHistory(false);
			}
		}

		loadData();
	}, []);

	const loadWorksheetDetails = async (id: string) => {
		try {
			setError(null);
			const res = await api.worksheets.get(id);
			setActiveWorksheet(res.worksheet);
		} catch (err: any) {
			setError(err?.message || "Failed to load worksheet");
		}
	};

	const handleGenerate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedSubjectId || generating) return;

		setGenerating(true);
		setError(null);

		const topics = topicsStr
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		try {
			const res = await api.worksheets.generate({
				subjectId: selectedSubjectId,
				board: selectedBoard,
				chapter,
				topics,
				difficulty,
				questionCount,
				includeHints,
				includeSolutions,
			});

			setActiveWorksheet(res.worksheet);
			setSavedWorksheets((prev) => [res.worksheet, ...prev]);
		} catch (err: any) {
			setError(err?.message || "Failed to generate AI practice worksheet. Please try again.");
		} finally {
			setGenerating(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
						<FileText className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">AI Practice Worksheets</h1>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
								Self-Paced Practice
							</span>
						</div>
						<p className="text-xs text-slate-500 mt-0.5">
							Generate customized, curriculum-aligned problem sets with worked step-by-step solutions for{" "}
							<strong className="text-indigo-700">{academicProfile?.className || "your assigned grade"}</strong>.
						</p>
					</div>
				</div>

				{activeWorksheet && (
					<button
						onClick={handlePrint}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition shrink-0"
					>
						<Printer className="w-4 h-4" />
						<span>Print / Save PDF</span>
					</button>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Worksheet Generation Form */}
				<div className="lg:col-span-1 space-y-4">
					<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
						<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-amber-500" />
							<span>Generate New Problem Set</span>
						</h2>

						<form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
							{/* Board / Curriculum Selector */}
							<div>
								<label className="font-bold text-slate-700 block mb-1">Target Board</label>
								<div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
									{(["CBSE", "ICSE", "NIOS"] as const).map((b) => (
										<button
											key={b}
											type="button"
											onClick={() => setSelectedBoard(b)}
											className={`py-1 rounded-lg text-xs font-bold transition text-center ${
												selectedBoard === b
													? b === "CBSE"
														? "bg-indigo-600 text-white shadow-xs"
														: b === "ICSE"
														? "bg-teal-600 text-white shadow-xs"
														: "bg-amber-600 text-white shadow-xs"
													: "text-slate-600 hover:text-slate-900 hover:bg-white"
											}`}
										>
											{b}
										</button>
									))}
								</div>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Subject</label>
								<select
									value={selectedSubjectId}
									onChange={(e) => setSelectedSubjectId(e.target.value)}
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
								>
									{academicProfile?.enrolledSubjects?.map((s: any) => (
										<option key={s.id} value={s.id}>
											{s.name} ({s.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Chapter / Unit Title</label>
								<input
									type="text"
									value={chapter}
									onChange={(e) => setChapter(e.target.value)}
									placeholder="e.g. Laws of Motion & Friction"
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Specific Topics (Comma separated)</label>
								<input
									type="text"
									value={topicsStr}
									onChange={(e) => setTopicsStr(e.target.value)}
									placeholder="e.g. Normal force, Pulley system, Static friction"
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="grid grid-cols-2 gap-2.5">
								<div>
									<label className="font-bold text-slate-700 block mb-1">Difficulty</label>
									<select
										value={difficulty}
										onChange={(e: any) => setDifficulty(e.target.value)}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold"
									>
										<option value="easy">Easy Foundation</option>
										<option value="medium">Medium Standard</option>
										<option value="hard">Hard Exam Prep</option>
										<option value="mixed">Mixed Tier</option>
									</select>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">Question Count</label>
									<select
										value={questionCount}
										onChange={(e) => setQuestionCount(Number(e.target.value))}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold"
									>
										<option value={3}>3 Questions</option>
										<option value={5}>5 Questions</option>
										<option value={8}>8 Questions</option>
										<option value={10}>10 Questions</option>
									</select>
								</div>
							</div>

							<div className="pt-2 border-t border-slate-200/80 space-y-2">
								<label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
									<input
										type="checkbox"
										checked={includeHints}
										onChange={(e) => setIncludeHints(e.target.checked)}
										className="rounded text-indigo-600 focus:ring-indigo-500"
									/>
									<span>Include conceptual hints</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
									<input
										type="checkbox"
										checked={includeSolutions}
										onChange={(e) => setIncludeSolutions(e.target.checked)}
										className="rounded text-indigo-600 focus:ring-indigo-500"
									/>
									<span>Include worked solutions & answer key</span>
								</label>
							</div>

							<button
								type="submit"
								disabled={generating}
								className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
							>
								{generating ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Generating Worksheet...</span>
									</>
								) : (
									<>
										<Sparkles className="w-4 h-4 text-amber-300" />
										<span>Generate Practice Worksheet</span>
									</>
								)}
							</button>
						</form>
					</div>

					{/* Previous Worksheets History */}
					<div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Practice Sets</p>
						<div className="space-y-1.5 max-h-60 overflow-y-auto">
							{savedWorksheets.length === 0 ? (
								<p className="text-xs text-slate-400 italic">No worksheets saved yet.</p>
							) : (
								savedWorksheets.map((ws) => (
									<button
										key={ws.id}
										onClick={() => loadWorksheetDetails(ws.id)}
										className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
											activeWorksheet?.id === ws.id
												? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200"
												: "hover:bg-slate-50 text-slate-700"
										}`}
									>
										<span className="truncate">{ws.title}</span>
										<span className="text-[10px] text-slate-400 shrink-0 ml-2">
											{ws.questionCount || 5} Qs
										</span>
									</button>
								))
							)}
						</div>
					</div>
				</div>

				{/* Worksheet Printable Presentation Pane */}
				<div className="lg:col-span-2">
					{error && (
						<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4">
							{error}
						</div>
					)}

					{activeWorksheet ? (
						<div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
							{/* Official Institute Branding Header */}
							<div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 p-1 shadow-xs shrink-0 flex items-center justify-center">
										<img src={school?.logoUrl || "/logo.png"} alt={school?.name || "School Logo"} className="w-full h-full object-contain" />
									</div>
									<div>
										<h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
											{school?.name || "School Institute"}
										</h2>
										<p className="text-[11px] font-semibold text-indigo-600 mt-1">
											{school?.tagline || "Academic Assessment Practice"}
										</p>
									</div>
								</div>
								<div className="text-right text-[11px] text-slate-600 font-medium">
									<p>{school?.city ? `${school?.city}, ${school?.state || ""}` : "Examination Center"}</p>
									<p className="font-mono text-slate-800 font-bold">{academicProfile?.className || "Grade 11"}</p>
								</div>
							</div>

							{/* Worksheet Title and Meta Bar */}
							<div>
								<h3 className="text-base sm:text-lg font-black text-slate-900">{activeWorksheet.title}</h3>
								<div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
									<div>
										<span className="text-slate-400 block text-[10px] uppercase font-bold">Subject</span>
										<span className="font-bold text-slate-800">{activeWorksheet.subjectName || "Academic"}</span>
									</div>
									<div>
										<span className="text-slate-400 block text-[10px] uppercase font-bold">Difficulty</span>
										<span className="capitalize font-bold text-slate-800">{activeWorksheet.difficulty || "Medium"}</span>
									</div>
									<div>
										<span className="text-slate-400 block text-[10px] uppercase font-bold">Time Limit</span>
										<span className="font-bold text-slate-800">{activeWorksheet.estimatedMinutes || 30} mins</span>
									</div>
									<div>
										<span className="text-slate-400 block text-[10px] uppercase font-bold">Max Marks</span>
										<span className="font-bold text-slate-800">{activeWorksheet.totalMarks || 25}</span>
									</div>
								</div>
								{activeWorksheet.instructions && (
									<p className="text-xs text-slate-500 italic mt-2">
										<strong>Instructions:</strong> {activeWorksheet.instructions}
									</p>
								)}
							</div>

							{/* Question List */}
							<div className="space-y-6 pt-2">
								{activeWorksheet.questions?.map((q: any, idx: number) => (
									<div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-2">
												<span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
													{q.questionNumber || idx + 1}
												</span>
												<div className="text-xs sm:text-sm font-medium text-slate-900">
													<MathMarkdown content={q.questionText} />
												</div>
											</div>
											<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
												[{q.marks || 2} Marks]
											</span>
										</div>

										{/* MCQ Options */}
										{q.options && q.options.length > 0 && (
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-1">
												{q.options.map((opt: string, optIdx: number) => (
													<div
														key={optIdx}
														className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 font-medium"
													>
														{opt}
													</div>
												))}
											</div>
										)}

										{/* Hint Toggle */}
										{q.hint && (
											<div className="pl-8 pt-1 text-xs text-amber-700 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
												<strong>Hint:</strong> {q.hint}
											</div>
										)}

										{/* Ruled answer spacing for print */}
										<div className="hidden print:block h-16 border-b border-dashed border-slate-300 mt-2"></div>

										{/* Detailed Solution (When revealed or on print solutions mode) */}
										{showSolutions && (q.correctAnswer || q.detailedSolution) && (
											<div className="pl-8 pt-2 mt-2 border-t border-slate-100 text-xs bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 space-y-1">
												{q.correctAnswer && (
													<p className="font-bold text-emerald-800">
														Correct Answer: <span>{q.correctAnswer}</span>
													</p>
												)}
												{q.detailedSolution && (
													<div className="text-slate-700 pt-1">
														<strong>Worked Solution:</strong>
														<MathMarkdown content={q.detailedSolution} className="mt-1" />
													</div>
												)}
											</div>
										)}
									</div>
								))}
							</div>

							{/* Solutions Reveal Control for Practice */}
							<div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs print:hidden">
								<button
									onClick={() => setShowSolutions(!showSolutions)}
									className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
								>
									{showSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									<span>{showSolutions ? "Hide Answer Key & Solutions" : "Reveal Answer Key & Worked Solutions"}</span>
								</button>
								<span className="text-slate-400">{school?.name || "School"} Quality Verified Assessment</span>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
							<FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
							<p className="font-semibold text-slate-600">No Worksheet Selected</p>
							<p className="mt-1">Fill out the options on the left to generate an instant practice problem set.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

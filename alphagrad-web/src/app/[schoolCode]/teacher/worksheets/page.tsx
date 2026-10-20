"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	Wand2,
	Sparkles,
	FileText,
	CheckCircle,
	AlertCircle,
	Plus,
	RotateCw,
	Send,
	Edit3,
	Trash2,
	Copy,
	Check,
	Clock,
	Layers,
	ChevronRight,
	X,
	Eye,
} from "lucide-react";

export default function TeacherWorksheetsPage() {
	const { user } = useAuth();
	const [academicData, setAcademicData] = useState<{ classes: any[]; subjects: any[]; batches: any[] }>({
		classes: [],
		subjects: [],
		batches: [],
	});

	// Worksheet Generator Form
	const [selectedClassId, setSelectedClassId] = useState("");
	const [selectedSubjectId, setSelectedSubjectId] = useState("");
	const [chapter, setChapter] = useState("");
	const [topicsStr, setTopicsStr] = useState("");
	const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
	const [questionCount, setQuestionCount] = useState<number>(5);
	const [selectedBoard, setSelectedBoard] = useState<"CBSE" | "ICSE" | "NIOS">("CBSE");
	const [generating, setGenerating] = useState(false);
	const [activeWorksheet, setActiveWorksheet] = useState<any | null>(null);
	const [savedWorksheets, setSavedWorksheets] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

	// Assignment Modal
	const [assignModalOpen, setAssignModalOpen] = useState(false);
	const [assignBatchId, setAssignBatchId] = useState("");
	const [assignTitle, setAssignTitle] = useState("");
	const [assignDueDate, setAssignDueDate] = useState("");
	const [assignInstructions, setAssignInstructions] = useState("");
	const [assigning, setAssigning] = useState(false);
	const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

	useEffect(() => {
		async function loadTeacherData() {
			try {
				let assignedBatchIds: Set<string> | null = null;
				let allottedSubjectIds: Set<string> | null = null;
				if (user?.teacherId) {
					try {
						const assignRes = await api.teachers.getAssignments(user.teacherId);
						if (assignRes.assignments?.length) {
							assignedBatchIds = new Set(assignRes.assignments.map((a: any) => a.batchId));
							allottedSubjectIds = new Set(assignRes.assignments.map((a: any) => a.subjectId));
						}
					} catch (e) {
						console.warn("Could not load faculty assignments:", e);
					}
				}

				const [classesRes, subjectsRes, batchesRes, worksheetsRes] = await Promise.all([
					api.academic.classes().catch(() => ({ classes: [] })),
					api.academic.subjects().catch(() => ({ subjects: [] })),
					api.academic.batches().catch(() => ({ batches: [] })),
					api.worksheets.list().catch(() => ({ worksheets: [] })),
				]);

				let cList = classesRes.classes || [];
				let sList = subjectsRes.subjects || [];
				let bList = batchesRes.batches || [];

				if (assignedBatchIds && assignedBatchIds.size > 0) {
					bList = bList.filter((b: any) => assignedBatchIds.has(b.id));
					const allowedClassIds = new Set(bList.map((b: any) => b.classId).filter(Boolean));
					if (allowedClassIds.size > 0) {
						cList = cList.filter((c: any) => allowedClassIds.has(c.id));
					}
				}

				if (allottedSubjectIds && allottedSubjectIds.size > 0) {
					sList = sList.filter((s: any) => allottedSubjectIds.has(s.id));
				}

				setAcademicData({
					classes: cList,
					subjects: sList,
					batches: bList,
				});

				if (cList.length > 0) setSelectedClassId(cList[0].id);
				if (sList.length > 0) setSelectedSubjectId(sList[0].id);
				if (bList.length > 0) setAssignBatchId(bList[0].id);

				if (worksheetsRes.worksheets?.length > 0) {
					setSavedWorksheets(worksheetsRes.worksheets);
					loadWorksheet(worksheetsRes.worksheets[0].id);
				}
			} catch (err: any) {
				setError(err?.message || "Failed to load faculty studio data");
			}
		}

		loadTeacherData();
	}, [user?.teacherId]);

	const loadWorksheet = async (id: string) => {
		try {
			setError(null);
			const res = await api.worksheets.get(id);
			setActiveWorksheet(res.worksheet);
		} catch (err: any) {
			setError(err?.message || "Failed to load worksheet");
		}
	};

	const handleGenerateWorksheet = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedSubjectId || generating) return;

		setGenerating(true);
		setError(null);
		setAssignSuccessMsg(null);

		const topics = topicsStr
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		try {
			const res = await api.worksheets.generate({
				classId: selectedClassId || undefined,
				subjectId: selectedSubjectId,
				board: selectedBoard,
				chapter,
				topics,
				difficulty,
				questionCount,
				includeHints: true,
				includeSolutions: true,
			});

			setActiveWorksheet(res.worksheet);
			setSavedWorksheets((prev) => [res.worksheet, ...prev]);
		} catch (err: any) {
			setError(err?.message || "Failed to generate worksheet");
		} finally {
			setGenerating(false);
		}
	};

	const handleRegenerateQuestion = async (questionIndex: number) => {
		if (!activeWorksheet || regeneratingIndex !== null) return;
		setRegeneratingIndex(questionIndex);
		try {
			const res = await api.worksheets.regenerateQuestion(activeWorksheet.id, questionIndex);
			const updatedQuestions = [...activeWorksheet.questions];
			updatedQuestions[questionIndex] = res.updatedQuestion;
			setActiveWorksheet({ ...activeWorksheet, questions: updatedQuestions });
		} catch (err: any) {
			alert(err?.message || "Failed to regenerate question");
		} finally {
			setRegeneratingIndex(null);
		}
	};

	const openAssignModal = () => {
		if (!activeWorksheet) return;
		setAssignTitle(activeWorksheet.title || "Weekly Practice Assignment");
		const inSevenDays = new Date(Date.now() + 7 * 86400 * 1000).toISOString().split("T")[0];
		setAssignDueDate(inSevenDays);
		setAssignInstructions("Complete all problems before the deadline. Show steps.");
		setAssignModalOpen(true);
	};

	const handleConfirmAssignment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeWorksheet || !assignBatchId || !assignDueDate || assigning) return;

		setAssigning(true);
		setError(null);
		try {
			const res = await api.worksheets.assign({
				worksheetId: activeWorksheet.id,
				batchId: assignBatchId,
				title: assignTitle,
				dueDate: assignDueDate,
				instructions: assignInstructions,
			});

			setAssignSuccessMsg(res.message);
			setAssignModalOpen(false);
		} catch (err: any) {
			alert(err?.message || "Failed to publish assignment");
		} finally {
			setAssigning(false);
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
						<Wand2 className="w-6 h-6 text-emerald-600" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">AI Worksheet Studio</h1>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
								Faculty Workspace
							</span>
						</div>
						<p className="text-xs text-slate-500 mt-0.5">
							One-click curriculum-aligned assessment generation, question editing, and batch-wise assignment publishing.
						</p>
					</div>
				</div>

				{activeWorksheet && (
					<button
						onClick={openAssignModal}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition shrink-0"
					>
						<Send className="w-4 h-4" />
						<span>Assign to Students</span>
					</button>
				)}
			</div>

			{assignSuccessMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
					<CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
					<span className="font-semibold">{assignSuccessMsg}</span>
				</div>
			)}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Studio Generator Form */}
				<div className="lg:col-span-1 space-y-4">
					<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
						<h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-emerald-600" />
							<span>Configure Assessment</span>
						</h2>

						<form onSubmit={handleGenerateWorksheet} className="space-y-3.5 text-xs">
							<div>
								<label className="font-bold text-slate-700 block mb-1">Target Grade / Class</label>
								<select
									value={selectedClassId}
									onChange={(e) => setSelectedClassId(e.target.value)}
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
								>
									{academicData.classes?.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} ({c.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Board / Syllabus</label>
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
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
								>
									{academicData.subjects?.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name} ({s.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Chapter / Unit</label>
								<input
									type="text"
									value={chapter}
									onChange={(e) => setChapter(e.target.value)}
									placeholder="e.g. Thermodynamics & Heat Transfer"
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Topics Covered in Class</label>
								<input
									type="text"
									value={topicsStr}
									onChange={(e) => setTopicsStr(e.target.value)}
									placeholder="e.g. Carnot engine, First Law, Enthalpy"
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
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
										<option value="easy">Easy</option>
										<option value="medium">Medium</option>
										<option value="hard">Hard</option>
										<option value="mixed">Mixed</option>
									</select>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">Questions</label>
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

							<button
								type="submit"
								disabled={generating}
								className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
							>
								{generating ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Generating Assessment...</span>
									</>
								) : (
									<>
										<Sparkles className="w-4 h-4 text-amber-300" />
										<span>Generate Worksheet</span>
									</>
								)}
							</button>
						</form>
					</div>

					{/* Worksheet Library */}
					<div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Worksheets</p>
						<div className="space-y-1.5 max-h-56 overflow-y-auto">
							{savedWorksheets.map((ws) => (
								<button
									key={ws.id}
									onClick={() => loadWorksheet(ws.id)}
									className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
										activeWorksheet?.id === ws.id
											? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200"
											: "hover:bg-slate-50 text-slate-700"
									}`}
								>
									<span className="truncate">{ws.title}</span>
									<span className="text-[10px] text-slate-400 shrink-0 ml-2">{ws.questionCount} Qs</span>
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Worksheet Preview & Question Editor */}
				<div className="lg:col-span-2">
					{activeWorksheet ? (
						<div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6 shadow-xs">
							<div className="flex items-center justify-between border-b border-slate-100 pb-4">
								<div>
									<h3 className="text-base font-black text-slate-900">{activeWorksheet.title}</h3>
									<p className="text-xs text-slate-500 mt-0.5">
										{activeWorksheet.subjectName} • {activeWorksheet.questionCount} Questions •{" "}
										{activeWorksheet.totalMarks} Total Marks
									</p>
								</div>
								<button
									onClick={openAssignModal}
									className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
								>
									<Send className="w-3.5 h-3.5" />
									<span>Assign to Class</span>
								</button>
							</div>

							{/* Question Editor List */}
							<div className="space-y-4">
								{activeWorksheet.questions?.map((q: any, idx: number) => {
									const isRegen = regeneratingIndex === idx;
									return (
										<div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-start gap-2">
													<span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
														{q.questionNumber || idx + 1}
													</span>
													<div className="text-xs sm:text-sm font-semibold text-slate-900">
														<MathMarkdown content={q.questionText} />
													</div>
												</div>

												{/* Regenerate single question */}
												<button
													disabled={isRegen}
													onClick={() => handleRegenerateQuestion(idx)}
													className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition shrink-0"
													title="Regenerate this question with AI"
												>
													<RotateCw className={`w-3.5 h-3.5 ${isRegen ? "animate-spin text-indigo-600" : ""}`} />
												</button>
											</div>

											{q.options && (
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
													{q.options.map((opt: string, optIdx: number) => (
														<div key={optIdx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
															{opt}
														</div>
													))}
												</div>
											)}

											{/* Answer & Explanation Preview */}
											<div className="pl-8 pt-1 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
												<strong className="text-emerald-700 block">Correct Answer: {q.correctAnswer}</strong>
												{q.detailedSolution && (
													<p className="mt-1 text-slate-500">
														<strong>Worked Solution:</strong> {q.detailedSolution}
													</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : (
						<div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
							<FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
							<p className="font-semibold text-slate-600">AI Worksheet Studio Ready</p>
							<p className="mt-1">Configure your grade and subject on the left to generate a new assessment.</p>
						</div>
					)}
				</div>
			</div>

			{/* Assign to Students Modal */}
			{assignModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
					<div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="font-bold text-slate-900 text-sm">Assign Worksheet to Batch</h3>
							<button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleConfirmAssignment} className="space-y-3.5 text-xs">
							<div>
								<label className="font-bold text-slate-700 block mb-1">Target Batch / Cohort</label>
								<select
									value={assignBatchId}
									onChange={(e) => setAssignBatchId(e.target.value)}
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
								>
									{academicData.batches?.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name} ({b.code || "Cohort"})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Assignment Title</label>
								<input
									type="text"
									value={assignTitle}
									onChange={(e) => setAssignTitle(e.target.value)}
									required
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Submission Deadline</label>
								<input
									type="date"
									value={assignDueDate}
									onChange={(e) => setAssignDueDate(e.target.value)}
									required
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Special Instructions</label>
								<textarea
									rows={2}
									value={assignInstructions}
									onChange={(e) => setAssignInstructions(e.target.value)}
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
								/>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => setAssignModalOpen(false)}
									className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={assigning}
									className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5"
								>
									{assigning ? "Publishing..." : "Publish & Notify Cohort"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

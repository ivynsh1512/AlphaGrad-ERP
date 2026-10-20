"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	CheckSquare,
	Sparkles,
	User,
	ArrowRight,
	AlertCircle,
	CheckCircle,
	FileText,
	ChevronLeft,
	Save,
	Send,
	Layers,
	Eye,
} from "lucide-react";

export default function TeacherSubmissionsPage() {
	const searchParams = useSearchParams();
	const initialAssignmentId = searchParams.get("assignmentId");

	const [assignments, setAssignments] = useState<any[]>([]);
	const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || "");
	const [assignmentData, setAssignmentData] = useState<any | null>(null);
	const [roster, setRoster] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	// Evaluation Workbench state
	const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
	const [evaluationAnswers, setEvaluationAnswers] = useState<any[]>([]);
	const [generalFeedback, setGeneralFeedback] = useState("");
	const [evaluatingAi, setEvaluatingAi] = useState(false);
	const [savingGrade, setSavingGrade] = useState(false);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Load list of published assignments
	useEffect(() => {
		async function loadAssignments() {
			try {
				const res = await api.worksheets.teacherAssignments();
				setAssignments(res.assignments || []);
				if (!selectedAssignmentId && res.assignments?.length > 0) {
					setSelectedAssignmentId(res.assignments[0].id);
				}
			} catch (err: any) {
				setError(err?.message || "Failed to load assignments");
			} finally {
				setLoading(false);
			}
		}

		loadAssignments();
	}, []);

	// Load roster when selectedAssignmentId changes
	useEffect(() => {
		if (!selectedAssignmentId) return;

		async function loadRoster() {
			setLoading(true);
			setError(null);
			try {
				const res = await api.submissions.assignmentRoster(selectedAssignmentId);
				setAssignmentData(res.assignment);
				setRoster(res.roster || []);
				setSelectedSubmission(null);
			} catch (err: any) {
				setError(err?.message || "Failed to load submissions roster");
			} finally {
				setLoading(false);
			}
		}

		loadRoster();
	}, [selectedAssignmentId]);

	// Load individual submission into workbench
	const handleOpenSubmission = async (submissionId: string) => {
		setError(null);
		setSuccessMsg(null);
		try {
			const res = await api.submissions.get(submissionId);
			setSelectedSubmission(res.submission);
			setEvaluationAnswers(res.submission.answers || []);
			setGeneralFeedback(res.submission.teacherFeedback || "");
		} catch (err: any) {
			alert(err?.message || "Failed to load submission details");
		}
	};

	// Trigger AI Subjective Evaluation Proposal
	const handleAiGradeProposal = async () => {
		if (!selectedSubmission || evaluatingAi) return;
		setEvaluatingAi(true);
		setError(null);
		try {
			const res = await api.submissions.aiGrade(selectedSubmission.id);
			setEvaluationAnswers(res.answers || []);
			setSuccessMsg("AI evaluation proposals generated! Review and customize marks before releasing.");
		} catch (err: any) {
			setError(err?.message || "AI grading suggestion failed");
		} finally {
			setEvaluatingAi(false);
		}
	};

	// Save and release final grades
	const handleReleaseGrades = async (returnForCorrection = false) => {
		if (!selectedSubmission || savingGrade) return;
		setSavingGrade(true);
		setError(null);
		setSuccessMsg(null);

		const answersPayload = evaluationAnswers.map((a) => ({
			questionNumber: a.questionNumber,
			awardedScore: Number(a.awardedScore ?? 0),
			teacherComment: a.teacherFeedback || a.aiFeedback || "",
		}));

		try {
			const res = await api.submissions.grade(selectedSubmission.id, {
				answers: answersPayload,
				generalFeedback,
				returnForCorrection,
			});

			setSuccessMsg(res.message);
			// Refresh roster
			const rosterRes = await api.submissions.assignmentRoster(selectedAssignmentId);
			setRoster(rosterRes.roster || []);
		} catch (err: any) {
			setError(err?.message || "Failed to save grades");
		} finally {
			setSavingGrade(false);
		}
	};

	const calculateCurrentTotal = () => {
		return evaluationAnswers.reduce((sum, a) => sum + Number(a.awardedScore || 0), 0);
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
						<CheckSquare className="w-6 h-6 text-emerald-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
							Submissions & Grading Desk
						</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Evaluate student submissions with automated objective grading, AI subjective proposals, and teacher overrides.
						</p>
					</div>
				</div>

				{/* Assignment Selector */}
				{assignments.length > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-slate-500">Assignment:</span>
						<select
							value={selectedAssignmentId}
							onChange={(e) => setSelectedAssignmentId(e.target.value)}
							className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
						>
							{assignments.map((a) => (
								<option key={a.id} value={a.id}>
									{a.title} ({a.batchName})
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
					<CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
					<span className="font-semibold">{successMsg}</span>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left Column: Student Roster for the Selected Assignment */}
				<div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
					<div className="flex items-center justify-between border-b border-slate-100 pb-2">
						<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cohort Student Submissions</h3>
						<span className="text-[10px] font-bold text-slate-400">{roster.length} Students</span>
					</div>

					<div className="space-y-2 max-h-[65vh] overflow-y-auto">
						{roster.map(({ student, submission }) => {
							const isSelected = selectedSubmission?.studentId === student.studentId;
							return (
								<div
									key={student.studentId}
									onClick={() => submission && handleOpenSubmission(submission.id)}
									className={`p-3 rounded-xl border text-xs transition flex items-center justify-between ${
										submission
											? "cursor-pointer hover:bg-slate-50"
											: "opacity-60 cursor-not-allowed bg-slate-50/50"
									} ${
										isSelected
											? "border-emerald-600 bg-emerald-50/50 font-bold"
											: "border-slate-200"
									}`}
								>
									<div>
										<p className="font-bold text-slate-900">{student.fullName}</p>
										<p className="text-[10px] text-slate-400 font-mono">{student.admissionNumber}</p>
									</div>

									<div className="text-right">
										{submission ? (
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
													submission.status === "graded"
														? "bg-emerald-100 text-emerald-800"
														: "bg-blue-100 text-blue-800"
												}`}
											>
												{submission.status === "graded"
													? `${submission.totalScore}/${submission.maxScore}`
													: "Submitted"}
											</span>
										) : (
											<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
												Pending
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Right Column: Grading Workbench */}
				<div className="lg:col-span-2">
					{selectedSubmission ? (
						<div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6 shadow-xs">
							{/* Workbench Header */}
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
								<div>
									<h2 className="text-base font-black text-slate-900">
										Evaluating: {selectedSubmission.studentName}
									</h2>
									<p className="text-xs text-slate-500 mt-0.5">
										Admission No: {selectedSubmission.admissionNumber} • Current Awarded Score:{" "}
										<strong className="text-emerald-700">
											{calculateCurrentTotal()} / {selectedSubmission.maxScore || 25}
										</strong>
									</p>
								</div>

								{/* AI Evaluation Proposal Button */}
								<button
									onClick={handleAiGradeProposal}
									disabled={evaluatingAi}
									className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition flex items-center gap-1.5"
								>
									<Sparkles className="w-3.5 h-3.5 text-amber-500" />
									<span>{evaluatingAi ? "Evaluating with AI..." : "AI Grading Proposal"}</span>
								</button>
							</div>

							{/* Questions & Student Answers Evaluation List */}
							<div className="space-y-5">
								{evaluationAnswers.map((ans, idx) => (
									<div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-2">
												<span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
													{ans.questionNumber}
												</span>
												<div className="text-xs sm:text-sm font-semibold text-slate-900">
													<MathMarkdown content={ans.questionText} />
												</div>
											</div>
											<span className="text-xs font-bold text-slate-500">[{ans.maxMarks || 2} Marks]</span>
										</div>

										{/* Student Submitted Response */}
										<div className="pl-8 pt-1">
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
												Student Submitted Answer:
											</span>
											<div className="p-3 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-medium">
												{ans.studentAnswer ? (
													<MathMarkdown content={ans.studentAnswer} />
												) : (
													<span className="text-slate-400 italic">No answer provided</span>
												)}
											</div>
										</div>

										{/* AI Suggested Score & Feedback */}
										{ans.aiFeedback && (
											<div className="pl-8 pt-1">
												<div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
													<div className="flex items-center justify-between">
														<span className="font-bold flex items-center gap-1">
															<Sparkles className="w-3 h-3 text-amber-500" />
															AI Evaluation Proposal:
														</span>
														<span className="font-bold">
															Suggested Marks: {ans.aiSuggestedScore} / {ans.maxMarks}
														</span>
													</div>
													<p className="text-slate-700">{ans.aiFeedback}</p>
												</div>
											</div>
										)}

										{/* Teacher Marks Override & Comment Input */}
										<div className="pl-8 pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
											<div className="flex items-center gap-2">
												<label className="text-xs font-bold text-slate-700 shrink-0">Awarded Marks:</label>
												<input
													type="number"
													step="0.5"
													min="0"
													max={ans.maxMarks || 10}
													value={ans.awardedScore ?? 0}
													onChange={(e) => {
														const val = parseFloat(e.target.value) || 0;
														const updated = [...evaluationAnswers];
														updated[idx].awardedScore = Math.min(val, ans.maxMarks || 10);
														setEvaluationAnswers(updated);
													}}
													className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold text-slate-900"
												/>
												<span className="text-xs text-slate-400">/ {ans.maxMarks || 2}</span>
											</div>

											<input
												type="text"
												placeholder="Teacher feedback for this question..."
												value={ans.teacherFeedback || ""}
												onChange={(e) => {
													const updated = [...evaluationAnswers];
													updated[idx].teacherFeedback = e.target.value;
													setEvaluationAnswers(updated);
												}}
												className="flex-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
											/>
										</div>
									</div>
								))}
							</div>

							{/* Overall Feedback Input */}
							<div className="pt-2">
								<label className="font-bold text-slate-700 text-xs block mb-1">
									Overall Teacher Feedback & Observations
								</label>
								<textarea
									rows={2}
									value={generalFeedback}
									onChange={(e) => setGeneralFeedback(e.target.value)}
									placeholder="Provide constructive feedback, encouragement, and areas to revise..."
									className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800"
								/>
							</div>

							{/* Actions Toolbar */}
							<div className="pt-4 border-t border-slate-200 flex items-center justify-between">
								<button
									onClick={() => handleReleaseGrades(true)}
									disabled={savingGrade}
									className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs transition"
								>
									Return for Correction
								</button>

								<button
									onClick={() => handleReleaseGrades(false)}
									disabled={savingGrade}
									className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
								>
									<Send className="w-3.5 h-3.5" />
									<span>
										{savingGrade
											? "Releasing..."
											: `Confirm & Release Grades (${calculateCurrentTotal()}/${selectedSubmission.maxScore || 25})`}
									</span>
								</button>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400 text-xs">
							<FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
							<p className="font-semibold text-slate-600">No Submission Selected</p>
							<p className="mt-1">Select a student from the cohort list on the left to evaluate their submission.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

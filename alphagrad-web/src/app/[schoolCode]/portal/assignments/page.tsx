"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	ClipboardList,
	Calendar,
	CheckCircle,
	Clock,
	AlertCircle,
	ArrowRight,
	FileText,
	Check,
	Send,
	Save,
	Layers,
} from "lucide-react";

export default function StudentAssignmentsPage() {
	const { user } = useAuth();
	const [assignments, setAssignments] = useState<any[]>([]);
	const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
	const [worksheetDetails, setWorksheetDetails] = useState<any | null>(null);
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	useEffect(() => {
		loadAssignments();
	}, []);

	const loadAssignments = async () => {
		setLoading(true);
		try {
			const res = await api.worksheets.studentAssignments();
			setAssignments(res.assignments || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load assignments");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenAssignment = async (assignment: any) => {
		setSelectedAssignment(assignment);
		setError(null);
		setSuccessMsg(null);
		try {
			const res = await api.worksheets.get(assignment.worksheetId);
			setWorksheetDetails(res.worksheet);

			// Pre-fill answers if draft
			const initialAnswers: Record<number, string> = {};
			res.worksheet?.questions?.forEach((q: any) => {
				initialAnswers[q.questionNumber] = "";
			});
			setAnswers(initialAnswers);
		} catch (err: any) {
			setError(err?.message || "Failed to load assignment details");
		}
	};

	const handleSubmitAssignment = async (isDraft: boolean) => {
		if (!selectedAssignment || !worksheetDetails || submitting) return;
		setSubmitting(true);
		setError(null);
		setSuccessMsg(null);

		const answersPayload = worksheetDetails.questions.map((q: any) => ({
			questionNumber: q.questionNumber,
			questionText: q.questionText,
			type: q.type,
			studentAnswer: answers[q.questionNumber] || "",
			maxMarks: q.marks || 2,
		}));

		try {
			const res = await api.submissions.submit(selectedAssignment.id, {
				answers: answersPayload,
				isDraft,
			});

			setSuccessMsg(
				isDraft
					? "Draft saved successfully. You can return to edit before the deadline."
					: "Assignment submitted successfully! Your submission has been delivered to your faculty teacher."
			);
			loadAssignments();
		} catch (err: any) {
			setError(err?.message || "Failed to submit assignment");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
						<ClipboardList className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Assigned Worksheets</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Complete homework, practice assignments, and assessments published by your subject teachers.
						</p>
					</div>
				</div>
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
					<span>{successMsg}</span>
				</div>
			)}

			{selectedAssignment ? (
				// Assignment Question Answering Pane
				<div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
					<div className="flex items-center justify-between border-b border-slate-100 pb-4">
						<div>
							<button
								onClick={() => setSelectedAssignment(null)}
								className="text-xs text-indigo-600 font-bold hover:underline mb-1 flex items-center gap-1"
							>
								← Back to All Assignments
							</button>
							<h2 className="text-lg font-black text-slate-900">{selectedAssignment.title}</h2>
							<p className="text-xs text-slate-500 mt-0.5">
								Due Date: <strong>{selectedAssignment.dueDate}</strong> • Total Marks:{" "}
								<strong>{selectedAssignment.totalMarks}</strong>
							</p>
						</div>

						<span
							className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
								selectedAssignment.submissionStatus === "graded"
									? "bg-emerald-100 text-emerald-800"
									: selectedAssignment.submissionStatus === "submitted"
									? "bg-blue-100 text-blue-800"
									: "bg-amber-100 text-amber-800"
							}`}
						>
							{selectedAssignment.submissionStatus}
						</span>
					</div>

					{/* Feedback Banner if Graded */}
					{selectedAssignment.submissionStatus === "graded" && (
						<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
							<p className="font-bold text-sm">
								Awarded Score: {selectedAssignment.totalScore}/{selectedAssignment.maxScore} (
								{selectedAssignment.percentage}%)
							</p>
							{selectedAssignment.teacherFeedback && (
								<p className="text-slate-700">
									<strong>Teacher Feedback:</strong> {selectedAssignment.teacherFeedback}
								</p>
							)}
						</div>
					)}

					{/* Questions List */}
					<div className="space-y-6">
						{worksheetDetails?.questions?.map((q: any) => {
							const isGraded = selectedAssignment.submissionStatus === "graded";
							return (
								<div key={q.questionNumber} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-2">
											<span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
												{q.questionNumber}
											</span>
											<div className="text-xs sm:text-sm font-semibold text-slate-900">
												<MathMarkdown content={q.questionText} />
											</div>
										</div>
										<span className="text-xs font-bold text-slate-500">[{q.marks || 2} Marks]</span>
									</div>

									{/* MCQ or Written Answer Input */}
									{q.options && q.options.length > 0 ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-1">
											{q.options.map((opt: string, optIdx: number) => {
												const isChecked = answers[q.questionNumber] === opt;
												return (
													<button
														key={optIdx}
														type="button"
														disabled={isGraded}
														onClick={() => setAnswers((prev) => ({ ...prev, [q.questionNumber]: opt }))}
														className={`p-3 rounded-xl border text-xs text-left font-medium transition flex items-center justify-between ${
															isChecked
																? "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20"
																: "border-slate-200 bg-white hover:bg-slate-100 text-slate-800"
														}`}
													>
														<span>{opt}</span>
														{isChecked && <Check className="w-3.5 h-3.5 text-indigo-600" />}
													</button>
												);
											})}
										</div>
									) : (
										<div className="pl-8 pt-1">
											<textarea
												rows={3}
												disabled={isGraded}
												value={answers[q.questionNumber] || ""}
												onChange={(e) =>
													setAnswers((prev) => ({ ...prev, [q.questionNumber]: e.target.value }))
												}
												placeholder="Type your worked explanation or answer here..."
												className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
											/>
										</div>
									)}

									{/* Solution Preview if Released */}
									{isGraded && q.detailedSolution && (
										<div className="pl-8 pt-2 mt-2 border-t border-slate-200 text-xs text-slate-700">
											<strong className="text-emerald-700">Solution Reference:</strong>
											<MathMarkdown content={q.detailedSolution} className="mt-1" />
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Submission Footer Controls */}
					{selectedAssignment.submissionStatus !== "graded" && (
						<div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
							<button
								type="button"
								disabled={submitting}
								onClick={() => handleSubmitAssignment(true)}
								className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center gap-1.5"
							>
								<Save className="w-3.5 h-3.5" />
								<span>Save Draft</span>
							</button>
							<button
								type="button"
								disabled={submitting}
								onClick={() => handleSubmitAssignment(false)}
								className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
							>
								<Send className="w-3.5 h-3.5" />
								<span>{submitting ? "Submitting..." : "Submit Assignment"}</span>
							</button>
						</div>
					)}
				</div>
			) : (
				// Assignments List Overview
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{assignments.length === 0 ? (
						<div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
							<ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2" />
							<p className="font-semibold text-slate-600">No Assignments Found</p>
							<p className="mt-1">Worksheets assigned by your teachers will appear here.</p>
						</div>
					) : (
						assignments.map((asgn) => {
							const isPastDue = new Date(asgn.dueDate) < new Date();
							return (
								<div
									key={asgn.id}
									className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between space-y-4"
								>
									<div>
										<div className="flex items-center justify-between gap-2 mb-2">
											<span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
												{asgn.batchName}
											</span>
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
													asgn.submissionStatus === "graded"
														? "bg-emerald-100 text-emerald-800"
														: asgn.submissionStatus === "submitted"
														? "bg-blue-100 text-blue-800"
														: "bg-amber-100 text-amber-800"
												}`}
											>
												{asgn.submissionStatus}
											</span>
										</div>

										<h3 className="text-sm font-bold text-slate-900">{asgn.title}</h3>
										<p className="text-xs text-slate-500 mt-1 line-clamp-2">
											{asgn.instructions || "Complete all exercises."}
										</p>

										<div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
											<div className="flex items-center gap-1.5 font-medium">
												<Calendar className="w-3.5 h-3.5 text-slate-400" />
												<span>Due: {asgn.dueDate}</span>
											</div>
											<span className="font-bold text-slate-800">{asgn.totalMarks || 25} Marks</span>
										</div>
									</div>

									<button
										onClick={() => handleOpenAssignment(asgn)}
										className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
									>
										<span>{asgn.submissionStatus === "pending" ? "Start Assignment" : "View Submission"}</span>
										<ArrowRight className="w-3.5 h-3.5" />
									</button>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

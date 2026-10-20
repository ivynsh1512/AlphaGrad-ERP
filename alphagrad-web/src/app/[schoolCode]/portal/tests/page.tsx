"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	CheckCircle,
	Clock,
	Award,
	AlertCircle,
	ArrowRight,
	RotateCcw,
	HelpCircle,
	ChevronRight,
	Sparkles,
	BookOpen,
	FileText,
	Check,
	X,
	Lock,
	Play,
} from "lucide-react";

export default function StudentTestsPage() {
	const { user } = useAuth();
	const [testList, setTestList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Active Test Attempt State
	const [activeTest, setActiveTest] = useState<any | null>(null);
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
	const [submitting, setSubmitting] = useState(false);
	const [testResult, setTestResult] = useState<any | null>(null);

	// Load tests on mount
	useEffect(() => {
		loadTests();
	}, []);

	const loadTests = async () => {
		setLoading(true);
		try {
			const res = await api.tests.list();
			setTestList(res.tests || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load test series");
		} finally {
			setLoading(false);
		}
	};

	// Timer Countdown
	useEffect(() => {
		if (!activeTest || !attemptId || testResult) return;

		const timer = setInterval(() => {
			setTimeLeftSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					handleSubmitTest();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [activeTest, attemptId, testResult]);

	const handleStartTest = async (testId: string) => {
		setError(null);
		setLoading(true);
		try {
			const [detailsRes, startRes] = await Promise.all([
				api.tests.get(testId),
				api.tests.start(testId),
			]);

			setActiveTest(detailsRes.test);
			setAttemptId(startRes.attemptId);
			setAnswers(startRes.savedAnswers || {});
			setCurrentQuestionIndex(0);
			setTestResult(null);

			const totalDurationSecs = (detailsRes.test.durationMinutes || 45) * 60;
			const elapsed = Math.floor(Date.now() / 1000) - startRes.startTime;
			const remaining = Math.max(10, totalDurationSecs - elapsed);
			setTimeLeftSeconds(remaining);
		} catch (err: any) {
			setError(err?.message || "Could not launch test. Please verify entitlement.");
		} finally {
			setLoading(false);
		}
	};

	const handleSelectOption = (questionId: string, optionText: string) => {
		const newAnswers = { ...answers, [questionId]: optionText };
		setAnswers(newAnswers);

		// Autosave in background
		if (attemptId) {
			api.tests.saveProgress(attemptId, newAnswers).catch(() => {});
		}
	};

	const handleSubmitTest = async () => {
		if (!attemptId || submitting) return;
		setSubmitting(true);
		try {
			const res = await api.tests.submit(attemptId, {
				answers,
				durationSeconds: activeTest ? activeTest.durationMinutes * 60 - timeLeftSeconds : 0,
			});
			setTestResult(res.result);
			loadTests(); // Refresh attempt status in list
		} catch (err: any) {
			alert(err?.message || "Failed to submit test");
		} finally {
			setSubmitting(false);
		}
	};

	const handleExitTest = () => {
		setActiveTest(null);
		setAttemptId(null);
		setTestResult(null);
		setAnswers({});
	};

	// Format time remaining
	const formatTime = (secs: number) => {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	if (loading && !activeTest) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
				<div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
				<p className="text-xs font-semibold text-slate-600">Loading Tests & Practice Hub...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			{/* Top Header */}
			{!activeTest && (
				<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
					<div className="flex items-center space-x-3.5">
						<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
							<CheckCircle className="w-6 h-6 text-indigo-600" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Tests & Practice Series</h1>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
									Standardized Assessment
								</span>
							</div>
							<p className="text-xs text-slate-500 mt-0.5">
								Interactive, timed examination series with instantaneous auto-grading, topic breakdown, and worked solutions.
							</p>
						</div>
					</div>
				</div>
			)}

			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{/* ===================== VIEW 1: TEST TAKING / RESULTS SCREEN ===================== */}
			{activeTest ? (
				testResult ? (
					// ===================== TEST RESULT REVIEW SCREEN =====================
					<div className="space-y-6 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
						{/* Score Header Banner */}
						<div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
							<div>
								<span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
									Assessment Completed
								</span>
								<h2 className="text-xl sm:text-2xl font-black mt-2">{activeTest.title}</h2>
								<p className="text-xs text-slate-300 mt-1">
									Subject: {activeTest.subjectName} • Exam Difficulty: {activeTest.difficulty || "Medium"}
								</p>
							</div>

							<div className="text-center sm:text-right bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
								<p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Score</p>
								<p className="text-3xl sm:text-4xl font-black text-white mt-0.5">
									{testResult.score} <span className="text-base text-slate-300">/ {testResult.maxMarks}</span>
								</p>
								<div className="mt-2 flex items-center justify-center sm:justify-end gap-2">
									<span
										className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
											testResult.isPassed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
										}`}
									>
										{testResult.isPassed ? "PASSED ✓" : "NEEDS REVISION"}
									</span>
									<span className="text-xs font-bold text-amber-300">{testResult.percentage}%</span>
								</div>
							</div>
						</div>

						{/* Stats Summary Cards */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
							<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
								<span className="text-[10px] font-bold text-slate-400 uppercase">Correct</span>
								<p className="text-lg font-black text-emerald-600 mt-0.5">{testResult.correctCount}</p>
							</div>
							<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
								<span className="text-[10px] font-bold text-slate-400 uppercase">Incorrect</span>
								<p className="text-lg font-black text-rose-600 mt-0.5">{testResult.incorrectCount}</p>
							</div>
							<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
								<span className="text-[10px] font-bold text-slate-400 uppercase">Unattempted</span>
								<p className="text-lg font-black text-slate-600 mt-0.5">{testResult.unattemptedCount}</p>
							</div>
							<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
								<span className="text-[10px] font-bold text-slate-400 uppercase">Passing Score</span>
								<p className="text-lg font-black text-slate-800 mt-0.5">{activeTest.passingMarks || 40}</p>
							</div>
						</div>

						{/* Topic-Wise Breakdown */}
						{testResult.topicBreakdown && Object.keys(testResult.topicBreakdown).length > 0 && (
							<div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
								<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
									<Award className="w-4 h-4 text-indigo-600" />
									<span>Topic-Wise Mastery Analysis</span>
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									{Object.entries(testResult.topicBreakdown).map(([topicName, stats]: any) => {
										const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
										return (
											<div key={topicName} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
												<div className="flex items-center justify-between mb-1.5 font-bold">
													<span className="text-slate-800">{topicName}</span>
													<span className={pct >= 60 ? "text-emerald-700 font-black" : "text-amber-700 font-black"}>
														{pct}% ({stats.correct}/{stats.total})
													</span>
												</div>
												<div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
													<div
														className={`h-full rounded-full ${pct >= 60 ? "bg-emerald-500" : "bg-amber-500"}`}
														style={{ width: `${pct}%` }}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Worked Step-by-Step Solutions Review */}
						<div className="space-y-4 pt-2">
							<h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
								Detailed Solutions & Explanations
							</h3>
							{testResult.detailedQuestions?.map((q: any, idx: number) => (
								<div
									key={idx}
									className={`p-4 rounded-xl border space-y-2.5 ${
										q.isCorrect
											? "border-emerald-200 bg-emerald-50/20"
											: q.status === "unattempted"
											? "border-slate-200 bg-slate-50/50"
											: "border-rose-200 bg-rose-50/20"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-2">
											<span
												className={`w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
													q.isCorrect ? "bg-emerald-600" : q.status === "unattempted" ? "bg-slate-400" : "bg-rose-600"
												}`}
											>
												{idx + 1}
											</span>
											<div className="text-xs sm:text-sm font-medium text-slate-900">
												<MathMarkdown content={q.questionText} />
											</div>
										</div>
										<span
											className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
												q.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
											}`}
										>
											{q.marksAwarded >= 0 ? `+${q.marksAwarded}` : q.marksAwarded} Marks
										</span>
									</div>

									{/* Choices with User Choice indicator */}
									{q.options && (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-1">
											{q.options.map((opt: string, optIdx: number) => {
												const isSelected = q.studentAnswer === opt;
												const isCorrect = q.correctAnswer === opt;
												let optClass = "border-slate-200 bg-white text-slate-700";
												if (isSelected && isCorrect) optClass = "border-emerald-500 bg-emerald-100 text-emerald-900 font-bold";
												else if (isSelected && !isCorrect) optClass = "border-rose-500 bg-rose-100 text-rose-900 font-bold";
												else if (isCorrect) optClass = "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";

												return (
													<div key={optIdx} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${optClass}`}>
														<span>{opt}</span>
														{isSelected && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
														{isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-rose-600" />}
													</div>
												);
											})}
										</div>
									)}

									{/* Worked Solution */}
									{q.explanation && (
										<div className="pl-8 pt-2 text-xs bg-white/80 p-3 rounded-lg border border-slate-200">
											<strong className="text-slate-800 block mb-1">Worked Explanation:</strong>
											<MathMarkdown content={q.explanation} />
										</div>
									)}
								</div>
							))}
						</div>

						{/* Bottom Back Button */}
						<div className="pt-4 border-t border-slate-200 flex items-center justify-between">
							<button
								onClick={handleExitTest}
								className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition"
							>
								Return to Test Series
							</button>
						</div>
					</div>
				) : (
					// ===================== INTERACTIVE TEST TAKING VIEW =====================
					<div className="space-y-4">
						{/* Top Test Sticky Bar */}
						<div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between sticky top-3 z-30 shadow-md">
							<div>
								<h2 className="text-sm font-bold truncate">{activeTest.title}</h2>
								<p className="text-[11px] text-slate-400">
									Question {currentQuestionIndex + 1} of {activeTest.questions?.length}
								</p>
							</div>

							<div className="flex items-center space-x-3">
								{/* Countdown Timer */}
								<div
									className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 ${
										timeLeftSeconds < 300
											? "bg-rose-500 text-white animate-pulse"
											: "bg-slate-800 text-emerald-400 border border-slate-700"
									}`}
								>
									<Clock className="w-3.5 h-3.5" />
									<span>{formatTime(timeLeftSeconds)}</span>
								</div>

								<button
									onClick={handleSubmitTest}
									disabled={submitting}
									className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
								>
									{submitting ? "Submitting..." : "Submit Test"}
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
							{/* Current Question Display */}
							<div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6 shadow-xs">
								{activeTest.questions?.[currentQuestionIndex] ? (
									(() => {
										const q = activeTest.questions[currentQuestionIndex];
										const qId = q.id || `q${q.questionNumber || currentQuestionIndex + 1}`;
										const selectedOpt = answers[qId];

										return (
											<div className="space-y-5">
												<div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
													<div className="flex items-start gap-2.5">
														<span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
															{currentQuestionIndex + 1}
														</span>
														<div className="text-sm font-semibold text-slate-900 leading-relaxed">
															<MathMarkdown content={q.questionText} />
														</div>
													</div>
													<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
														[{q.marks || 4} Marks]
													</span>
												</div>

												{/* Options List */}
												<div className="space-y-2.5 pl-9">
													{q.options?.map((opt: string, optIdx: number) => {
														const isChecked = selectedOpt === opt;
														return (
															<div
																key={optIdx}
																onClick={() => handleSelectOption(qId, opt)}
																className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition flex items-center justify-between ${
																	isChecked
																		? "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20"
																		: "border-slate-200 hover:bg-slate-50 text-slate-800"
																}`}
															>
																<span>{opt}</span>
																<div
																	className={`w-5 h-5 rounded-full border flex items-center justify-center ${
																		isChecked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
																	}`}
																>
																	{isChecked && <Check className="w-3 h-3" />}
																</div>
															</div>
														);
													})}
												</div>

												{/* Question Navigation Controls */}
												<div className="pt-6 border-t border-slate-100 flex items-center justify-between">
													<button
														disabled={currentQuestionIndex === 0}
														onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
														className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30"
													>
														Previous Question
													</button>

													<button
														onClick={() => {
															const newAns = { ...answers };
															delete newAns[qId];
															setAnswers(newAns);
														}}
														className="text-xs text-slate-400 hover:text-rose-600 transition"
													>
														Clear Choice
													</button>

													<button
														disabled={currentQuestionIndex === (activeTest.questions?.length || 1) - 1}
														onClick={() => setCurrentQuestionIndex((prev) => Math.min((activeTest.questions?.length || 1) - 1, prev + 1))}
														className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-30"
													>
														Next Question
													</button>
												</div>
											</div>
										);
									})()
								) : null}
							</div>

							{/* Right: Question Navigation Palette */}
							<div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
								<h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Question Palette</h3>
								<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
									{activeTest.questions?.map((q: any, idx: number) => {
										const qId = q.id || `q${q.questionNumber || idx + 1}`;
										const isAnswered = Boolean(answers[qId]);
										const isCurrent = idx === currentQuestionIndex;

										let btnClass = "bg-slate-100 text-slate-600 border-slate-200";
										if (isCurrent) btnClass = "bg-indigo-600 text-white font-black ring-2 ring-indigo-400";
										else if (isAnswered) btnClass = "bg-emerald-50 text-emerald-800 font-bold border-emerald-300";

										return (
											<button
												key={idx}
												onClick={() => setCurrentQuestionIndex(idx)}
												className={`h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center ${btnClass}`}
											>
												{idx + 1}
											</button>
										);
									})}
								</div>

								<div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500 font-medium">
									<div className="flex items-center gap-2">
										<span className="w-3 h-3 rounded-full bg-emerald-500" />
										<span>Answered ({Object.keys(answers).length})</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-3 h-3 rounded-full bg-slate-200" />
										<span>Unanswered ({(activeTest.questions?.length || 0) - Object.keys(answers).length})</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)
			) : (
				// ===================== VIEW 2: AVAILABLE TESTS BROWSER =====================
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{testList.length === 0 ? (
						<div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
							<CheckCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
							<p className="font-semibold text-slate-600">No Tests Available</p>
							<p className="mt-1">Tests published by your teachers will appear here.</p>
						</div>
					) : (
						testList.map((test) => {
							const hasAttempt = Boolean(test.latestAttempt);
							return (
								<div
									key={test.id}
									className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between space-y-4"
								>
									<div>
										<div className="flex items-center justify-between gap-2 mb-2">
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
												{test.difficulty?.toUpperCase() || "STANDARD"}
											</span>
											{test.isPaid ? (
												<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
													<Lock className="w-3 h-3" /> Premium
												</span>
											) : (
												<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
													Free
												</span>
											)}
										</div>

										<h3 className="text-sm font-bold text-slate-900 line-clamp-1">{test.title}</h3>
										<p className="text-xs text-slate-500 mt-1 line-clamp-2">{test.description || "Comprehensive syllabus test."}</p>

										<div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
											<div>
												<span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
												<p className="font-bold text-slate-800">{test.durationMinutes}m</p>
											</div>
											<div>
												<span className="text-[10px] font-bold text-slate-400 uppercase">Marks</span>
												<p className="font-bold text-slate-800">{test.totalMarks}</p>
											</div>
											<div>
												<span className="text-[10px] font-bold text-slate-400 uppercase">Passing</span>
												<p className="font-bold text-slate-800">{test.passingMarks || 40}</p>
											</div>
										</div>
									</div>

									<div className="pt-2">
										{hasAttempt && test.latestAttempt.status === "submitted" ? (
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold text-emerald-700">
													Last Score: {test.latestAttempt.score}/{test.totalMarks} ({test.latestAttempt.percentage}%)
												</span>
												<button
													onClick={() => handleStartTest(test.id)}
													className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
												>
													Re-take Test
												</button>
											</div>
										) : (
											<button
												onClick={() => handleStartTest(test.id)}
												className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
											>
												<Play className="w-4 h-4 fill-white" />
												<span>{hasAttempt ? "Resume Test" : "Start Test Now"}</span>
											</button>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

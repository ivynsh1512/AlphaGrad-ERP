"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
	Bot,
	Sparkles,
	Send,
	Plus,
	MessageSquare,
	Trash2,
	Copy,
	Check,
	ThumbsUp,
	ThumbsDown,
	AlertCircle,
	GraduationCap,
	BookOpen,
} from "lucide-react";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt?: number;
	tokensUsed?: number;
	isHelpful?: number;
}

interface ConversationItem {
	id: string;
	title: string;
	topic?: string;
	createdAt: number;
	updatedAt: number;
}

export default function StudentAiTutorPage() {
	const { user } = useAuth();
	const [academicProfile, setAcademicProfile] = useState<any>(null);
	const [selectedBoard, setSelectedBoard] = useState<"CBSE" | "ICSE" | "NIOS">("CBSE");
	const [previewGradeId, setPreviewGradeId] = useState<string>("");
	const [conversations, setConversations] = useState<ConversationItem[]>([]);
	const [activeConvId, setActiveConvId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputQuery, setInputQuery] = useState("");
	const [selectedSubjectId, setSelectedSubjectId] = useState("");
	const [topic, setTopic] = useState("");
	const [loading, setLoading] = useState(false);
	const [initialLoading, setInitialLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({});

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Load student profile & existing conversations on mount
	useEffect(() => {
		async function initTutor() {
			try {
				const [profRes, convsRes] = await Promise.all([
					api.ai.tutor.getProfile().catch(() => ({ profile: null })),
					api.ai.tutor.conversations().catch(() => ({ conversations: [] })),
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

					if (profRes.profile.availableClasses?.length > 0) {
						setPreviewGradeId(profRes.profile.availableClasses[0].id);
					}

					if (profRes.profile.enrolledSubjects?.length > 0) {
						setSelectedSubjectId(profRes.profile.enrolledSubjects[0].id);
					}
				}

				if (convsRes?.conversations) {
					setConversations(convsRes.conversations);
					if (convsRes.conversations.length > 0) {
						loadConversation(convsRes.conversations[0].id);
					}
				}
			} catch (err: any) {
				setError(err?.message || "Failed to initialize Proventus AI Tutor");
			} finally {
				setInitialLoading(false);
			}
		}

		initTutor();
	}, []);

	// Scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	const loadConversation = async (id: string) => {
		setActiveConvId(id);
		setError(null);
		try {
			const res = await api.ai.tutor.getConversation(id);
			setMessages(res.messages || []);
			if (res.conversation?.subjectId) {
				setSelectedSubjectId(res.conversation.subjectId);
			}
			if (res.conversation?.topic) {
				setTopic(res.conversation.topic);
			}
		} catch (err: any) {
			setError(err?.message || "Failed to load conversation history");
		}
	};

	const startNewChat = () => {
		setActiveConvId(null);
		setMessages([]);
		setError(null);
		setInputQuery("");
		if (textareaRef.current) textareaRef.current.focus();
	};

	const deleteConversation = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await api.ai.tutor.deleteConversation(id);
			setConversations((prev) => prev.filter((c) => c.id !== id));
			if (activeConvId === id) {
				startNewChat();
			}
		} catch (err: any) {
			alert(err?.message || "Could not delete conversation");
		}
	};

	const handleSendQuestion = async (promptOverride?: string) => {
		const query = (promptOverride || inputQuery).trim();
		if (!query || loading) return;

		setError(null);
		const tempUserMsgId = `temp-${Date.now()}`;
		const userMsg: Message = {
			id: tempUserMsgId,
			role: "user",
			content: query,
			createdAt: Math.floor(Date.now() / 1000),
		};

		setMessages((prev) => [...prev, userMsg]);
		if (!promptOverride) setInputQuery("");
		setLoading(true);

		try {
			const res = await api.ai.tutor.chat({
				conversationId: activeConvId || undefined,
				question: query,
				subjectId: selectedSubjectId || undefined,
				topic: topic || undefined,
				board: selectedBoard,
				gradeId: previewGradeId || undefined,
			});

			const assistantMsg: Message = {
				id: res.messageId,
				role: "assistant",
				content: res.response,
				tokensUsed: res.tokensUsed,
				createdAt: Math.floor(Date.now() / 1000),
			};

			setMessages((prev) => [...prev, assistantMsg]);

			if (!activeConvId && res.conversationId) {
				setActiveConvId(res.conversationId);
				const newConv: ConversationItem = {
					id: res.conversationId,
					title: query.slice(0, 40) + (query.length > 40 ? "..." : ""),
					topic,
					createdAt: Math.floor(Date.now() / 1000),
					updatedAt: Math.floor(Date.now() / 1000),
				};
				setConversations((prev) => [newConv, ...prev]);
			}
		} catch (err: any) {
			setError(err?.message || "Proventus AI Tutor encountered a network or quota error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const copyAnswer = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const recordFeedback = async (messageId: string, isHelpful: boolean) => {
		try {
			await api.ai.tutor.feedback(messageId, isHelpful);
			setFeedbackMap((prev) => ({ ...prev, [messageId]: isHelpful ? 1 : 0 }));
		} catch {}
	};

	if (initialLoading) {
		return (
			<div className="h-full flex flex-col items-center justify-center space-y-3">
				<div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
				<p className="text-xs font-semibold text-slate-600">Connecting to Proventus AI Tutor...</p>
			</div>
		);
	}

	const currentGradeDisplay =
		previewGradeId && academicProfile?.availableClasses
			? academicProfile.availableClasses.find((c: any) => c.id === previewGradeId)?.name
			: academicProfile?.className || "Grade 10";

	return (
		<div className="flex-1 min-h-0 flex flex-col gap-2.5 max-w-6xl mx-auto w-full h-full">
			{/* Sleek, Compact Academic Context Header Bar */}
			<div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
				<div className="flex items-center space-x-2.5">
					<div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-xs">
						<Bot className="w-4 h-4 text-white" />
					</div>
					<div>
						<div className="flex items-center gap-1.5">
							<h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">Proventus AI Tutor</h1>
							<span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
								24/7 Verified
							</span>
						</div>
					</div>
				</div>

				{/* Grade & Board Controls */}
				<div className="flex items-center gap-2 text-xs ml-auto">
					{academicProfile?.availableClasses?.length > 0 ? (
						<div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1">
							<GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
							<select
								value={previewGradeId}
								onChange={(e) => setPreviewGradeId(e.target.value)}
								className="bg-transparent text-indigo-900 font-bold text-xs focus:outline-none cursor-pointer"
							>
								{academicProfile.availableClasses.map((cl: any) => (
									<option key={cl.id} value={cl.id}>
										{cl.name}
									</option>
								))}
							</select>
						</div>
					) : (
						<div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1">
							<GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
							<span className="text-indigo-900 font-bold text-xs">{currentGradeDisplay}</span>
						</div>
					)}

					{/* Board Selector Pills */}
					<div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
						{(["CBSE", "ICSE", "NIOS"] as const).map((b) => {
							const isActive = selectedBoard === b;
							return (
								<button
									key={b}
									type="button"
									onClick={() => setSelectedBoard(b)}
									className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition ${
										isActive
											? b === "CBSE"
												? "bg-indigo-600 text-white shadow-xs"
												: b === "ICSE"
												? "bg-teal-600 text-white shadow-xs"
												: "bg-amber-600 text-white shadow-xs"
											: "text-slate-600 hover:text-slate-900"
									}`}
								>
									{b}
								</button>
							);
						})}
					</div>

					{/* New Chat Button (Visible on mobile/header) */}
					<button
						onClick={startNewChat}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition shrink-0"
						title="Start New Doubt"
					>
						<Plus className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">New Doubt</span>
					</button>
				</div>
			</div>

			{/* Main Chat Workspace */}
			<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-3">
				{/* Left Sidebar: Recent Sessions (Desktop only) */}
				<aside className="hidden lg:flex lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-3.5 flex-col min-h-0 shadow-xs">
					<div className="flex flex-col h-full min-h-0">
						{/* New Doubt Button */}
						<button
							onClick={startNewChat}
							className="w-full flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition mb-2.5 shrink-0"
						>
							<Plus className="w-4 h-4" />
							<span>Start New Doubt</span>
						</button>

						{/* Subject Filter */}
						<div className="mb-2.5 shrink-0">
							<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
								Target Subject
							</label>
							<select
								value={selectedSubjectId}
								onChange={(e) => setSelectedSubjectId(e.target.value)}
								className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							>
								<option value="">All Subjects</option>
								{academicProfile?.enrolledSubjects?.map((sub: any) => (
									<option key={sub.id} value={sub.id}>
										{sub.name} ({sub.code})
									</option>
								))}
							</select>
						</div>

						{/* Recent Sessions List */}
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 py-1 shrink-0">
							Recent Sessions
						</p>
						<div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
							{conversations.length === 0 ? (
								<p className="text-xs text-slate-400 italic px-2 py-3">No previous sessions yet.</p>
							) : (
								conversations.map((c) => {
									const isActive = activeConvId === c.id;
									return (
										<div
											key={c.id}
											onClick={() => loadConversation(c.id)}
											className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition text-xs ${
												isActive
													? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold"
													: "hover:bg-slate-100 text-slate-700 font-medium"
											}`}
										>
											<div className="flex items-center space-x-2 truncate min-w-0">
												<MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
												<span className="truncate">{c.title || "Academic Question"}</span>
											</div>
											<button
												onClick={(e) => deleteConversation(c.id, e)}
												className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
												title="Delete"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										</div>
									);
								})
							)}
						</div>
					</div>
				</aside>

				{/* Right: Active Chat Conversation Box */}
				<main className="col-span-1 lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 flex flex-col min-h-0 overflow-hidden shadow-xs">
					{/* Conversation Stream (scrolls independently) */}
					<div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
						{messages.length === 0 ? (
							/* Clean, Minimalist Welcome State (No Sample Questions or FAQ Blocks) */
							<div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8 px-4">
								<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
									<Sparkles className="w-6 h-6 text-indigo-600" />
								</div>
								<h2 className="text-base sm:text-lg font-bold text-slate-900">How can I assist your study today?</h2>
								<p className="text-xs text-slate-500 mt-1 mb-3.5 leading-relaxed">
									Ask any question in Math, Physics, Chemistry, Biology, or your syllabus. I will provide a step-by-step verified explanation.
								</p>
								<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
									<span>Curriculum:</span>
									<strong className="text-indigo-700">{currentGradeDisplay}</strong>
									<span>·</span>
									<strong className="text-amber-700">{selectedBoard} Board</strong>
								</div>
							</div>
						) : (
							messages.map((m) => {
								const isAssistant = m.role === "assistant";
								return (
									<div key={m.id} className={`flex items-start gap-2.5 ${isAssistant ? "" : "flex-row-reverse"}`}>
										<div
											className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold ${
												isAssistant
													? "bg-indigo-600 text-white shadow-2xs"
													: "bg-slate-200 text-slate-800"
											}`}
										>
											{isAssistant ? <Bot className="w-3.5 h-3.5" /> : user?.fullName?.slice(0, 2).toUpperCase() || "ME"}
										</div>

										<div
											className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 shadow-2xs text-xs sm:text-sm ${
												isAssistant
													? "bg-slate-50 border border-slate-200/80 text-slate-800"
													: "bg-indigo-600 text-white font-medium"
											}`}
										>
											{isAssistant ? (
												<div>
													<MathMarkdown content={m.content} />

													{/* Actions toolbar */}
													<div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
														<button
															onClick={() => copyAnswer(m.content, m.id)}
															className="hover:text-indigo-600 flex items-center gap-1 transition px-2 py-0.5 rounded hover:bg-slate-200/60"
														>
															{copiedId === m.id ? (
																<Check className="w-3.5 h-3.5 text-emerald-600" />
															) : (
																<Copy className="w-3.5 h-3.5" />
															)}
															<span>{copiedId === m.id ? "Copied" : "Copy Solution"}</span>
														</button>

														<div className="flex items-center space-x-1.5">
															<span className="text-[10px] text-slate-400 mr-0.5">Helpful?</span>
															<button
																onClick={() => recordFeedback(m.id, true)}
																className={`p-1 rounded hover:bg-slate-200/60 transition ${
																	feedbackMap[m.id] === 1 ? "text-emerald-600 font-bold" : "text-slate-400"
																}`}
																title="Helpful"
															>
																<ThumbsUp className="w-3 h-3" />
															</button>
															<button
																onClick={() => recordFeedback(m.id, false)}
																className={`p-1 rounded hover:bg-slate-200/60 transition ${
																	feedbackMap[m.id] === 0 ? "text-rose-600 font-bold" : "text-slate-400"
																}`}
																title="Not Helpful"
															>
																<ThumbsDown className="w-3 h-3" />
															</button>
														</div>
													</div>
												</div>
											) : (
												<p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
											)}
										</div>
									</div>
								);
							})
						)}

						{/* Loading Indicator */}
						{loading && (
							<div className="flex items-start gap-2.5">
								<div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
									<Bot className="w-3.5 h-3.5 animate-spin" />
								</div>
								<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 flex items-center gap-2">
									<span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
									<span className="font-semibold">Formulating your step-by-step solution...</span>
								</div>
							</div>
						)}

						{/* Error Banner */}
						{error && (
							<div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
								<div className="flex items-center gap-2">
									<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
									<span>{error}</span>
								</div>
								<button
									onClick={() => handleSendQuestion()}
									className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition"
								>
									Retry
								</button>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Input Composer (Pinned to bottom, zero unnecessary scroll) */}
					<div className="shrink-0 p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200/90">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleSendQuestion();
							}}
							className="flex flex-col gap-1.5"
						>
							<div className="relative flex items-center">
								<textarea
									ref={textareaRef}
									value={inputQuery}
									onChange={(e) => setInputQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSendQuestion();
										}
									}}
									placeholder="Ask your academic doubt or equation here... (Supports LaTeX)"
									rows={2}
									className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none pr-11 shadow-2xs"
								/>
								<button
									type="submit"
									disabled={loading || !inputQuery.trim()}
									className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-2xs transition"
									title="Send Question"
								>
									<Send className="w-3.5 h-3.5" />
								</button>
							</div>

							<div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 px-1">
								<span className="hidden sm:inline">Enter to send · Shift+Enter for new line · Supports math formulas ($...$ or \(...\))</span>
								<span className="sm:hidden">Supports LaTeX formulas</span>
								<span className="font-medium text-slate-600">
									{currentGradeDisplay} · {selectedBoard}
								</span>
							</div>
						</form>
					</div>
				</main>
			</div>
		</div>
	);
}

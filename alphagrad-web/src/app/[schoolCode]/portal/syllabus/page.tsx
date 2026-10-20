"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Hourglass,
  Layers,
  Sparkles,
  Calendar,
  Filter,
  BarChart2,
  BookCheck,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";

interface Chapter {
  id: string;
  batchId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  chapterNumber: string;
  chapterTitle: string;
  status: "pending" | "in_progress" | "completed";
  progressPercentage: number;
  targetCompletionDate: string | null;
  completedAt: number | null;
  notes: string | null;
}

interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentage: number;
  chapters: Chapter[];
}

export default function StudentSyllabusPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overallPercentage: number;
  } | null>(null);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function loadSyllabus() {
      if (!user?.studentId) return;
      try {
        setLoading(true);
        const res = await api.syllabus.student(user.studentId);
        setSubjects(res.subjects || []);
        setAllChapters(res.chapters || []);
        setSummary(res.summary || null);
      } catch (err) {
        console.error("Failed to load syllabus tracker:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSyllabus();
  }, [user?.studentId]);

  // Filter chapters
  const filteredChapters = allChapters.filter((ch) => {
    const matchesSubject = selectedSubject === "all" || ch.subjectId === selectedSubject;
    const matchesStatus = statusFilter === "all" || ch.status === statusFilter;
    return matchesSubject && matchesStatus;
  });

  // Pastel accent styles for subjects
  const getSubjectColorStyle = (code: string) => {
    const cleanCode = (code || "").toUpperCase();
    if (cleanCode.includes("PHY")) {
      return {
        bg: "bg-indigo-50/80",
        border: "border-indigo-200",
        badge: "bg-indigo-600 text-white",
        text: "text-indigo-900",
        bar: "bg-indigo-600",
      };
    }
    if (cleanCode.includes("CHE")) {
      return {
        bg: "bg-emerald-50/80",
        border: "border-emerald-200",
        badge: "bg-emerald-600 text-white",
        text: "text-emerald-900",
        bar: "bg-emerald-600",
      };
    }
    if (cleanCode.includes("MAT")) {
      return {
        bg: "bg-amber-50/80",
        border: "border-amber-200",
        badge: "bg-amber-600 text-white",
        text: "text-amber-900",
        bar: "bg-amber-600",
      };
    }
    if (cleanCode.includes("BIO")) {
      return {
        bg: "bg-rose-50/80",
        border: "border-rose-200",
        badge: "bg-rose-600 text-white",
        text: "text-rose-900",
        bar: "bg-rose-600",
      };
    }
    if (cleanCode.includes("FRE")) {
      return {
        bg: "bg-purple-50/80",
        border: "border-purple-200",
        badge: "bg-purple-600 text-white",
        text: "text-purple-900",
        bar: "bg-purple-600",
      };
    }
    if (cleanCode.includes("SAN")) {
      return {
        bg: "bg-orange-50/80",
        border: "border-orange-200",
        badge: "bg-orange-600 text-white",
        text: "text-orange-900",
        bar: "bg-orange-600",
      };
    }
    return {
      bg: "bg-sky-50/80",
      border: "border-sky-200",
      badge: "bg-sky-600 text-white",
      text: "text-sky-900",
      bar: "bg-sky-600",
    };
  };

  const getStatusBadge = (status: string, percentage: number) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed (100%)</span>
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-xs animate-pulse">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>In Progress ({percentage || 50}%)</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
            <span>Not Yet Started</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Academic Curriculum
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Session 2026–2027</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Portion & Syllabus Completion</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time track of chapter progress, covered topics, and upcoming units across enrolled subjects.
          </p>
        </div>

        {/* Global Progress Badge */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center space-x-4 shrink-0">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-600"
                strokeDasharray={`${summary?.overallPercentage || 0}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900">{summary?.overallPercentage || 0}%</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Syllabus</p>
            <p className="text-base font-black text-slate-900">
              {summary?.completed || 0} of {summary?.total || 0} Done
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> On Track for Exams
            </p>
          </div>
        </div>
      </div>

      {/* Colorful Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Chapters Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Chapters</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-950 mt-2">{summary?.total || 0}</p>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">Across all enrolled subjects</p>
        </div>

        {/* Completed Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-2">{summary?.completed || 0}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Full topics covered</p>
        </div>

        {/* In Progress Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</span>
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-950 mt-2">{summary?.inProgress || 0}</p>
          <p className="text-[11px] text-blue-600 font-medium mt-1">Currently being taught</p>
        </div>

        {/* Pending Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-950 mt-2">{summary?.pending || 0}</p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Upcoming in schedule</p>
        </div>
      </div>

      {/* Subject Cards Overview (like Image 1 & 2) */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <BookCheck className="w-4 h-4 text-indigo-600" />
          <span>Subject Progress Cards</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map((sub) => {
            const style = getSubjectColorStyle(sub.subjectCode);
            const isSelected = selectedSubject === sub.subjectId;

            return (
              <button
                key={sub.subjectId}
                onClick={() => setSelectedSubject(isSelected ? "all" : sub.subjectId)}
                className={`text-left p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? "ring-2 ring-indigo-600 bg-white border-indigo-300"
                    : `${style.bg} ${style.border} hover:bg-white`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${style.badge}`}>
                      {sub.subjectCode}
                    </span>
                    <span className="text-xs font-black text-slate-800">{sub.percentage}%</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-2">{sub.subjectName}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sub.completed} of {sub.total} Chapters Completed
                  </p>
                </div>

                <div className="mt-3">
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${style.bar}`}
                      style={{ width: `${sub.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-1.5">
                    <span>{sub.inProgress} In Progress</span>
                    <span>{sub.pending} Not Started</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter Breakdown with Eye-Catchy Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-5">
        {/* Colorful Tab Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Curriculum Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Filter chapters by status or select a specific subject above.</p>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Chapters ({allChapters.length})
            </button>

            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({summary?.completed || 0})</span>
            </button>

            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "in_progress"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>In Progress ({summary?.inProgress || 0})</span>
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Not Yet Started ({summary?.pending || 0})</span>
            </button>
          </div>
        </div>

        {/* Chapters List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No chapters found</p>
            <p className="text-xs text-slate-500 mt-1">Try changing the status or subject filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChapters.map((chapter) => {
              const style = getSubjectColorStyle(chapter.subjectCode);

              return (
                <div
                  key={chapter.id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${style.badge}`}
                    >
                      {chapter.subjectCode}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-black text-indigo-700 tracking-wide uppercase">
                          {chapter.chapterNumber}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-bold text-slate-600">{chapter.subjectName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">{chapter.chapterTitle}</h4>
                      {chapter.notes && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{chapter.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress & Status Pill */}
                  <div className="flex items-center space-x-4 shrink-0">
                    {chapter.targetCompletionDate && (
                      <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: {chapter.targetCompletionDate}</span>
                      </div>
                    )}

                    <div className="flex flex-col items-end space-y-1.5">
                      {getStatusBadge(chapter.status, chapter.progressPercentage)}
                      <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            chapter.status === "completed"
                              ? "bg-emerald-500"
                              : chapter.status === "in_progress"
                              ? "bg-blue-500"
                              : "bg-slate-300"
                          }`}
                          style={{
                            width: `${
                              chapter.status === "completed"
                                ? 100
                                : chapter.status === "in_progress"
                                ? chapter.progressPercentage || 50
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

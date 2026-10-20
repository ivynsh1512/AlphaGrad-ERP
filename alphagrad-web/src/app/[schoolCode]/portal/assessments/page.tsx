"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Award,
  BarChart2,
  Calendar,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
  Trophy,
  Star,
  Layers,
  ChevronRight,
  GraduationCap
} from "lucide-react";

interface AssessmentItem {
  id: string;
  title: string;
  month: string;
  assessmentDate: string;
  maxMarks: number;
  passingMarks: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  marksObtained: number | null;
  grade: string | null;
  rank: number | null;
  remarks: string | null;
}

export default function StudentAssessmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [summary, setSummary] = useState<{
    totalTaken: number;
    totalAvailable: number;
    averagePercentage: number;
    highestPercentage: number;
    overallGrade: string;
  } | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    async function loadAssessments() {
      if (!user?.studentId) return;
      try {
        setLoading(true);
        const res = await api.assessments.student(user.studentId);
        setAssessments(res.assessments || []);
        setSummary(res.summary || null);
      } catch (err) {
        console.error("Failed to load assessments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, [user?.studentId]);

  // Unique months for filter tabs
  const months = Array.from(new Set(assessments.map((a) => a.month).filter(Boolean)));

  const filtered = assessments.filter((a) => {
    if (selectedMonth === "all") return true;
    return a.month === selectedMonth;
  });

  const getGradeStyle = (grade: string | null) => {
    const clean = (grade || "N/A").toUpperCase();
    if (clean === "A+" || clean === "A") {
      return {
        pill: "bg-emerald-100 text-emerald-800 border-emerald-300",
        badge: "bg-emerald-600 text-white",
      };
    }
    if (clean === "B+" || clean === "B") {
      return {
        pill: "bg-blue-100 text-blue-800 border-blue-300",
        badge: "bg-blue-600 text-white",
      };
    }
    if (clean === "C") {
      return {
        pill: "bg-amber-100 text-amber-800 border-amber-300",
        badge: "bg-amber-600 text-white",
      };
    }
    return {
      pill: "bg-slate-100 text-slate-800 border-slate-300",
      badge: "bg-slate-600 text-white",
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Academic Assessment
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Continuous Evaluation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Monthly Assessments & Grades</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official monthly performance reports, unit tests, and comprehensive grade metrics.
          </p>
        </div>

        {/* Grade Badge */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center space-x-3 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-black text-xl shadow-xs">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cumulative GPA</p>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-slate-900">{summary?.overallGrade || "A+"}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {summary?.averagePercentage || 0}% Avg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards (Inspired by Image 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Average Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Score</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{summary?.averagePercentage || 0}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${summary?.averagePercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Card 2: Highest Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Score</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{summary?.highestPercentage || 0}%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Highest scored unit test</p>
        </div>

        {/* Card 3: Total Tests Taken */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tests Taken</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {summary?.totalTaken || 0} <span className="text-xs font-semibold text-slate-400">/ {summary?.totalAvailable || 0}</span>
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Evaluated by faculty</p>
        </div>

        {/* Card 4: Academic Standing */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Standing</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">Excellent</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Top Tier Batch Rank</p>
        </div>
      </div>

      {/* Visual Performance Bar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Assessment Score Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">Visual score progression across monthly unit tests.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">Target: 90%+</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {assessments.slice(0, 4).map((test) => {
            const pct =
              test.marksObtained !== null && test.maxMarks > 0
                ? Math.round((test.marksObtained / test.maxMarks) * 100)
                : 0;

            return (
              <div
                key={test.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 text-indigo-700">
                    {test.subjectCode}
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1.5 truncate">{test.title}</p>
                  <p className="text-[10px] text-slate-400">{test.month}</p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base font-black text-slate-900">
                      {test.marksObtained !== null ? `${test.marksObtained}` : "Pending"}
                    </span>
                    <span className="text-xs text-slate-400">/ {test.maxMarks}</span>
                  </div>

                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-indigo-600" : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs & Detailed Assessment Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Monthly Test History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Filter by month or review detailed faculty feedback.</p>
          </div>

          {/* Month Filter Tabs */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setSelectedMonth("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedMonth === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Months ({assessments.length})
            </button>

            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedMonth === m
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* List of Assessments */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No assessments found</p>
            <p className="text-xs text-slate-500 mt-1">Tests scheduled by teachers will show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const gradeStyle = getGradeStyle(item.grade);
              const percentage =
                item.marksObtained !== null && item.maxMarks > 0
                  ? Math.round((item.marksObtained / item.maxMarks) * 100)
                  : null;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                      {item.subjectCode || "SUB"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-bold text-indigo-700">{item.subjectName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">{item.month}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">{item.title}</h4>

                      {item.remarks && (
                        <p className="text-xs text-slate-600 mt-1.5 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/60 leading-relaxed">
                          <strong>Faculty Feedback:</strong> {item.remarks}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Marks & Grade Pill */}
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400">Score</p>
                      {item.marksObtained !== null ? (
                        <p className="text-base font-black text-slate-900">
                          {item.marksObtained} <span className="text-xs text-slate-400 font-bold">/ {item.maxMarks}</span>
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-amber-600">Pending Evaluation</p>
                      )}
                    </div>

                    {item.grade && (
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-black border shadow-xs ${gradeStyle.pill}`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Grade {item.grade}</span>
                      </span>
                    )}
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

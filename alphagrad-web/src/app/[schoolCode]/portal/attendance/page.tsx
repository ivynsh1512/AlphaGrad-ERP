"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Calendar as CalendarIcon,
  Filter,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  List,
  Flame,
  Award
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string | null;
  sessionDate: string;
  batchId: string;
}

interface AttendanceSummary {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const studentId = user?.studentId;
        if (!studentId) return;

        const res = await api.attendance.studentSummary(studentId);
        setSummary(res.summary);
        setRecords(res.records || []);
      } catch (err: any) {
        console.error("Failed to load attendance records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user]);

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Present</span>
          </span>
        );
      case "absent":
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Absent</span>
          </span>
        );
    }
  };

  // Calendar grouping helper
  const dateMap: Record<string, AttendanceRecord[]> = {};
  for (const r of records) {
    if (!dateMap[r.sessionDate]) dateMap[r.sessionDate] = [];
    dateMap[r.sessionDate].push(r);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Attendance Records
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Biometric & Faculty Log</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Session Attendance & Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of lecture presence, punctuality, and cumulative percentage required for exam eligibility.
          </p>
        </div>

        {/* Global Attendance Gauge Badge */}
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
                className={
                  (summary?.attendancePercentage ?? 0) >= 75
                    ? "text-emerald-500"
                    : (summary?.attendancePercentage ?? 0) >= 50
                    ? "text-amber-500"
                    : "text-rose-500"
                }
                strokeDasharray={`${summary?.attendancePercentage ?? 0}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900">
              {(summary?.totalSessions || 0) > 0 ? `${summary?.attendancePercentage ?? 0}%` : "0%"}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Attendance</p>
            <p className="text-base font-black text-slate-900">
              {(summary?.attendancePercentage ?? 0) >= 75 ? "Exam Eligible ✓" : "Needs Punctuality"}
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Minimum 75% required</p>
          </div>
        </div>
      </div>

      {/* Eye-Catchy Responsive Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Present Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl p-5 border border-emerald-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Present</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-2">{summary?.present ?? 0}</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Sessions attended</p>
        </div>

        {/* Absent Card */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 rounded-2xl p-5 border border-rose-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Absent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-950 mt-2">{summary?.absent ?? 0}</p>
          <p className="text-xs text-rose-700 font-medium mt-1">Missed sessions</p>
        </div>
      </div>

      {/* Main Tabs & Log Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-4">
        {/* Colorful Tab Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Attendance Log & Calendar</h2>
            <p className="text-xs text-slate-500 mt-0.5">Switch views or filter records by presence status.</p>
          </div>

          <div className="flex items-center space-x-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === "calendar" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filter === "all" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({records.length})
              </button>

              <button
                onClick={() => setFilter("present")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                  filter === "present"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Present ({summary?.present ?? 0})</span>
              </button>

              <button
                onClick={() => setFilter("absent")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                  filter === "absent"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Absent ({summary?.absent ?? 0})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No attendance records matching filter</p>
            <p className="text-xs text-slate-500 mt-1">Your faculty marks attendance during scheduled class hours.</p>
          </div>
        ) : viewMode === "calendar" ? (
          /* Calendar Grid View (inspired by Image 1 & Image 4) */
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Object.keys(dateMap).map((dateStr) => {
                const dayRecords = dateMap[dateStr];
                const hasPresent = dayRecords.some((r) => r.status === "present");
                const hasAbsent = dayRecords.some((r) => r.status === "absent");
                const hasLate = dayRecords.some((r) => r.status === "late");

                return (
                  <div
                    key={dateStr}
                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition shadow-xs flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{dateStr}</span>
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {dayRecords.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 truncate max-w-[80px]">Lecture</span>
                          {getStatusBadge(rec.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition px-2 rounded-xl"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-slate-900">{item.sessionDate}</p>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.sessionDate).toLocaleDateString("en-US", { weekday: "long" })}
                    </span>
                  </div>
                  {item.remarks ? (
                    <p className="text-xs text-slate-500 mt-0.5">Faculty note: {item.remarks}</p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Regular lecture session</p>
                  )}
                </div>

                <div>{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

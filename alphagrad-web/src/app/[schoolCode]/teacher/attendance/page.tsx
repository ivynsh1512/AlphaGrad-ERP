"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Save,
  Users,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  UserCheck
} from "lucide-react";

interface Batch {
  id: string;
  name: string;
  code: string;
  className?: string;
}

interface StudentItem {
  studentId: string;
  admissionNumber: string;
  rollNumber: string | null;
  fullName: string;
  username: string;
}

type AttendanceStatus = "present" | "absent";

export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId") || "";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load available cohorts/batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        let assignedBatchIds: Set<string> | null = null;
        if (user?.teacherId) {
          try {
            const assignRes = await api.teachers.getAssignments(user.teacherId);
            if (assignRes.assignments?.length) {
              assignedBatchIds = new Set(assignRes.assignments.map((a: any) => a.batchId));
            }
          } catch (e) {
            console.warn("Could not load faculty assignments:", e);
          }
        }

        const batchesRes = await api.get<{ batches: Batch[] }>("/academic/batches");
        let list = batchesRes.batches || [];
        if (assignedBatchIds && assignedBatchIds.size > 0) {
          list = list.filter((b) => assignedBatchIds.has(b.id));
        }
        setBatches(list);

        if (list.length > 0) {
          if (!selectedBatchId || !list.some((b) => b.id === selectedBatchId)) {
            setSelectedBatchId(list[0].id);
          }
        } else {
          setSelectedBatchId("");
        }
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    };

    loadBatches();
  }, [user?.teacherId]);

  // When selectedBatchId changes, fetch students
  useEffect(() => {
    if (!selectedBatchId) return;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setStatusMessage(null);
        const res = await api.get<{ students: StudentItem[] }>(`/academic/batches/${selectedBatchId}/students`);
        const list = res.students || [];
        setStudents(list);

        // Default all students to "present" for fast one-tap roll call
        const initialRecordMap: Record<string, AttendanceStatus> = {};
        list.forEach((st) => {
          initialRecordMap[st.studentId] = "present";
        });
        setRecords(initialRecordMap);
      } catch (err: any) {
        setStatusMessage({ type: "error", text: err.message || "Failed to load students for this batch." });
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [selectedBatchId]);

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => {
      const next: Record<string, AttendanceStatus> = {};
      students.forEach((st) => {
        next[st.studentId] = status;
      });
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBatchId || students.length === 0) return;

    setSubmitting(true);
    setStatusMessage(null);

    const payload = {
      batchId: selectedBatchId,
      sessionDate,
      records: students.map((st) => ({
        studentId: st.studentId,
        status: records[st.studentId] || "present",
      })),
    };

    try {
      await api.post("/attendance/sessions", payload);
      setStatusMessage({
        type: "success",
        text: `✓ Attendance saved! ${presentCount} present, ${absentCount} absent for ${sessionDate}.`,
      });
      // Scroll to top to see confirmation
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save attendance." });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSessionDate(d.toISOString().split("T")[0]);
  };

  const totalCount = students.length;
  const presentCount = Object.values(records).filter((s) => s === "present").length;
  const absentCount = Object.values(records).filter((s) => s === "absent").length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            Daily Roll Call
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Attendance Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tap students to mark Present or Absent. Fast, simple, and mobile-friendly.
          </p>
        </div>

        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting || loading}
            className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Saving..." : "Save Attendance"}</span>
          </button>
        )}
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-sm"
              : "bg-rose-50 text-rose-900 border border-rose-300 shadow-sm"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Step 1 & 2: Batch and Date Selection Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Batch / Cohort
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker with Quick Toggles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Attendance Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(-1)}
                className="px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition hidden sm:inline-block"
              >
                Yesterday
              </button>
            </div>
          </div>
        </div>

        {/* Live Attendance Tally Bar */}
        {totalCount > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">
                  Total Students: <strong className="text-slate-900 font-extrabold">{totalCount}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {presentCount} Present
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  {absentCount} Absent
                </span>
              </div>

              {/* Quick Action Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAll("present")}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll("absent")}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Visual Attendance Ratio Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${attendanceRate}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${100 - attendanceRate}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-semibold">
              <span>{attendanceRate}% Present</span>
              <span>{100 - attendanceRate}% Absent</span>
            </div>
          </div>
        )}
      </div>

      {/* Student Roll Call List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading student roster...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Enrolled Students</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No students are currently enrolled in {currentBatch?.name || "this cohort"}. You can assign students from the Admin console.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((st, index) => {
              const status = records[st.studentId] || "present";
              const isPresent = status === "present";

              return (
                <div
                  key={st.studentId}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isPresent
                      ? "bg-white border-slate-200/90 hover:border-emerald-300 shadow-xs"
                      : "bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-xs"
                  }`}
                >
                  {/* Student Details */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                        isPresent
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {st.rollNumber || index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {st.fullName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                        <span>Adm: {st.admissionNumber}</span>
                        {st.username && <span>• @{st.username}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Large High-Contrast Present / Absent Toggle Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(st.studentId, "present")}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isPresent
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 scale-102"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentStatus(st.studentId, "absent")}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        !isPresent
                          ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 scale-102"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar for Mobile & Quick Save */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-white/95 border-t border-slate-200 shadow-xl backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {presentCount} of {totalCount} Marked Present
              </span>
              <span className="text-xs font-bold text-emerald-600">({attendanceRate}%)</span>
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={submitting || loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? "Saving Session..." : "Save Attendance"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

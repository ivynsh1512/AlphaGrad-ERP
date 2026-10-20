"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  CalendarCheck,
  CreditCard,
  BookOpen,
  MessageSquareQuote,
  Bell,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  GraduationCap
} from "lucide-react";

interface StudentProfile {
  id: string;
  admissionNumber: string;
  fullName: string;
  className: string | null;
  batchName: string | null;
  batchId: string | null;
}

interface AttendanceSummary {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

interface FeeSummary {
  totalFeesInRupees: number;
  totalPaidInRupees: number;
  outstandingBalanceInRupees: number;
}

interface HomeworkItem {
  id: string;
  title: string;
  dueDate: string;
  subjectName: string;
}

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  publishedAt: number;
}

interface RemarkItem {
  id: string;
  category: string;
  remarkText: string;
  facultyName: string;
  subjectName: string | null;
  createdAt: number;
}

export default function StudentPortalHomePage() {
  const { user, school } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const studentId = user?.studentId;

        // Fetch student profile if studentId is present
        if (studentId) {
          try {
            const stRes = await api.get<{ student: any }>(`/students/${studentId}`);
            if (stRes?.student) {
              setProfile({
                id: stRes.student.id,
                admissionNumber: stRes.student.admissionNumber,
                fullName: stRes.student.fullName,
                className: stRes.student.className,
                batchName: stRes.student.batchName,
                batchId: stRes.student.batchId,
              });

              // Fetch batch homework if student has a batch
              if (stRes.student.batchId) {
                const hwRes = await api.get<{ homework: HomeworkItem[] }>(`/homework/batch/${stRes.student.batchId}`);
                setHomeworkList(hwRes.homework?.slice(0, 3) || []);
              }
            }
          } catch (e) {
            console.error("Failed to load student profile:", e);
          }

          // Fetch attendance summary
          try {
            const attRes = await api.get<{ summary: AttendanceSummary }>(`/attendance/student/${studentId}`);
            setAttendance(attRes.summary || null);
          } catch (e) {
            console.error("Failed to load attendance:", e);
          }

          // Fetch fees summary
          try {
            const feeRes = await api.get<{ summary: FeeSummary }>(`/fees/student/${studentId}`);
            setFees(feeRes.summary || null);
          } catch (e) {
            console.error("Failed to load fees:", e);
          }

          // Fetch remarks
          try {
            const remRes = await api.get<{ remarks: RemarkItem[] }>(`/remarks/student/${studentId}`);
            setRemarks(remRes.remarks?.slice(0, 2) || []);
          } catch (e) {
            console.error("Failed to load remarks:", e);
          }
        }

        // Fetch notices
        try {
          const notRes = await api.get<{ notices: NoticeItem[] }>("/notices");
          setNotices(notRes.notices?.slice(0, 2) || []);
        } catch (e) {
          console.error("Failed to load notices:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasSessions = (attendance?.totalSessions || 0) > 0;
  const attendancePct = hasSessions ? (attendance?.attendancePercentage ?? 0) : null;
  const outstandingBal = fees?.outstandingBalanceInRupees ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Card */}
      <div className="bg-gradient-to-tr from-indigo-900 via-indigo-800 to-sky-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 -skew-x-12 transform origin-top pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sky-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Session 2026–2027</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hi, {profile?.fullName || user?.fullName}!
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-sky-100">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md font-mono">
              Adm: {profile?.admissionNumber || "PA-2026"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md font-semibold">
              Class: {profile?.className || "Grade 11 Science"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md font-semibold">
              Batch: {profile?.batchName || "Morning Cohort A"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action / Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Fee Payment Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuition Fees</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  ₹{outstandingBal.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                outstandingBal === 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {outstandingBal === 0 ? "All Paid" : "Dues Pending"}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {outstandingBal > 0
              ? "You have outstanding installment balance. Pay online securely using UPI, cards, or net banking."
              : "All fee obligations are clear. View and download your official payment receipts."}
          </p>

          <Link
            href="/portal/fees"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            <span>{outstandingBal > 0 ? "Pay Tuition Dues" : "View Receipts"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Attendance Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Score</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {hasSessions ? `${attendancePct}%` : "No sessions"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-500">
              {hasSessions ? (
                <>
                  <span className="text-emerald-600 font-bold">{attendance?.present || 0} Present</span>
                  <span>•</span>
                  <span className="text-rose-600 font-bold">{attendance?.absent || 0} Absent</span>
                </>
              ) : (
                <span className="text-slate-400">0 sessions logged</span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Institute minimum requirement is 75%. Keep your attendance above threshold for examination eligibility.
          </p>

          <Link
            href="/portal/attendance"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold transition"
          >
            <span>View Session Attendance History</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Homework & Notices Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pending Homework */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Current Homework & Tasks</h2>
            </div>
            <Link href="/portal/homework" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>

          {homeworkList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No pending homework assignments.</p>
          ) : (
            <div className="space-y-3">
              {homeworkList.map((item) => (
                <Link
                  key={item.id}
                  href="/portal/homework"
                  className="block p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/70 hover:border-indigo-200 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.subjectName}
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Due {item.dueDate}</span>
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notices & Announcements */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900">{school?.name || "School"} Announcements & Notices</h2>
            </div>
          </div>

          {notices.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No institute announcements posted yet.</p>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{notice.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest Faculty Remarks */}
      {remarks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <MessageSquareQuote className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Faculty Observations & Remarks</h2>
            </div>
            <Link href="/portal/remarks" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View All Observations
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {remarks.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {r.category}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    By {r.facultyName} {r.subjectName ? `(${r.subjectName})` : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">&ldquo;{r.remarkText}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

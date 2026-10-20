"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  X,
  AlertCircle,
  ExternalLink,
  Award
} from "lucide-react";

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl: string | null;
  status: string;
  subjectName: string;
  createdAt: number;
}

interface StudentSubmission {
  submissionId: string;
  homeworkId: string;
  title: string;
  dueDate: string;
  subjectName: string;
  status: string;
  feedback: string | null;
  score: number | null;
  submittedAt: number;
}

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, StudentSubmission>>({});
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [activeTask, setActiveTask] = useState<HomeworkItem | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHomeworkAndSubmissions = async () => {
    try {
      setLoading(true);
      const studentId = user?.studentId;
      if (!studentId) return;

      // 1. Get student profile to retrieve batchId
      const stRes = await api.get<{ student: any }>(`/students/${studentId}`);
      const batchId = stRes.student?.batchId;

      if (batchId) {
        const hwRes = await api.get<{ homework: HomeworkItem[] }>(`/homework/batch/${batchId}`);
        setHomeworkList(hwRes.homework || []);
      }

      // 2. Get student submissions
      const subRes = await api.get<{ submissions: StudentSubmission[] }>(`/homework/student/${studentId}`);
      const subMap: Record<string, StudentSubmission> = {};
      (subRes.submissions || []).forEach((s) => {
        subMap[s.homeworkId] = s;
      });
      setSubmissions(subMap);
    } catch (err: any) {
      console.error("Failed to load homework:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeworkAndSubmissions();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post(`/homework/${activeTask.id}/submit`, {
        submissionText,
        fileUrl: fileUrl || undefined,
      });

      setStatusMessage({ type: "success", text: `Assignment "${activeTask.title}" submitted successfully!` });
      setActiveTask(null);
      setSubmissionText("");
      setFileUrl("");
      fetchHomeworkAndSubmissions();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to submit assignment." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Homework & Assignments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review assignments by subject, download study references, and turn in your completed work.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : homeworkList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Homework Assigned</h3>
          <p className="text-xs text-slate-500 mt-1">You are all caught up on your course curriculum.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {homeworkList.map((item) => {
            const submission = submissions[item.id];
            const isSubmitted = Boolean(submission);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        {item.subjectName}
                      </span>
                      {isSubmitted ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending Submission
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {item.dueDate}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>

                {item.attachmentUrl && (
                  <div className="pt-1">
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Download Study Material / Worksheet</span>
                    </a>
                  </div>
                )}

                {/* Feedback or Grade if evaluated */}
                {submission?.feedback && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Teacher Feedback:</span>
                      </span>
                      {submission.score !== null && <span>Score: {submission.score} pts</span>}
                    </div>
                    <p className="text-emerald-800">{submission.feedback}</p>
                  </div>
                )}

                {/* Submission Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveTask(item)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                      isSubmitted
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitted ? "Resubmit Work" : "Turn In Assignment"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Turn In Homework Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Turn In Assignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeTask.title}</p>
              </div>
              <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Submission Answers / Response
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your solutions, summary or responses here..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  External File / Drive Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Turning in..." : "Submit to Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Layers,
  Sparkles
} from "lucide-react";

interface Batch {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl: string | null;
  status: string;
  subjectId: string;
  subjectName: string;
  createdAt: number;
}

export default function TeacherHomeworkPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialBatch = searchParams.get("batchId") || "";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatch);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    return nextWeek.toISOString().split("T")[0];
  });
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        let assignedBatchIds: Set<string> | null = null;
        let allottedSubjectIds: Set<string> | null = null;
        if (user?.teacherId) {
          try {
            const assignRes = await api.teachers.getAssignments(user.teacherId);
            if (assignRes.assignments?.length) {
              assignedBatchIds = new Set(assignRes.assignments.map((a: any) => a.batchId));
              allottedSubjectIds = new Set(assignRes.assignments.map((a: any) => a.subjectId));
            }
          } catch (e) {
            console.warn("Could not load faculty assignments:", e);
          }
        }

        const [batchesRes, subjectsRes] = await Promise.all([
          api.get<{ batches: Batch[] }>("/academic/batches"),
          api.get<{ subjects: Subject[] }>("/academic/subjects"),
        ]);
        let bList = batchesRes.batches || [];
        let sList = subjectsRes.subjects || [];

        if (assignedBatchIds && assignedBatchIds.size > 0) {
          bList = bList.filter((b) => assignedBatchIds.has(b.id));
        }
        if (allottedSubjectIds && allottedSubjectIds.size > 0) {
          sList = sList.filter((s) => allottedSubjectIds.has(s.id));
        }

        setBatches(bList);
        setSubjects(sList);

        if (bList.length > 0) {
          if (!selectedBatchId || !bList.some((b) => b.id === selectedBatchId)) {
            setSelectedBatchId(bList[0].id);
          }
        } else {
          setSelectedBatchId("");
        }

        if (sList.length > 0) {
          setSubjectId(sList[0].id);
        } else {
          setSubjectId("");
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    };

    loadMetadata();
  }, [user?.teacherId]);

  const fetchHomework = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const res = await api.get<{ homework: HomeworkItem[] }>(`/homework/batch/${selectedBatchId}`);
      setHomeworkList(res.homework || []);
    } catch (err: any) {
      console.error("Failed to load homework:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, [selectedBatchId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post("/homework", {
        batchId: selectedBatchId,
        subjectId,
        title,
        description,
        dueDate,
        attachmentUrl: attachmentUrl || undefined,
      });

      setStatusMessage({ type: "success", text: "Homework published successfully!" });
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setAttachmentUrl("");
      fetchHomework();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to publish homework." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Homework & Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish coursework, set submission deadlines, and monitor completion rates.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Homework</span>
        </button>
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

      {/* Batch selector bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center space-x-4">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
          Viewing Batch:
        </label>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Homework List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : homeworkList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Homework Assigned</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven&apos;t created any assignments for this batch yet. Click &quot;Publish Homework&quot; to assign study material.
            </p>
          </div>
        ) : (
          homeworkList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-emerald-200 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {item.subjectName}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{item.title}</h3>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: {item.dueDate}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>

              {item.attachmentUrl && (
                <div className="pt-2">
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Reference Attachment</span>
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal to Create Homework */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Publish New Homework</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Practice Problems & Numerical Analysis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Detailed Instructions
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write clear expectations, questions to attempt, and submission format..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Reference URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish to Cohort"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

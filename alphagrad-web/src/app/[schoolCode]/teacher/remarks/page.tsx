"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  MessageSquareQuote,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Award,
  Sparkles
} from "lucide-react";

interface Batch {
  id: string;
  name: string;
  code: string;
}

interface StudentItem {
  studentId: string;
  fullName: string;
  username: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function TeacherRemarksPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [category, setCategory] = useState<"academic" | "behavioral" | "attendance" | "general">("academic");
  const [remarkText, setRemarkText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load batches and subjects
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
          setSelectedSubjectId(sList[0].id);
        } else {
          setSelectedSubjectId("");
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    };

    loadMetadata();
  }, [user?.teacherId]);

  // When selectedBatchId changes, load students
  useEffect(() => {
    if (!selectedBatchId) return;

    const loadStudents = async () => {
      try {
        const res = await api.get<{ students: StudentItem[] }>(`/academic/batches/${selectedBatchId}/students`);
        const list = res.students || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].studentId);
        } else {
          setSelectedStudentId("");
        }
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    };

    loadStudents();
  }, [selectedBatchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBatchId || !remarkText.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post("/remarks", {
        studentId: selectedStudentId,
        batchId: selectedBatchId,
        subjectId: selectedSubjectId || undefined,
        category,
        remarkText: remarkText.trim(),
      });

      setStatusMessage({
        type: "success",
        text: "Faculty observation successfully published to the student and parent portal!",
      });
      setRemarkText("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to record observation." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Academic & Behavioral Remarks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record constructive observations and feedback visible to students and their guardians.
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

      {/* Observation Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Student
              </label>
              <select
                value={selectedStudentId}
                disabled={students.length === 0}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
              >
                {students.length === 0 ? (
                  <option>No students enrolled in this batch</option>
                ) : (
                  students.map((st) => (
                    <option key={st.studentId} value={st.studentId}>
                      {st.fullName} ({st.username})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Relevant Subject (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">General Institute Observation</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Observation Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["academic", "behavioral", "attendance", "general"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition ${
                      category === cat
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Teacher Remark & Actionable Advice
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. Exhibited significant improvement in calculus problem solving. Needs focused revision on integration by parts."
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              This note will immediately reflect in the Student & Parent PWA feed.
            </span>
            <button
              type="submit"
              disabled={submitting || !selectedStudentId || !remarkText.trim()}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Publishing Note..." : "Publish Observation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

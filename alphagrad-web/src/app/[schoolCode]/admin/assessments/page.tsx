"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Award,
  Calendar,
  Trash2,
  Users,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2
} from "lucide-react";
import BouncingLoader from "@/components/BouncingLoader";

interface Batch {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface StudentOption {
  id: string;
  fullName: string;
  admissionNumber: string;
}

interface AssessmentItem {
  id: string;
  batchId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  title: string;
  month: string;
  assessmentDate: string;
  maxMarks: number;
  passingMarks: number;
  status: string;
  description: string | null;
  marksObtained?: number | null;
  grade?: string | null;
  remarks?: string | null;
}

export default function AdminAssessmentsPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Add / Grade child mark
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [childForm, setChildForm] = useState({
    studentId: "",
    subjectId: "",
    title: "Monthly Assessment — October 2026",
    month: "October 2026",
    assessmentDate: new Date().toISOString().split("T")[0],
    maxMarks: 100,
    passingMarks: 40,
    marksObtained: "",
    grade: "",
    remarks: "",
  });
  const [savingChildMark, setSavingChildMark] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [batchesRes, subjectsRes] = await Promise.all([
          api.academic.batches(),
          api.academic.subjects(),
        ]);
        const bList = batchesRes.batches || [];
        setBatches(bList);
        setSubjects(subjectsRes.subjects || []);
        if (bList.length > 0) setSelectedBatchId(bList[0].id);
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    }
    loadMeta();
  }, []);

  // When batch changes, fetch enrolled students
  useEffect(() => {
    if (!selectedBatchId) return;
    async function loadStudents() {
      try {
        const res = await api.academic.batchStudents(selectedBatchId);
        const list = (res.students || []).map((st: any) => ({
          id: st.studentId,
          fullName: st.fullName,
          admissionNumber: st.admissionNumber,
        }));
        setStudents(list);
        setSelectedStudentId("");
      } catch (err) {
        console.error("Failed to load batch students:", err);
      }
    }
    loadStudents();
  }, [selectedBatchId]);

  const fetchAssessments = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const res = await api.assessments.batch(selectedBatchId, {
        studentId: selectedStudentId || undefined,
        subjectId: selectedSubjectFilter !== "all" ? selectedSubjectFilter : undefined,
      });
      setAssessments(res.assessments || []);
    } catch (err) {
      console.error("Failed to load assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [selectedBatchId, selectedStudentId, selectedSubjectFilter]);

  const calculateGrade = (marks: number, max: number): string => {
    if (max <= 0) return "N/A";
    const pct = (marks / max) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    return "D";
  };

  const handleOpenChildModal = (prefillStudentId?: string, prefillSubjectId?: string) => {
    setChildForm({
      studentId: prefillStudentId || selectedStudentId || students[0]?.id || "",
      subjectId: prefillSubjectId || (selectedSubjectFilter !== "all" ? selectedSubjectFilter : subjects[0]?.id || ""),
      title: "Monthly Assessment — October 2026",
      month: "October 2026",
      assessmentDate: new Date().toISOString().split("T")[0],
      maxMarks: 100,
      passingMarks: 40,
      marksObtained: "",
      grade: "",
      remarks: "",
    });
    setIsChildModalOpen(true);
  };

  const handleSaveChildMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childForm.studentId || !childForm.subjectId || !childForm.title || childForm.marksObtained === "") {
      setStatusMsg({ type: "error", text: "Please complete all required fields." });
      return;
    }

    const num = Number(childForm.marksObtained);
    if (isNaN(num) || num < 0 || num > childForm.maxMarks) {
      setStatusMsg({ type: "error", text: `Marks must be between 0 and ${childForm.maxMarks}.` });
      return;
    }

    try {
      setSavingChildMark(true);
      const grade = childForm.grade || calculateGrade(num, childForm.maxMarks);

      await api.assessments.createStudentMark({
        batchId: selectedBatchId,
        studentId: childForm.studentId,
        subjectId: childForm.subjectId,
        title: childForm.title.trim(),
        month: childForm.month,
        assessmentDate: childForm.assessmentDate,
        maxMarks: childForm.maxMarks,
        passingMarks: childForm.passingMarks,
        marksObtained: num,
        grade,
        remarks: childForm.remarks.trim() || undefined,
      });

      setStatusMsg({ type: "success", text: "Student assessment and marks recorded successfully!" });
      setIsChildModalOpen(false);
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to save assessment." });
    } finally {
      setSavingChildMark(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await api.assessments.delete(id);
      setStatusMsg({ type: "success", text: "Assessment deleted successfully." });
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Failed to delete assessment:", err);
    }
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Assessments Oversight</h1>
          <p className="text-xs text-slate-500 mt-1">
            Institute-wide management of monthly evaluations, unit tests, and grade reports across all student batches.
          </p>
        </div>

        <button
          onClick={() => handleOpenChildModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Student Grade</span>
        </button>
      </div>

      {/* Filter Ribbon: Batch & Student */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Select Cohort / Batch
          </label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Student Filter (Specific Child)
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Students (Cohort Summary)</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName} ({st.admissionNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Subject Filter
          </label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Child Context Banner if filtered */}
      {currentStudent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Filtered Student Evaluation History
            </div>
            <div className="font-bold text-emerald-950 text-sm">
              {currentStudent.fullName} • Admission #{currentStudent.admissionNumber}
            </div>
          </div>
          <button
            onClick={() => handleOpenChildModal(currentStudent.id)}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
          >
            + Add Grade for {currentStudent.fullName.split(" ")[0]}
          </button>
        </div>
      )}

      {/* Assessments list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Recorded Assessments</h2>
          <span className="text-xs font-bold text-slate-500">{assessments.length} Total</span>
        </div>

        {loading ? (
          <BouncingLoader text="Loading student assessments & scorecards..." color="indigo" />
        ) : assessments.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No assessments found for this criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => {
              const hasScore = a.marksObtained !== undefined && a.marksObtained !== null;
              return (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 text-indigo-700">
                        {a.subjectCode || a.subjectName}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{a.month}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-500">{a.assessmentDate}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                    {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                    <p className="text-[11px] text-slate-400">
                      Maximum Marks: {a.maxMarks} | Passing Threshold: {a.passingMarks}
                    </p>

                    {currentStudent && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                        {hasScore ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-semibold">Score:</span>
                            <span className="font-black text-slate-900">
                              {a.marksObtained} / {a.maxMarks}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Grade {a.grade}
                            </span>
                            {a.remarks && (
                              <span className="text-slate-500 italic ml-2">"{a.remarks}"</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-semibold">Not graded for this child.</span>
                        )}

                        <button
                          onClick={() => handleOpenChildModal(currentStudent.id, a.subjectId)}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded hover:bg-slate-100 shrink-0"
                        >
                          {hasScore ? "Edit Grade" : "Enter Grade"}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-end md:self-center"
                    title="Delete Assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: GRADE STUDENT ── */}
      {isChildModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Record Student Monthly Assessment</h3>
              <button
                onClick={() => setIsChildModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChildMark} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student *</label>
                  <select
                    required
                    value={childForm.studentId}
                    onChange={(e) => setChildForm({ ...childForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Child</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={childForm.subjectId}
                    onChange={(e) => setChildForm({ ...childForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Title *</label>
                <input
                  type="text"
                  required
                  value={childForm.title}
                  onChange={(e) => setChildForm({ ...childForm, title: e.target.value })}
                  placeholder="e.g. Monthly Evaluation — October 2026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
                  <input
                    type="text"
                    value={childForm.month}
                    onChange={(e) => setChildForm({ ...childForm, month: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={childForm.assessmentDate}
                    onChange={(e) => setChildForm({ ...childForm, assessmentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks Obtained *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={childForm.maxMarks}
                    value={childForm.marksObtained}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = Number(val);
                      const g = val !== "" && !isNaN(num) ? calculateGrade(num, childForm.maxMarks) : "";
                      setChildForm({ ...childForm, marksObtained: val, grade: g });
                    }}
                    placeholder="e.g. 92"
                    className="w-full px-3 py-2 text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={childForm.maxMarks}
                    onChange={(e) => setChildForm({ ...childForm, maxMarks: Number(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={childForm.grade}
                    onChange={(e) => setChildForm({ ...childForm, grade: e.target.value.toUpperCase() })}
                    placeholder="Auto (A+, A...)"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks & Academic Notes</label>
                <textarea
                  rows={2}
                  value={childForm.remarks}
                  onChange={(e) => setChildForm({ ...childForm, remarks: e.target.value })}
                  placeholder="Notes on performance, topic mastery..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChildModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChildMark}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingChildMark ? "Recording..." : "Save Student Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

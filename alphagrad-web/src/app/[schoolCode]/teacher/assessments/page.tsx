"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Award,
  Plus,
  Calendar,
  CheckCircle2,
  Users,
  Edit2,
  Trash2,
  X,
  FileText,
  Trophy,
  Save,
  Check,
  AlertCircle,
  UserCheck,
  Sparkles
} from "lucide-react";

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
  // When loaded with ?studentId=...
  marksObtained?: number | null;
  grade?: string | null;
  rank?: number | null;
  remarks?: string | null;
}

interface StudentMarkRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  marksObtained: number | string;
  grade: string;
  remarks: string;
}

export default function TeacherAssessmentsPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allottedSubjectIds, setAllottedSubjectIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal 1: Add Assessment for Specific Child
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

  // Modal 2: Create Batch Assessment
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subjectId: "",
    title: "",
    month: "October 2026",
    assessmentDate: new Date().toISOString().split("T")[0],
    maxMarks: 100,
    passingMarks: 40,
    description: "",
  });
  const [creating, setCreating] = useState(false);

  // Modal 3: Batch Grade All Students
  const [gradingAssessment, setGradingAssessment] = useState<AssessmentItem | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMarkRow[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Load Batches, Subjects, Teacher Allotments
  useEffect(() => {
    async function loadMeta() {
      try {
        const [batchesRes, subjectsRes] = await Promise.all([
          api.academic.batches(),
          api.academic.subjects(),
        ]);
        const bList = batchesRes.batches || [];
        const sList = subjectsRes.subjects || [];

        let filteredBatches = bList;
        if (user?.teacherId) {
          try {
            const assignRes = await api.teachers.getAssignments(user.teacherId);
            const allotted = new Set<string>();
            const assignedBatches = new Set<string>();
            for (const a of assignRes.assignments || []) {
              if (a.subjectId) allotted.add(a.subjectId);
              if (a.batchId) assignedBatches.add(a.batchId);
            }
            setAllottedSubjectIds(allotted);
            if (assignedBatches.size > 0) {
              filteredBatches = bList.filter((b: Batch) => assignedBatches.has(b.id));
            }
          } catch (e) {
            console.error("Could not load faculty allotments:", e);
          }
        }

        setBatches(filteredBatches);
        setSubjects(sList);

        if (filteredBatches.length > 0) {
          setSelectedBatchId(filteredBatches[0].id);
        } else {
          setSelectedBatchId("");
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, [user?.teacherId]);

  // Load students when batch changes
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
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    }
    loadStudents();
  }, [selectedBatchId]);

  // Fetch assessments (supports studentId query)
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

  // Helper for grade
  const calculateGradeFromMarks = (marks: number, max: number): string => {
    if (max <= 0) return "N/A";
    const pct = (marks / max) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    return "D";
  };

  // Handler: Open Child Mark Modal
  const handleOpenChildModal = (prefillStudentId?: string, prefillSubjectId?: string) => {
    const studentToUse = prefillStudentId || selectedStudentId || students[0]?.id || "";
    // Default subject to first allotted subject if available
    let subjectToUse = prefillSubjectId || (selectedSubjectFilter !== "all" ? selectedSubjectFilter : "");
    if (!subjectToUse && allottedSubjectIds.size > 0) {
      subjectToUse = Array.from(allottedSubjectIds)[0];
    }
    if (!subjectToUse) {
      subjectToUse = subjects[0]?.id || "";
    }

    setChildForm({
      studentId: studentToUse,
      subjectId: subjectToUse,
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

  // Handler: Submit Child Mark
  const handleSaveChildMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childForm.studentId || !childForm.subjectId || !childForm.title || childForm.marksObtained === "") {
      setStatusMsg({ type: "error", text: "Student, subject, assessment title, and marks are required." });
      return;
    }

    const numMarks = Number(childForm.marksObtained);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > childForm.maxMarks) {
      setStatusMsg({ type: "error", text: `Marks must be a number between 0 and ${childForm.maxMarks}.` });
      return;
    }

    try {
      setSavingChildMark(true);
      const computedGrade = childForm.grade || calculateGradeFromMarks(numMarks, childForm.maxMarks);

      await api.assessments.createStudentMark({
        batchId: selectedBatchId,
        studentId: childForm.studentId,
        subjectId: childForm.subjectId,
        title: childForm.title.trim(),
        month: childForm.month,
        assessmentDate: childForm.assessmentDate,
        maxMarks: childForm.maxMarks,
        passingMarks: childForm.passingMarks,
        marksObtained: numMarks,
        grade: computedGrade,
        remarks: childForm.remarks.trim() || undefined,
      });

      const studentName = students.find((s) => s.id === childForm.studentId)?.fullName || "Student";
      setStatusMsg({
        type: "success",
        text: `Grade recorded for ${studentName} (${numMarks}/${childForm.maxMarks} - Grade ${computedGrade})!`,
      });
      setIsChildModalOpen(false);
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to record child mark." });
    } finally {
      setSavingChildMark(false);
    }
  };

  // Handler: Create Whole-Batch Assessment
  const handleCreateBatchAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subjectId || !createForm.title) {
      setStatusMsg({ type: "error", text: "Subject and assessment title are required." });
      return;
    }

    try {
      setCreating(true);
      await api.assessments.create({
        batchId: selectedBatchId,
        ...createForm,
      });
      setStatusMsg({ type: "success", text: "Cohort assessment scheduled successfully!" });
      setIsCreateOpen(false);
      setCreateForm({
        subjectId: subjects[0]?.id || "",
        title: "",
        month: "October 2026",
        assessmentDate: new Date().toISOString().split("T")[0],
        maxMarks: 100,
        passingMarks: 40,
        description: "",
      });
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to create assessment." });
    } finally {
      setCreating(false);
    }
  };

  // Handler: Open Batch Grading Modal
  const handleOpenBatchGrading = async (assessment: AssessmentItem) => {
    setGradingAssessment(assessment);
    setLoadingMarks(true);
    try {
      const [studentsRes, assessmentRes] = await Promise.all([
        api.academic.batchStudents(selectedBatchId),
        api.assessments.get(assessment.id),
      ]);

      const batchStudents = studentsRes.students || [];
      const existingMarksMap: Record<string, any> = {};
      for (const m of assessmentRes.marks || []) {
        existingMarksMap[m.studentId] = m;
      }

      const rows: StudentMarkRow[] = batchStudents.map((st: any) => {
        const existing = existingMarksMap[st.studentId || st.id];
        return {
          studentId: st.studentId || st.id,
          studentName: st.fullName,
          admissionNumber: st.admissionNumber,
          marksObtained: existing ? existing.marksObtained : "",
          grade: existing ? existing.grade : "",
          remarks: existing ? existing.remarks || "" : "",
        };
      });

      setStudentMarks(rows);
    } catch (err) {
      console.error("Failed to load student marks:", err);
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleScoreChange = (index: number, scoreVal: string) => {
    const updated = [...studentMarks];
    updated[index].marksObtained = scoreVal;

    const num = Number(scoreVal);
    const max = gradingAssessment?.maxMarks || 100;
    if (scoreVal !== "" && !isNaN(num) && max > 0) {
      updated[index].grade = calculateGradeFromMarks(num, max);
    }
    setStudentMarks(updated);
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    const updated = [...studentMarks];
    updated[index].remarks = remarks;
    setStudentMarks(updated);
  };

  const handleSaveAllMarks = async () => {
    if (!gradingAssessment) return;
    try {
      setSavingMarks(true);
      const validMarks = studentMarks
        .filter((r) => r.marksObtained !== "" && !isNaN(Number(r.marksObtained)))
        .map((r) => ({
          studentId: r.studentId,
          marksObtained: Number(r.marksObtained),
          grade: r.grade,
          remarks: r.remarks,
        }));

      await api.assessments.submitMarks(gradingAssessment.id, { marks: validMarks });
      setStatusMsg({ type: "success", text: `Saved marks for ${validMarks.length} students!` });
      setGradingAssessment(null);
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save marks." });
    } finally {
      setSavingMarks(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await api.assessments.delete(id);
      setStatusMsg({ type: "success", text: "Assessment deleted." });
      fetchAssessments();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to delete assessment." });
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
              Faculty Grading
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Monthly Assessments</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Monthly Assessments & Grading
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grade individual students in your allotted subjects, or schedule cohort-wide monthly evaluations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => handleOpenChildModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
          >
            <Award className="w-4 h-4" />
            <span>+ Grade Specific Child</span>
          </button>

          <button
            onClick={() => {
              const defaultSub = allottedSubjectIds.size > 0 ? Array.from(allottedSubjectIds)[0] : subjects[0]?.id || "";
              setCreateForm({
                subjectId: defaultSub,
                title: "",
                month: "October 2026",
                assessmentDate: new Date().toISOString().split("T")[0],
                maxMarks: 100,
                passingMarks: 40,
                description: "",
              });
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Schedule Assessment</span>
          </button>
        </div>
      </div>

      {/* Filters: Batch, Student, Subject */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Batch
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Student Filter (Specific Child)
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Students (Cohort Overview)</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName} ({st.admissionNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Subject Filter
          </label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => {
              const isAllotted = allottedSubjectIds.has(sub.id);
              return (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code}) {isAllotted ? "★ Allotted" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Active Child Context Bar (if a student is filtered) */}
      {selectedStudent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center">
              {selectedStudent.fullName.charAt(0)}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Viewing Individual Student Scores
              </div>
              <div className="font-bold text-emerald-950 text-sm">
                {selectedStudent.fullName} ({selectedStudent.admissionNumber})
              </div>
            </div>
          </div>
          <button
            onClick={() => handleOpenChildModal(selectedStudent.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Grade for {selectedStudent.fullName.split(" ")[0]}</span>
          </button>
        </div>
      )}

      {/* Assessment Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Recorded Assessments</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedStudent
                ? `Showing evaluation scores and remarks for ${selectedStudent.fullName}`
                : "Scheduled tests, maximum marks, and cohort evaluation records."}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">{assessments.length} Total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No assessments found</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Grade Specific Child" or "+ Schedule Assessment" to record monthly marks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => {
              const hasStudentScore = a.marksObtained !== undefined && a.marksObtained !== null;
              const isAllotted = allottedSubjectIds.has(a.subjectId);

              return (
                <div
                  key={a.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {a.subjectCode || a.subjectName}
                      </span>
                      {isAllotted && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Your Subject
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500">{a.month}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{a.assessmentDate}</span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{a.title}</h4>

                    {a.description && <p className="text-xs text-slate-500">{a.description}</p>}

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Max Marks: {a.maxMarks}</span>
                      <span>•</span>
                      <span>Pass Mark: {a.passingMarks}</span>
                    </div>

                    {/* Child specific score box if filtered */}
                    {selectedStudent && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                        {hasStudentScore ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-semibold">Marks:</span>
                              <span className="text-sm font-black text-slate-900">
                                {a.marksObtained} / {a.maxMarks}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Grade {a.grade}
                              </span>
                            </div>
                            {a.remarks && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                Remarks: "{a.remarks}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">
                            Not yet graded for this child.
                          </span>
                        )}

                        <button
                          onClick={() => handleOpenChildModal(selectedStudent.id, a.subjectId)}
                          className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 shadow-2xs shrink-0"
                        >
                          {hasStudentScore ? "Edit Score" : "Enter Mark"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenBatchGrading(a)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Cohort Roster</span>
                    </button>

                    <button
                      onClick={() => handleDeleteAssessment(a.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Delete Assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: GRADE SPECIFIC CHILD ── */}
      {isChildModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Record Grade for Student</h3>
              </div>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Subject *</label>
                  <select
                    required
                    value={childForm.subjectId}
                    onChange={(e) => setChildForm({ ...childForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => {
                      const isAllotted = allottedSubjectIds.has(sub.id);
                      return (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code}) {isAllotted ? "★ Allotted" : ""}
                        </option>
                      );
                    })}
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
                    placeholder="e.g. October 2026"
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
                      const g = val !== "" && !isNaN(num) ? calculateGradeFromMarks(num, childForm.maxMarks) : "";
                      setChildForm({ ...childForm, marksObtained: val, grade: g });
                    }}
                    placeholder="e.g. 88"
                    className="w-full px-3 py-2 text-xs font-black text-indigo-700 bg-slate-50 border border-slate-200 rounded-xl"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Remarks & Feedback</label>
                <textarea
                  rows={2}
                  value={childForm.remarks}
                  onChange={(e) => setChildForm({ ...childForm, remarks: e.target.value })}
                  placeholder="Feedback on analytical performance, strengths, or areas for improvement..."
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
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingChildMark ? "Recording..." : "Save Grade for Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SCHEDULE COHORT ASSESSMENT ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Schedule Monthly Assessment</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatchAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={createForm.subjectId}
                  onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => {
                    const isAllotted = allottedSubjectIds.has(sub.id);
                    return (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code}) {isAllotted ? "★ Allotted to You" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Unit Test 1 — Vectors & Kinematics"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
                  <input
                    type="text"
                    value={createForm.month}
                    onChange={(e) => setCreateForm({ ...createForm, month: e.target.value })}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={createForm.assessmentDate}
                    onChange={(e) => setCreateForm({ ...createForm, assessmentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={createForm.maxMarks}
                    onChange={(e) => setCreateForm({ ...createForm, maxMarks: Number(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Passing Threshold</label>
                  <input
                    type="number"
                    value={createForm.passingMarks}
                    onChange={(e) => setCreateForm({ ...createForm, passingMarks: Number(e.target.value) || 40 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus / Topics Covered</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional details regarding exam format, question papers, or instructions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Scheduling..." : "Schedule Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: BATCH GRADING (COHORT ROSTER) ── */}
      {gradingAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Grade Cohort: {gradingAssessment.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Max: {gradingAssessment.maxMarks} • Subject: {gradingAssessment.subjectName || gradingAssessment.subjectCode}
                </p>
              </div>
              <button
                onClick={() => setGradingAssessment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMarks ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : studentMarks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-slate-700">No students enrolled in this batch.</p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-3 pr-1 grow">
                {studentMarks.map((row, idx) => (
                  <div
                    key={row.studentId}
                    className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-[140px]">
                      <div className="font-bold text-xs text-slate-900">{row.studentName}</div>
                      <div className="text-[11px] text-slate-400">{row.admissionNumber}</div>
                    </div>

                    <div className="flex items-center gap-2 grow">
                      <div className="w-20">
                        <input
                          type="number"
                          min={0}
                          max={gradingAssessment.maxMarks}
                          value={row.marksObtained}
                          onChange={(e) => handleScoreChange(idx, e.target.value)}
                          placeholder="Score"
                          className="w-full px-2.5 py-1.5 text-xs font-bold text-center bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="w-14">
                        <span className="w-full inline-block py-1.5 text-xs font-bold text-center bg-slate-200/60 rounded-lg text-slate-700">
                          {row.grade || "—"}
                        </span>
                      </div>

                      <div className="grow">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRemarksChange(idx, e.target.value)}
                          placeholder="Feedback/remarks..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setGradingAssessment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveAllMarks}
                disabled={savingMarks}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingMarks ? "Saving..." : "Save All Marks"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

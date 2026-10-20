"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  X,
  BookOpen,
  Calendar,
  FileText,
  AlertCircle,
  UserCheck,
  Users,
  GraduationCap,
  Sparkles,
  Check
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

interface TeacherOption {
  id: string;
  fullName: string;
  employeeId: string;
}

interface Chapter {
  id: string;
  batchId: string;
  studentId?: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  chapterNumber: string;
  chapterTitle: string;
  status: "pending" | "in_progress" | "completed";
  progressPercentage: number;
  targetCompletionDate: string | null;
  notes: string | null;
}

export default function AdminSyllabusPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Chapter Form
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({
    subjectId: "",
    studentId: "",
    chapterNumber: "Chapter 1",
    chapterTitle: "",
    status: "pending" as "pending" | "in_progress" | "completed",
    progressPercentage: 0,
    targetCompletionDate: "",
    notes: "",
  });
  const [savingChapter, setSavingChapter] = useState(false);

  // Subject Form (e.g. French, Sanskrit)
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [savingSubject, setSavingSubject] = useState(false);

  // Staff Allocation Form
  const [assignForm, setAssignForm] = useState({
    teacherId: "",
    batchId: "",
    subjectId: "",
    isClassTeacher: false,
  });
  const [savingAssign, setSavingAssign] = useState(false);

  // Load initial meta
  useEffect(() => {
    async function loadMeta() {
      try {
        const [batchesRes, subjectsRes, teachersRes] = await Promise.all([
          api.academic.batches(),
          api.academic.subjects(),
          api.teachers.list(),
        ]);
        const bList = batchesRes.batches || [];
        setBatches(bList);
        setSubjects(subjectsRes.subjects || []);
        setTeachers(
          (teachersRes.teachers || []).map((t: any) => ({
            id: t.id,
            fullName: t.fullName,
            employeeId: t.employeeId,
          }))
        );

        if (bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // When batch changes, load enrolled students
  useEffect(() => {
    if (!selectedBatchId) return;
    async function loadStudents() {
      try {
        const res = await api.academic.batchStudents(selectedBatchId);
        const stList = (res.students || []).map((s: any) => ({
          id: s.studentId,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
        }));
        setStudents(stList);
        setSelectedStudentId(""); // Reset to batch-wide default
      } catch (err) {
        console.error("Failed to load batch students:", err);
      }
    }
    loadStudents();
  }, [selectedBatchId]);

  // Fetch chapters for batch or specific student
  const fetchChapters = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const res = await api.syllabus.batch(selectedBatchId, selectedStudentId || undefined);
      setChapters(res.chapters || []);
    } catch (err) {
      console.error("Failed to load chapters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [selectedBatchId, selectedStudentId]);

  // Chapter Modal Handlers
  const handleOpenAddChapter = () => {
    setEditingChapterId(null);
    setChapterForm({
      subjectId: subjects[0]?.id || "",
      studentId: selectedStudentId || "",
      chapterNumber: `Chapter ${chapters.length + 1}`,
      chapterTitle: "",
      status: "pending",
      progressPercentage: 0,
      targetCompletionDate: "",
      notes: "",
    });
    setIsChapterModalOpen(true);
  };

  const handleOpenEditChapter = (ch: Chapter) => {
    setEditingChapterId(ch.id);
    setChapterForm({
      subjectId: ch.subjectId,
      studentId: ch.studentId || selectedStudentId || "",
      chapterNumber: ch.chapterNumber,
      chapterTitle: ch.chapterTitle,
      status: ch.status,
      progressPercentage: ch.progressPercentage || 0,
      targetCompletionDate: ch.targetCompletionDate || "",
      notes: ch.notes || "",
    });
    setIsChapterModalOpen(true);
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.subjectId || !chapterForm.chapterTitle) {
      setStatusMsg({ type: "error", text: "Please select a subject and enter the chapter title." });
      return;
    }

    try {
      setSavingChapter(true);
      if (editingChapterId) {
        await api.syllabus.update(editingChapterId, {
          ...chapterForm,
          studentId: chapterForm.studentId || undefined,
        });
        setStatusMsg({ type: "success", text: "Chapter progress updated successfully!" });
      } else {
        await api.syllabus.create({
          batchId: selectedBatchId,
          ...chapterForm,
          studentId: chapterForm.studentId || undefined,
        });
        setStatusMsg({ type: "success", text: "New chapter added to syllabus successfully!" });
      }

      setIsChapterModalOpen(false);
      fetchChapters();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to save chapter." });
    } finally {
      setSavingChapter(false);
    }
  };

  const handleQuickStatusChange = async (
    chapter: Chapter,
    newStatus: "pending" | "in_progress" | "completed"
  ) => {
    try {
      let pct = 0;
      if (newStatus === "completed") pct = 100;
      else if (newStatus === "in_progress") pct = 50;

      await api.syllabus.update(chapter.id, {
        status: newStatus,
        progressPercentage: pct,
        studentId: selectedStudentId || undefined,
      });
      fetchChapters();
    } catch (err: any) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await api.syllabus.delete(id);
      setStatusMsg({ type: "success", text: "Chapter deleted successfully." });
      fetchChapters();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to delete chapter." });
    }
  };

  // Add Subject (French, Sanskrit, etc.)
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.code) {
      setStatusMsg({ type: "error", text: "Subject name and code are required." });
      return;
    }

    try {
      setSavingSubject(true);
      await api.academic.createSubject({
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        description: subjectForm.description.trim() || undefined,
      });

      setStatusMsg({ type: "success", text: `Subject "${subjectForm.name}" created successfully!` });
      setIsSubjectModalOpen(false);
      setSubjectForm({ name: "", code: "", description: "" });

      // Refresh subjects
      const subRes = await api.academic.subjects();
      setSubjects(subRes.subjects || []);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to create subject." });
    } finally {
      setSavingSubject(false);
    }
  };

  // Allot Staff to Subject
  const handleAllotStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacherId || !assignForm.batchId || !assignForm.subjectId) {
      setStatusMsg({ type: "error", text: "Please select faculty, batch, and subject." });
      return;
    }

    try {
      setSavingAssign(true);
      await api.teachers.assign({
        teacherId: assignForm.teacherId,
        batchId: assignForm.batchId,
        subjectId: assignForm.subjectId,
        isClassTeacher: assignForm.isClassTeacher,
      });

      setStatusMsg({ type: "success", text: "Faculty allocated to subject successfully!" });
      setIsAssignModalOpen(false);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to allocate faculty." });
    } finally {
      setSavingAssign(false);
    }
  };

  // Filtered chapters
  const filtered = chapters.filter((c) => {
    const matchesSubject = selectedSubjectFilter === "all" || c.subjectId === selectedSubjectFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSubject && matchesStatus;
  });

  const completedCount = chapters.filter((c) => c.status === "completed").length;
  const inProgressCount = chapters.filter((c) => c.status === "in_progress").length;
  const pendingCount = chapters.filter((c) => c.status === "pending").length;

  const currentStudentName = students.find((s) => s.id === selectedStudentId)?.fullName;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Alert Banner */}
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
              Institute Curriculum
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Portion Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Portion Completion & Syllabus
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Add subjects (e.g. French, Sanskrit), define chapters, allocate faculty, and track student-specific completion status.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSubjectForm({ name: "", code: "", description: "" });
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>+ Add Subject</span>
          </button>

          <button
            onClick={() => {
              setAssignForm({
                teacherId: teachers[0]?.id || "",
                batchId: selectedBatchId,
                subjectId: subjects[0]?.id || "",
                isClassTeacher: false,
              });
              setIsAssignModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Allot Staff to Subject</span>
          </button>

          <button
            onClick={handleOpenAddChapter}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Chapter</span>
          </button>
        </div>
      </div>

      {/* Cohort & Student Selection Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Batch Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Academic Cohort / Batch
          </label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Student Selector (Specific Child Tracking) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Student Filter (Specific Child)
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Students (Cohort Master Template)</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName} ({st.admissionNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Active Context Badge */}
        <div className="flex items-center p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {selectedStudentId ? "Individual Progress Mode" : "Cohort Master Mode"}
            </div>
            <div className="font-bold text-slate-800 mt-0.5">
              {selectedStudentId ? `Tracking: ${currentStudentName}` : "Batch-wide Curriculum Blueprint"}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Chapters</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{chapters.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{completedCount}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 shadow-xs">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-xs">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Not Yet Started</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* Chapters & Curriculum Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Subject Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSubjectFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedSubjectFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedSubjectFilter === sub.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({chapters.length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === "completed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === "in_progress" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>
        </div>

        {/* Chapters Grid */}
        {loading ? (
          <BouncingLoader text="Loading syllabus tracker & curriculum units..." color="indigo" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No chapters found for this criteria</p>
            <p className="text-xs text-slate-400 mt-1">Use "+ Add Chapter" to create units for this cohort or child.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((ch) => (
              <div
                key={ch.id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {ch.subjectName || ch.subjectCode}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{ch.chapterNumber}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{ch.chapterTitle}</h3>

                  {ch.notes && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                      "{ch.notes}"
                    </p>
                  )}

                  {ch.targetCompletionDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target Date: {ch.targetCompletionDate}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-500">Completion</span>
                      <span className="font-bold text-slate-700">{ch.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          ch.status === "completed"
                            ? "bg-emerald-500"
                            : ch.status === "in_progress"
                            ? "bg-blue-500"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${ch.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Switcher & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickStatusChange(ch, "pending")}
                      title="Mark Pending"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        ch.status === "pending"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleQuickStatusChange(ch, "in_progress")}
                      title="Mark In Progress"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        ch.status === "in_progress"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleQuickStatusChange(ch, "completed")}
                      title="Mark Completed"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        ch.status === "completed"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Completed
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditChapter(ch)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Chapter"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD / EDIT CHAPTER ── */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingChapterId ? "Edit Curriculum Chapter" : "Add Curriculum Chapter"}
              </h3>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    value={chapterForm.subjectId}
                    onChange={(e) => setChapterForm({ ...chapterForm, subjectId: e.target.value })}
                    required
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Student</label>
                  <select
                    value={chapterForm.studentId}
                    onChange={(e) => setChapterForm({ ...chapterForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">All Students (Batch Master)</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter / Unit #</label>
                  <input
                    type="text"
                    value={chapterForm.chapterNumber}
                    onChange={(e) => setChapterForm({ ...chapterForm, chapterNumber: e.target.value })}
                    placeholder="e.g. Chapter 1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={chapterForm.targetCompletionDate}
                    onChange={(e) => setChapterForm({ ...chapterForm, targetCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={chapterForm.chapterTitle}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapterTitle: e.target.value })}
                  placeholder="e.g. Les Salutations et Grammaire de Base"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={chapterForm.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as "pending" | "in_progress" | "completed";
                      let pct = chapterForm.progressPercentage;
                      if (newStatus === "completed") pct = 100;
                      else if (newStatus === "pending") pct = 0;
                      else if (pct === 0 || pct === 100) pct = 50;
                      setChapterForm({ ...chapterForm, status: newStatus, progressPercentage: pct });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="pending">Pending (Not Started)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Progress Percentage ({chapterForm.progressPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={chapterForm.progressPercentage}
                    onChange={(e) => setChapterForm({ ...chapterForm, progressPercentage: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={chapterForm.notes}
                  onChange={(e) => setChapterForm({ ...chapterForm, notes: e.target.value })}
                  placeholder="Key concepts covered, assignment details, or remarks..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingChapter ? "Saving..." : "Save Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD SUBJECT (French, Sanskrit, etc.) ── */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Add New Subject</h3>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              {/* Quick Presets */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: "French", code: "FRE", description: "French Language & Literature" },
                    { name: "Sanskrit", code: "SKT", description: "Sanskrit Language & Grammar" },
                    { name: "Computer Science", code: "CS", description: "Computer Science & IT" },
                    { name: "Economics", code: "ECO", description: "Economics & Development" },
                    { name: "Psychology", code: "PSY", description: "Psychology & Behavioral Studies" },
                    { name: "Business Studies", code: "BST", description: "Principles of Business & Management" },
                  ].map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setSubjectForm(p)}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. French, Sanskrit, German, Computer Science"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FRE, SAN, GER, CS"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Optional details or curriculum board guidelines..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingSubject ? "Creating..." : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ALLOT STAFF TO SUBJECT ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Allot Faculty to Subject</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllotStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Faculty *</label>
                <select
                  required
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select Faculty Member</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Batch *</label>
                <select
                  required
                  value={assignForm.batchId}
                  onChange={(e) => setAssignForm({ ...assignForm, batchId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Subject *</label>
                <select
                  required
                  value={assignForm.subjectId}
                  onChange={(e) => setAssignForm({ ...assignForm, subjectId: e.target.value })}
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="classTeacherCheck"
                  checked={assignForm.isClassTeacher}
                  onChange={(e) => setAssignForm({ ...assignForm, isClassTeacher: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="classTeacherCheck" className="text-xs font-medium text-slate-700">
                  Assign as Class Teacher for this batch
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAssign}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingAssign ? "Allotting..." : "Allot Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

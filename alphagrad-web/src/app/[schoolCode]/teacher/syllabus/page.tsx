"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  BookOpen,
  Edit2,
  Trash2,
  X,
  FileText,
  UserCheck,
  Users,
  AlertCircle,
  Sparkles,
  TrendingUp
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
  completedAt: number | null;
  notes: string | null;
}

export default function TeacherSyllabusPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allottedSubjectIds, setAllottedSubjectIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Selection states
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subjectId: "",
    studentId: "",
    chapterNumber: "Chapter 1",
    chapterTitle: "",
    status: "pending" as "pending" | "in_progress" | "completed",
    progressPercentage: 0,
    targetCompletionDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch batches, subjects, and teacher assignments
  useEffect(() => {
    async function loadMeta() {
      try {
        const [batchesRes, subjectsRes] = await Promise.all([
          api.academic.batches(),
          api.academic.subjects(),
        ]);
        const bList = batchesRes.batches || [];
        const sList = subjectsRes.subjects || [];

        // Fetch teacher's allotted subjects and assigned batches if teacherId exists
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
            if (allotted.size > 0) {
              const firstAllotted = sList.find((s: Subject) => allotted.has(s.id));
              if (firstAllotted) setSelectedSubjectId(firstAllotted.id);
            }
          } catch (e) {
            console.error("Could not load teacher assignments:", e);
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

  // When selected batch changes, fetch enrolled students
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
        if (list.length > 0 && !selectedStudentId) {
          setSelectedStudentId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    }
    loadStudents();
  }, [selectedBatchId]);

  // Fetch chapters for selected batch & student
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

  const handleOpenAddModal = () => {
    setEditingChapterId(null);
    const defaultSubject =
      selectedSubjectId !== "all" ? selectedSubjectId : subjects[0]?.id || "";

    setFormData({
      subjectId: defaultSubject,
      studentId: selectedStudentId || "",
      chapterNumber: `Chapter ${chapters.length + 1}`,
      chapterTitle: "",
      status: "pending",
      progressPercentage: 0,
      targetCompletionDate: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setFormData({
      subjectId: chapter.subjectId,
      studentId: chapter.studentId || selectedStudentId || "",
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      status: chapter.status,
      progressPercentage: chapter.progressPercentage,
      targetCompletionDate: chapter.targetCompletionDate || "",
      notes: chapter.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.chapterTitle) {
      setStatusMsg({ type: "error", text: "Please enter both subject and chapter title." });
      return;
    }

    try {
      setSaving(true);
      if (editingChapterId) {
        await api.syllabus.update(editingChapterId, {
          ...formData,
          studentId: selectedStudentId || undefined,
        });
        setStatusMsg({ type: "success", text: "Student chapter progress updated successfully!" });
      } else {
        await api.syllabus.create({
          batchId: selectedBatchId,
          ...formData,
          studentId: selectedStudentId || undefined,
        });
        setStatusMsg({ type: "success", text: "Chapter added to student syllabus successfully!" });
      }

      setIsModalOpen(false);
      fetchChapters();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save chapter." });
    } finally {
      setSaving(false);
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
    } catch (err) {
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

  // Filter chapters by Subject and Status
  const filteredChapters = chapters.filter((ch) => {
    const matchesSubject = selectedSubjectId === "all" || ch.subjectId === selectedSubjectId;
    const matchesStatus = statusFilter === "all" || ch.status === statusFilter;
    return matchesSubject && matchesStatus;
  });

  const totalCount = filteredChapters.length;
  const completedCount = filteredChapters.filter((c) => c.status === "completed").length;
  const inProgressCount = filteredChapters.filter((c) => c.status === "in_progress").length;
  const pendingCount = filteredChapters.filter((c) => c.status === "pending").length;
  const overallPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
              Faculty Dashboard
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Student Portion Tracker</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Student Portion & Syllabus Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Select a student and subject to monitor individual completion, update chapter progress, and log notes.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Chapter</span>
        </button>
      </div>

      {/* 3-Step Selection Ribbon: Batch -> Student -> Subject */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Step 1: Batch */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            1. Select Batch
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

        {/* Step 2: Student */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            2. Select Student (Child)
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Students (Batch Master)</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName} ({st.admissionNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Subject */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            3. Select Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">All Subjects</option>
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
      </div>

      {/* Active Student Card & Overall Progress */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {currentStudent ? currentStudent.fullName.charAt(0) : "★"}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              {currentStudent ? "Individual Student Tracking" : "Cohort Overview"}
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {currentStudent ? currentStudent.fullName : "All Cohort Students"}
            </h2>
            <p className="text-xs text-slate-500">
              {currentStudent
                ? `Admission: ${currentStudent.admissionNumber} • Batch: ${batches.find((b) => b.id === selectedBatchId)?.name || ""}`
                : "Displaying baseline curriculum chapters across the cohort."}
            </p>
          </div>
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-5">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Portion Covered</div>
            <div className="text-2xl font-black text-indigo-600">{overallPercentage}%</div>
          </div>
          <div className="w-28 bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Chapters</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
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

      {/* Chapters Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Chapters & Curriculum Topics</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click status badges to immediately update this child's portion completion.
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "completed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "in_progress" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>
        </div>

        {/* Chapters Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No chapters recorded for this selection</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Add Chapter" to record topics for {currentStudent?.fullName || "this cohort"}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChapters.map((ch) => (
              <div
                key={ch.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {ch.subjectName || ch.subjectCode}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{ch.chapterNumber}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mt-2">{ch.chapterTitle}</h4>

                  {ch.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                      "{ch.notes}"
                    </p>
                  )}

                  {ch.targetCompletionDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: {ch.targetCompletionDate}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-500">Student Progress</span>
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
                      onClick={() => handleOpenEditModal(ch)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Details"
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

      {/* ── MODAL: ADD / EDIT CHAPTER ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingChapterId ? "Update Student Chapter Progress" : "Add Chapter to Portion Tracker"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
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
                    value={formData.chapterNumber}
                    onChange={(e) => setFormData({ ...formData, chapterNumber: e.target.value })}
                    placeholder="e.g. Chapter 1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={formData.targetCompletionDate}
                    onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={formData.chapterTitle}
                  onChange={(e) => setFormData({ ...formData, chapterTitle: e.target.value })}
                  placeholder="e.g. Kinematics & Relative Velocity"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as "pending" | "in_progress" | "completed";
                      let pct = formData.progressPercentage;
                      if (newStatus === "completed") pct = 100;
                      else if (newStatus === "pending") pct = 0;
                      else if (pct === 0 || pct === 100) pct = 50;
                      setFormData({ ...formData, status: newStatus, progressPercentage: pct });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="pending">Pending (Not Yet Started)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Progress Percentage ({formData.progressPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progressPercentage}
                    onChange={(e) => setFormData({ ...formData, progressPercentage: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Remarks / Notes for Student</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes on student understanding, weak points, or revision tips..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

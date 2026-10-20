"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Users,
  BookOpen,
  CalendarCheck,
  MessageSquareQuote,
  LifeBuoy,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  CheckCircle,
  Circle,
  Award,
  ListTodo,
  Plus,
  X,
  ExternalLink,
  GraduationCap
} from "lucide-react";

interface Assignment {
  id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isClassTeacher: number;
}

interface StudentItem {
  id: string;
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  username: string;
  batchId?: string;
  targetExam?: string;
}

interface Batch {
  id: string;
  name: string;
  code: string;
  className?: string;
  enrolledCount?: number;
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down states: Batch -> Student -> Details
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [batchStudents, setBatchStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [studentTab, setStudentTab] = useState<"syllabus" | "attendance" | "assessments" | "tasks">("syllabus");

  // Student specific data
  const [studentSyllabus, setStudentSyllabus] = useState<{ summary?: any; subjects?: any[]; chapters?: any[] }>({});
  const [studentAttendance, setStudentAttendance] = useState<{ summary?: any; records?: any[] }>({});
  const [studentAssessments, setStudentAssessments] = useState<{ summary?: any; assessments?: any[] }>({});
  const [studentTasks, setStudentTasks] = useState<any[]>([]);
  const [loadingStudentData, setLoadingStudentData] = useState(false);

  // Teacher's own assigned tasks from admin
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loadingMyTasks, setLoadingMyTasks] = useState(false);

  // Fast inline actions
  const [newStudentTaskTitle, setNewStudentTaskTitle] = useState("");
  const [newStudentTaskDue, setNewStudentTaskDue] = useState("");
  const [newStudentTaskPriority, setNewStudentTaskPriority] = useState<"urgent" | "high" | "normal" | "low">("normal");
  const [assigningTask, setAssigningTask] = useState(false);

  // Fast grading entry
  const [quickMarkTitle, setQuickMarkTitle] = useState("");
  const [quickMarkSubjectId, setQuickMarkSubjectId] = useState("");
  const [quickMarkMax, setQuickMarkMax] = useState<number>(50);
  const [quickMarkObtained, setQuickMarkObtained] = useState<number>(40);
  const [quickMarkRemarks, setQuickMarkRemarks] = useState("");
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Fast chapter creation modal
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterSubjectId, setNewChapterSubjectId] = useState("");
  const [newChapterNumber, setNewChapterNumber] = useState<number>(1);
  const [submittingChapter, setSubmittingChapter] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Initial Load: Fetch assignments & batches
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        let teacherAssignments: Assignment[] = [];

        if (user?.teacherId) {
          try {
            const res = await api.teachers.getAssignments(user.teacherId);
            teacherAssignments = res.assignments || [];
          } catch (e) {
            console.warn("Failed to get assignments by teacherId:", e);
          }
        }

        // Fetch batches (already scoped by teacher assignments on backend)
        const bRes = await api.academic.batches();
        const serverBatches = bRes.batches || [];

        // If teacher has active assignments, strictly constrain batches to those assignments
        let effectiveBatches: Batch[] = [];
        if (teacherAssignments.length > 0) {
          const assignedBatchIds = new Set(teacherAssignments.map((a) => a.batchId));
          const matchedServerBatches = serverBatches.filter((b) => assignedBatchIds.has(b.id));
          if (matchedServerBatches.length > 0) {
            effectiveBatches = matchedServerBatches;
          } else {
            const seen = new Set<string>();
            effectiveBatches = teacherAssignments
              .filter((a) => {
                if (seen.has(a.batchId)) return false;
                seen.add(a.batchId);
                return true;
              })
              .map((a) => ({
                id: a.batchId,
                name: a.batchName,
                code: a.batchCode,
                className: a.batchName,
              }));
          }
        } else {
          effectiveBatches = serverBatches;
        }

        setBatches(effectiveBatches);
        setAssignments(teacherAssignments);

        // Pre-select first batch if available
        if (effectiveBatches.length > 0) {
          setSelectedBatchId(effectiveBatches[0].id);
        } else if (teacherAssignments.length > 0) {
          setSelectedBatchId(teacherAssignments[0].batchId);
        }
      } catch (err) {
        console.error("Failed to load teacher portal data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // 2. Load Teacher's Own Assigned Tasks (From Admin)
  useEffect(() => {
    const fetchTeacherTasks = async () => {
      try {
        setLoadingMyTasks(true);
        const res = await api.tasks.list({
          assignedToType: "teacher",
          assignedToId: user?.teacherId || undefined,
        });
        setMyTasks(res.tasks || []);
      } catch (err) {
        console.error("Failed to load teacher tasks:", err);
      } finally {
        setLoadingMyTasks(false);
      }
    };

    fetchTeacherTasks();
  }, [user]);

  // 3. Drill-down Step 2: Load students for selected batch
  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        setSelectedStudent(null); // Reset selected student when batch changes
        const res = await api.students.list({ batchId: selectedBatchId });
        const list = res.students || [];
        setBatchStudents(list);

        // If list is not empty, auto-select the first student for instant preview
        if (list.length > 0) {
          setSelectedStudent(list[0]);
        }
      } catch (err) {
        console.error("Failed to load batch students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedBatchId]);

  // 4. Drill-down Step 3: Load student specific details when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setStudentSyllabus({});
      setStudentAttendance({});
      setStudentAssessments({});
      setStudentTasks([]);
      return;
    }

    const fetchStudentData = async () => {
      setLoadingStudentData(true);
      try {
        const [sylRes, attRes, assRes, tskRes] = await Promise.all([
          api.syllabus.student(selectedStudent.id).catch(() => ({ summary: null, subjects: [], chapters: [] })),
          api.attendance.studentSummary(selectedStudent.id).catch(() => ({ summary: null, records: [] })),
          api.assessments.student(selectedStudent.id).catch(() => ({ summary: null, assessments: [] })),
          api.tasks.list({ assignedToType: "student", assignedToId: selectedStudent.id }).catch(() => ({ tasks: [] })),
        ]);

        setStudentSyllabus(sylRes || {});
        setStudentAttendance(attRes || {});
        setStudentAssessments(assRes || {});
        setStudentTasks(tskRes.tasks || []);

        if (sylRes?.subjects && sylRes.subjects.length > 0) {
          setQuickMarkSubjectId(sylRes.subjects[0].id || sylRes.subjects[0].subjectId || "");
          setNewChapterSubjectId(sylRes.subjects[0].id || sylRes.subjects[0].subjectId || "");
        }
      } catch (err) {
        console.error("Failed to fetch detailed student dossier:", err);
      } finally {
        setLoadingStudentData(false);
      }
    };

    fetchStudentData();
  }, [selectedStudent]);

  // Handlers
  const handleUpdateChapterStatus = async (chapterId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : currentStatus === "in_progress" ? "completed" : "in_progress";
    try {
      await api.syllabus.update(chapterId, {
        status: nextStatus,
        completionDate: nextStatus === "completed" ? new Date().toISOString() : null,
      });

      // Update state locally
      setStudentSyllabus((prev) => {
        const updatedChapters = (prev.chapters || []).map((ch: any) =>
          ch.id === chapterId ? { ...ch, status: nextStatus } : ch
        );
        const comp = updatedChapters.filter((c: any) => c.status === "completed").length;
        const inProg = updatedChapters.filter((c: any) => c.status === "in_progress").length;
        const total = updatedChapters.length;
        return {
          ...prev,
          chapters: updatedChapters,
          summary: {
            ...prev.summary,
            completedChapters: comp,
            inProgressChapters: inProg,
            completionPercentage: total > 0 ? Math.round((comp / total) * 100) : 0,
          },
        };
      });

      showToast(`Chapter status updated to: ${nextStatus.replace("_", " ").toUpperCase()}`);
    } catch (err: any) {
      alert(`Failed to update chapter: ${err?.message || "Server error"}`);
    }
  };

  const handleToggleMyTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await api.tasks.update(taskId, { status: newStatus });
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      showToast(newStatus === "completed" ? "Task marked as Completed!" : "Task marked as Pending");
    } catch (err: any) {
      alert(`Failed to update task: ${err?.message || "Server error"}`);
    }
  };

  const handleCreateStudentTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newStudentTaskTitle.trim()) return;

    setAssigningTask(true);
    try {
      const res = await api.tasks.create({
        title: newStudentTaskTitle.trim(),
        assignedToType: "student",
        assignedToId: selectedStudent.id,
        priority: newStudentTaskPriority,
        dueDate: newStudentTaskDue ? new Date(newStudentTaskDue).toISOString() : null,
        batchId: selectedBatchId || undefined,
      });

      setStudentTasks((prev) => [res.task, ...prev]);
      setNewStudentTaskTitle("");
      setNewStudentTaskDue("");
      showToast(`Task assigned to ${selectedStudent.fullName}!`);
    } catch (err: any) {
      alert(`Failed to assign task: ${err?.message || "Server error"}`);
    } finally {
      setAssigningTask(false);
    }
  };

  const handleQuickGradeStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !quickMarkTitle.trim() || !quickMarkSubjectId) {
      alert("Please provide test title and subject.");
      return;
    }

    setSubmittingGrade(true);
    try {
      await api.assessments.createStudentMark({
        studentId: selectedStudent.id,
        batchId: selectedBatchId || selectedStudent.batchId,
        assessmentDate: new Date().toISOString().split("T")[0],
        subjectId: quickMarkSubjectId,
        title: quickMarkTitle.trim(),
        maxMarks: Number(quickMarkMax),
        marksObtained: Number(quickMarkObtained),
        remarks: quickMarkRemarks.trim() || undefined,
      });

      // Reload student assessments
      const assRes = await api.assessments.student(selectedStudent.id);
      setStudentAssessments(assRes);
      setQuickMarkTitle("");
      setQuickMarkRemarks("");
      showToast(`Assessment recorded for ${selectedStudent.fullName}!`);
    } catch (err: any) {
      alert(`Failed to record grade: ${err?.message || "Server error"}`);
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !newChapterSubjectId || !selectedBatchId) return;

    setSubmittingChapter(true);
    try {
      const res = await api.syllabus.create({
        batchId: selectedBatchId,
        subjectId: newChapterSubjectId,
        title: newChapterTitle.trim(),
        chapterNumber: Number(newChapterNumber) || 1,
        studentId: selectedStudent?.id || undefined,
      });

      if (selectedStudent) {
        const sylRes = await api.syllabus.student(selectedStudent.id);
        setStudentSyllabus(sylRes);
      }
      setShowAddChapterModal(false);
      setNewChapterTitle("");
      showToast("Chapter added successfully!");
    } catch (err: any) {
      alert(`Failed to add chapter: ${err?.message || "Server error"}`);
    } finally {
      setSubmittingChapter(false);
    }
  };

  const filteredStudents = batchStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedBatchInfo = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 -skew-x-12 transform origin-top pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{batches.length} Assigned {batches.length === 1 ? "Batch" : "Batches"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Classroom & Individual Student Navigator
          </h1>
          <p className="text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
            Select your assigned batch to inspect individual students. Track syllabus chapter progress, review attendance, grade monthly assessments, and allocate actionable tasks.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition shadow-sm"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Cohort Roll Call</span>
            </Link>
            <Link
              href="/teacher/syllabus"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-700/70 hover:bg-emerald-700 text-white text-xs font-bold transition border border-emerald-400/30"
            >
              <BookOpen className="w-4 h-4" />
              <span>Full Syllabus Matrix</span>
            </Link>
            <Link
              href="/teacher/assessments"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-700/70 hover:bg-teal-700 text-white text-xs font-bold transition border border-teal-400/30"
            >
              <Award className="w-4 h-4" />
              <span>Assessments & Grading</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Assigned Tasks to Faculty (High Priority Accountability Bar) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tasks Assigned to You (Faculty)</h2>
              <p className="text-[11px] text-slate-500">Action items and directives allocated by the Principal / Administration.</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {myTasks.filter((t) => t.status !== "completed").length} Pending Directives
          </span>
        </div>

        {loadingMyTasks ? (
          <div className="py-4 text-center text-xs text-slate-400">Loading your assigned directives...</div>
        ) : myTasks.length === 0 ? (
          <div className="py-3 px-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-center justify-between">
            <span>No pending directives from administration. You are all caught up!</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleMyTask(task.id, task.status)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  task.status === "completed"
                    ? "bg-slate-50/70 border-slate-200 opacity-60"
                    : "bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-300 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition ${
                      task.status === "completed"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 hover:border-indigo-600"
                    }`}
                  >
                    {task.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <h4 className={`text-xs font-semibold ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      {task.dueDate && (
                        <span>Due: {new Date(task.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      )}
                      <span className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[9px] ${
                        task.priority === "urgent" || task.priority === "high"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {task.priority || "normal"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN HIERARCHY DRILL-DOWN:
          Step 1: Batches -> Step 2: Students in Batch -> Step 3: Student Dossier */}
      <div className="space-y-4">
        {/* Step 1: Batch Selector Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Step 1: Select Batch
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">Teaching Batches Assigned</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{batches.length} Assigned {batches.length === 1 ? "Batch" : "Batches"}</span>
          </div>

          {batches.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-sm font-bold text-slate-700">No Teaching Batches Assigned</p>
              <p className="text-xs text-slate-500 mt-1">You currently have no batches assigned to your faculty profile. Please contact the administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {batches.map((batch) => {
                const isSelected = selectedBatchId === batch.id;
                const isAssigned = assignments.some((a) => a.batchId === batch.id);

                return (
                  <button
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`p-3.5 rounded-xl border text-left transition relative ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {batch.code}
                      </span>
                      {isAssigned && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? "bg-emerald-500 text-white" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          Assigned
                        </span>
                      )}
                    </div>
                    <h3 className={`font-bold text-xs mt-2 truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {batch.name}
                    </h3>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-emerald-100" : "text-slate-500"}`}>
                      {batch.className || "Proventus Batch"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2-Column Split: Left = Step 2 (Students Roster) | Right = Step 3 (Student Dossier) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Student Roster in Selected Batch (Step 2) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Step 2: Pick Student
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-1">
                  {selectedBatchInfo?.name || "Selected Batch"} Roster
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                {batchStudents.length} Students
              </span>
            </div>

            {/* Student Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student by name or roll..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            {/* Students List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading student roster...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                  No students enrolled in this batch yet.
                </div>
              ) : (
                filteredStudents.map((stu) => {
                  const isSelected = selectedStudent?.id === stu.id;
                  return (
                    <button
                      key={stu.id}
                      onClick={() => setSelectedStudent(stu)}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-400 shadow-sm ring-1 ring-emerald-400/40"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                        }`}>
                          {stu.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? "text-emerald-950" : "text-slate-900"}`}>
                            {stu.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {stu.admissionNumber} {stu.rollNumber ? `• Roll: ${stu.rollNumber}` : ""}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Step 3 (Individual Student Dossier - Subjects, Chapters, Attendance, Reports, Tasks) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            {selectedStudent ? (
              <>
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900">{selectedStudent.fullName}</h2>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                          {selectedStudent.username}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Admission #{selectedStudent.admissionNumber} • Batch: {selectedBatchInfo?.name || "General"}
                        {selectedStudent.targetExam ? ` • Target: ${selectedStudent.targetExam}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <button
                      onClick={() => setStudentTab("syllabus")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        studentTab === "syllabus" ? "bg-white text-emerald-800 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Portion & Chapters
                    </button>
                    <button
                      onClick={() => setStudentTab("attendance")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        studentTab === "attendance" ? "bg-white text-emerald-800 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => setStudentTab("assessments")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        studentTab === "assessments" ? "bg-white text-emerald-800 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Assessments
                    </button>
                    <button
                      onClick={() => setStudentTab("tasks")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        studentTab === "tasks" ? "bg-white text-emerald-800 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tasks ({studentTasks.filter((t) => t.status !== "completed").length})
                    </button>
                  </div>
                </div>

                {/* Loading indicator for student data */}
                {loadingStudentData ? (
                  <div className="py-16 text-center text-xs text-slate-400">Loading student records...</div>
                ) : (
                  <div>
                    {/* TAB 1: SYLLABUS & CHAPTERS */}
                    {studentTab === "syllabus" && (
                      <div className="space-y-4">
                        {/* Progress Header */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Portion Completion Status
                            </span>
                            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                              {studentSyllabus.summary?.completedChapters || 0} of {studentSyllabus.chapters?.length || 0} Chapters Completed
                            </div>
                            <div className="text-xs text-slate-500">
                              {studentSyllabus.summary?.inProgressChapters || 0} currently in progress
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${studentSyllabus.summary?.completionPercentage || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-emerald-700">
                              {studentSyllabus.summary?.completionPercentage || 0}%
                            </span>
                            <button
                              onClick={() => setShowAddChapterModal(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Chapter</span>
                            </button>
                          </div>
                        </div>

                        {/* Subject Sections */}
                        {studentSyllabus.subjects && studentSyllabus.subjects.length > 0 ? (
                          <div className="space-y-4">
                            {studentSyllabus.subjects.map((sub: any) => {
                              const currentSubId = sub.id || sub.subjectId;
                              const subChapters = (studentSyllabus.chapters || []).filter(
                                (c: any) => c.subjectId === currentSubId
                              );
                              const subCompleted = subChapters.filter((c: any) => c.status === "completed").length;

                              return (
                                <div key={currentSubId} className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-800">{sub.name || sub.subjectName || "Subject"}</span>
                                      {(sub.code || sub.subjectCode) && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-slate-600 rounded border border-slate-200 font-semibold">
                                          {sub.code || sub.subjectCode}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600">
                                      {subCompleted}/{subChapters.length} Completed
                                    </span>
                                  </div>

                                  <div className="divide-y divide-slate-100">
                                    {subChapters.length === 0 ? (
                                      <div className="p-3 text-xs text-slate-400 italic">No chapters configured yet for this subject.</div>
                                    ) : (
                                      subChapters.map((ch: any) => (
                                        <div
                                          key={ch.id}
                                          className="p-3 hover:bg-slate-50/60 transition flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 text-slate-400 font-mono text-[11px] font-bold">
                                              #{ch.chapterNumber}
                                            </span>
                                            <div>
                                              <div className="font-semibold text-slate-900">{ch.title}</div>
                                              {ch.completionDate && (
                                                <div className="text-[10px] text-emerald-600">
                                                  Completed on: {new Date(ch.completionDate).toLocaleDateString("en-IN")}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleUpdateChapterStatus(ch.id, ch.status)}
                                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                                                ch.status === "completed"
                                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200"
                                                  : ch.status === "in_progress"
                                                  ? "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200"
                                                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                              }`}
                                            >
                                              {ch.status === "completed" && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                              {ch.status === "in_progress" && <Clock className="w-3 h-3 text-amber-600" />}
                                              {ch.status === "pending" && <Circle className="w-3 h-3 text-slate-400" />}
                                              <span>{ch.status.replace("_", " ")}</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                            No subjects registered for this cohort yet.
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: ATTENDANCE */}
                    {studentTab === "attendance" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Attendance Rate</span>
                            <div className="text-2xl font-black text-emerald-800 mt-1">
                              {studentAttendance.summary?.attendancePercentage || 0}%
                            </div>
                            <span className="text-[11px] text-emerald-600">Overall Presence</span>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Days Attended</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                              {studentAttendance.summary?.presentDays || 0}
                            </div>
                            <span className="text-[11px] text-slate-500">Present Sessions</span>
                          </div>

                          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                            <span className="text-[10px] font-bold text-red-600 uppercase">Absences</span>
                            <div className="text-2xl font-black text-red-700 mt-1">
                              {studentAttendance.summary?.absentDays || 0}
                            </div>
                            <span className="text-[11px] text-red-500">Recorded Absent</span>
                          </div>
                        </div>

                        {/* Recent Attendance Records */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
                            Recent Attendance Records
                          </div>
                          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                            {studentAttendance.records && studentAttendance.records.length > 0 ? (
                              studentAttendance.records.map((rec: any, idx: number) => (
                                <div key={idx} className="p-3 text-xs flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-semibold text-slate-900">
                                      {new Date(rec.sessionDate).toLocaleDateString("en-IN", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    rec.status === "present"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}>
                                    {rec.status}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center text-xs text-slate-400">
                                No attendance records recorded for this student yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <Link
                            href={`/teacher/attendance?batchId=${selectedBatchId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            <span>Open Batch Attendance Sheet</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: ASSESSMENTS & GRADING */}
                    {studentTab === "assessments" && (
                      <div className="space-y-4">
                        {/* Quick Grade Recording Form */}
                        <form onSubmit={handleQuickGradeStudent} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">Direct Assessment Entry for {selectedStudent.fullName}</span>
                            <span className="text-[10px] text-slate-400">Record unit tests, quizzes, and term reports</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assessment Title *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Unit Test 1 - Algebra"
                                value={quickMarkTitle}
                                onChange={(e) => setQuickMarkTitle(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subject *</label>
                              <select
                                required
                                value={quickMarkSubjectId}
                                onChange={(e) => setQuickMarkSubjectId(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              >
                                {studentSyllabus.subjects?.map((sub: any) => {
                                  const subId = sub.id || sub.subjectId;
                                  const subName = sub.name || sub.subjectName || "Subject";
                                  const subCode = sub.code || sub.subjectCode || "";
                                  return (
                                    <option key={subId} value={subId}>
                                      {subName} {subCode ? `(${subCode})` : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max Marks</label>
                                <input
                                  type="number"
                                  value={quickMarkMax}
                                  onChange={(e) => setQuickMarkMax(Number(e.target.value))}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Score Obtained</label>
                                <input
                                  type="number"
                                  value={quickMarkObtained}
                                  onChange={(e) => setQuickMarkObtained(Number(e.target.value))}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-emerald-800"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Optional remarks (e.g. Excellent conceptual grasp, needs geometry practice)"
                              value={quickMarkRemarks}
                              onChange={(e) => setQuickMarkRemarks(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                            <button
                              type="submit"
                              disabled={submittingGrade}
                              className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {submittingGrade ? "Saving..." : "Record Score"}
                            </button>
                          </div>
                        </form>

                        {/* Assessment History Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800">
                            Assessment Report Card
                          </div>
                          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {studentAssessments.assessments && studentAssessments.assessments.length > 0 ? (
                              studentAssessments.assessments.map((ass: any) => (
                                <div key={ass.id} className="p-3 hover:bg-slate-50 transition flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-semibold text-slate-900">{ass.title}</div>
                                    <div className="text-[11px] text-slate-500">
                                      {ass.subjectName} • {ass.assessmentDate ? new Date(ass.assessmentDate).toLocaleDateString("en-IN") : "Recent"}
                                    </div>
                                    {ass.remarks && (
                                      <div className="text-[10px] text-slate-500 italic mt-0.5">Note: {ass.remarks}</div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {ass.marksObtained} / {ass.maxMarks}
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                      {ass.percentage}% {ass.grade ? `(${ass.grade})` : ""}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-xs text-slate-400">
                                No assessment records yet for this student. Use the form above to add one.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: STUDENT TASKS & HOMEWORK */}
                    {studentTab === "tasks" && (
                      <div className="space-y-4">
                        {/* Assign Task Form */}
                        <form onSubmit={handleCreateStudentTask} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="text-xs font-bold text-slate-800">
                            Assign Specific Task to {selectedStudent.fullName}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                required
                                placeholder="Task description (e.g. Complete Sanskrit worksheet #3)"
                                value={newStudentTaskTitle}
                                onChange={(e) => setNewStudentTaskTitle(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                            </div>
                            <div>
                              <input
                                type="date"
                                value={newStudentTaskDue}
                                onChange={(e) => setNewStudentTaskDue(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <select
                                value={newStudentTaskPriority}
                                onChange={(e) => setNewStudentTaskPriority(e.target.value as any)}
                                className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                              >
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                              <button
                                type="submit"
                                disabled={assigningTask}
                                className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                              >
                                {assigningTask ? "Assigning..." : "Assign"}
                              </button>
                            </div>
                          </div>
                        </form>

                        {/* Tasks List */}
                        <div className="space-y-2">
                          {studentTasks.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              No tasks assigned to this student yet.
                            </div>
                          ) : (
                            studentTasks.map((task) => (
                              <div
                                key={task.id}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const nextStatus = task.status === "completed" ? "pending" : "completed";
                                      await api.tasks.update(task.id, { status: nextStatus });
                                      setStudentTasks((prev) =>
                                        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
                                      );
                                      showToast(`Task updated to ${nextStatus}!`);
                                    }}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                      task.status === "completed"
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-slate-300 hover:border-emerald-600"
                                    }`}
                                  >
                                    {task.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                                  </button>
                                  <div>
                                    <div className={`font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
                                      {task.title}
                                    </div>
                                    {task.dueDate && (
                                      <div className="text-[10px] text-slate-400">
                                        Due: {new Date(task.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  task.priority === "urgent" || task.priority === "high"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                  {task.priority || "normal"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No student selected</p>
                <p className="text-xs text-slate-400">Click on any student in the left roster to view their subjects, chapters, and assessment reports.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Chapter Modal */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add New Syllabus Chapter</h3>
                <p className="text-[11px] text-slate-500">For {selectedStudent ? selectedStudent.fullName : selectedBatchInfo?.name}</p>
              </div>
              <button onClick={() => setShowAddChapterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={newChapterSubjectId}
                  onChange={(e) => setNewChapterSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600"
                >
                  {studentSyllabus.subjects?.map((s: any) => {
                    const sId = s.id || s.subjectId;
                    const sName = s.name || s.subjectName || "Subject";
                    const sCode = s.code || s.subjectCode || "";
                    return (
                      <option key={sId} value={sId}>
                        {sName} {sCode ? `(${sCode})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chapter Number *</label>
                <input
                  type="number"
                  required
                  value={newChapterNumber}
                  onChange={(e) => setNewChapterNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Reactions and Equations"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChapter}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submittingChapter ? "Saving..." : "Add Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  CheckSquare,
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Edit2,
  BookOpen,
  Filter,
  Check,
  Flag
} from "lucide-react";
import BouncingLoader from "@/components/BouncingLoader";

interface TaskItem {
  id: string;
  assignedToType: "teacher" | "student";
  assignedToId: string;
  assignedByUserId: string;
  title: string;
  description: string | null;
  batchId: string | null;
  batchName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed";
  completedAt: number | null;
  createdAt: number;
}

interface TeacherOption {
  id: string;
  fullName: string;
  employeeId: string;
}

interface StudentOption {
  id: string;
  fullName: string;
  admissionNumber: string;
}

interface BatchOption {
  id: string;
  name: string;
}

export default function AdminTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Filters
  const [segmentTab, setSegmentTab] = useState<"teacher" | "student">("teacher");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Assign Task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"teacher" | "student">("teacher");
  const [selectedBatchForStudent, setSelectedBatchForStudent] = useState<string>("");

  const [formData, setFormData] = useState({
    assignedToId: "",
    title: "",
    description: "",
    batchId: "",
    subjectId: "",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    status: "pending" as "pending" | "in_progress" | "completed",
  });
  const [saving, setSaving] = useState(false);

  // Load teachers, batches, and tasks
  useEffect(() => {
    async function loadMeta() {
      try {
        const [teachersRes, batchesRes] = await Promise.all([
          api.teachers.list(),
          api.academic.batches(),
        ]);
        const tList = (teachersRes.teachers || []).map((t: any) => ({
          id: t.id,
          fullName: t.fullName,
          employeeId: t.employeeId,
        }));
        setTeachers(tList);
        const bList = batchesRes.batches || [];
        setBatches(bList);
        if (bList.length > 0) setSelectedBatchForStudent(bList[0].id);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // When selectedBatchForStudent changes, fetch students
  useEffect(() => {
    if (!selectedBatchForStudent) return;
    async function loadStudents() {
      try {
        const res = await api.academic.batchStudents(selectedBatchForStudent);
        const stList = (res.students || []).map((s: any) => ({
          id: s.studentId,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
        }));
        setStudents(stList);
      } catch (err) {
        console.error("Failed to load batch students:", err);
      }
    }
    loadStudents();
  }, [selectedBatchForStudent]);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.tasks.list({
        assignedToType: segmentTab,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setTasks(res.tasks || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [segmentTab, statusFilter]);

  const handleOpenAssignModal = (type: "teacher" | "student") => {
    setModalType(type);
    setFormData({
      assignedToId: type === "teacher" ? teachers[0]?.id || "" : students[0]?.id || "",
      title: "",
      description: "",
      batchId: type === "student" ? selectedBatchForStudent : "",
      subjectId: "",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: "medium",
      status: "pending",
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedToId || !formData.title.trim()) {
      setStatusMsg({ type: "error", text: "Please select an assignee and enter a task title." });
      return;
    }

    try {
      setSaving(true);
      await api.tasks.create({
        assignedToType: modalType,
        ...formData,
        batchId: modalType === "student" ? selectedBatchForStudent : undefined,
      });

      setStatusMsg({
        type: "success",
        text: `Task successfully assigned to ${modalType === "teacher" ? "faculty member" : "student"}!`,
      });
      setIsModalOpen(false);
      fetchTasks();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to assign task." });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (task: TaskItem, newStatus: "pending" | "in_progress" | "completed") => {
    try {
      await api.tasks.update(task.id, { status: newStatus });
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.tasks.delete(id);
      setStatusMsg({ type: "success", text: "Task deleted." });
      fetchTasks();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "urgent":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "medium":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
              Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Task Allocations</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Task Management & Accountability
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign and monitor action items for faculty members and enrolled students with deadlines and priority levels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => handleOpenAssignModal("teacher")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-xs"
          >
            <GraduationCap className="w-4 h-4" />
            <span>+ Assign Task to Teacher</span>
          </button>

          <button
            onClick={() => handleOpenAssignModal("student")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>+ Assign Task to Student</span>
          </button>
        </div>
      </div>

      {/* Segment Selector: Faculty Tasks vs Student Tasks */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSegmentTab("teacher")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            segmentTab === "teacher"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Faculty & Staff Tasks</span>
        </button>

        <button
          onClick={() => setSegmentTab("student")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            segmentTab === "student"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Assignments & Tasks</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-xs">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 shadow-xs">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filter and Task Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              Pending ({pendingCount})
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
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "completed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Task Cards */}
        {loading ? (
          <BouncingLoader text="Loading operational tasks & action items..." color="indigo" />
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No tasks found in this segment</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Assign Task" to create action items for {segmentTab === "teacher" ? "teachers" : "students"}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((t) => {
              let assigneeName = "Assigned Member";
              if (t.assignedToType === "teacher") {
                const found = teachers.find((tc) => tc.id === t.assignedToId);
                assigneeName = found ? found.fullName : "Faculty";
              } else {
                const found = students.find((st) => st.id === t.assignedToId);
                assigneeName = found ? found.fullName : "Student";
              }

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getPriorityStyle(t.priority)}`}>
                        {t.priority} Priority
                      </span>

                      {t.dueDate && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due: {t.dueDate}</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{t.title}</h4>

                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                    )}

                    <div className="pt-1 flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-400">Assignee:</span>
                      <span className="font-bold text-slate-800">{assigneeName}</span>
                      {t.batchName && (
                        <span className="text-[11px] text-indigo-600 font-semibold">• {t.batchName}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Toggle & Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStatusToggle(t, "pending")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          t.status === "pending"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleStatusToggle(t, "in_progress")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          t.status === "in_progress"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStatusToggle(t, "completed")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          t.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Completed
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: ASSIGN TASK ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {modalType === "teacher" ? "Assign Task to Faculty Member" : "Assign Task to Student"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              {modalType === "student" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Batch *</label>
                  <select
                    value={selectedBatchForStudent}
                    onChange={(e) => setSelectedBatchForStudent(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalType === "teacher" ? "Select Faculty Member *" : "Select Student *"}
                </label>
                <select
                  required
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Choose Assignee</option>
                  {modalType === "teacher"
                    ? teachers.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.fullName} ({tc.employeeId})
                        </option>
                      ))
                    : students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName} ({st.admissionNumber})
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    modalType === "teacher"
                      ? "e.g. Complete Chapter 3 question bank for Class 10"
                      : "e.g. Solve Science TMA Section B Practice Sheet"
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Instructions</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Specific requirements, deliverables, or guidelines..."
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
                  {saving ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

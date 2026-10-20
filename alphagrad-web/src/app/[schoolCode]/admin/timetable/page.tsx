"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Clock,
  Plus,
  BookOpen,
  GraduationCap,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  Users,
  DoorOpen,
  Layers,
  Sparkles
} from "lucide-react";

interface TimetableSlot {
  id: string;
  batchId: string;
  batchName: string | null;
  subjectId: string;
  subjectName: string | null;
  teacherId: string;
  teacherName: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  createdAt: number;
}

interface BatchOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  id: string;
  fullName: string;
  employeeId: string;
}

const DAYS = [
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
  { id: 6, name: "Saturday", short: "Sat" },
  { id: 7, name: "Sunday", short: "Sun" },
];

export default function AdminTimetablePage() {
  const { user } = useAuth();

  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [weekly, setWeekly] = useState<{ dayName: string; entries: TimetableSlot[] }[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    batchId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:30",
    roomNumber: "Room 101",
  });

  // Load initial options
  useEffect(() => {
    async function loadMeta() {
      try {
        const [batchRes, subjRes, teachRes] = await Promise.all([
          api.academic.batches(),
          api.academic.subjects(),
          api.teachers.list(),
        ]);
        setBatches(batchRes.batches || []);
        setSubjects(subjRes.subjects || []);
        setTeachers(teachRes.teachers || []);
        if (batchRes.batches?.length && !formData.batchId) {
          setFormData((prev) => ({
            ...prev,
            batchId: batchRes.batches[0].id,
            subjectId: subjRes.subjects?.[0]?.id || "",
            teacherId: teachRes.teachers?.[0]?.id || "",
          }));
        }
      } catch (err: any) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // Fetch timetable slots
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedBatch !== "all") params.batchId = selectedBatch;
      if (selectedDay !== "all") params.dayOfWeek = selectedDay;

      const res = await api.timetable.list(params);
      setTimetable(res.timetable || []);
      setWeekly(res.weekly || []);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to load timetable: " + (err?.message || "Unknown error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedBatch, selectedDay]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      batchId: selectedBatch !== "all" ? selectedBatch : batches[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      teacherId: teachers[0]?.id || "",
      dayOfWeek: selectedDay !== "all" ? selectedDay : 1,
      startTime: "09:00",
      endTime: "10:30",
      roomNumber: "Room 101",
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (slot: TimetableSlot) => {
    setEditingId(slot.id);
    setFormData({
      batchId: slot.batchId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNumber: slot.roomNumber || "",
    });
    setIsModalOpen(true);
  };

  // Submit Slot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batchId || !formData.subjectId || !formData.teacherId) {
      setStatusMsg({ type: "error", text: "Please select Batch, Subject, and Faculty." });
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.timetable.update(editingId, {
          batchId: formData.batchId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId,
          dayOfWeek: Number(formData.dayOfWeek),
          startTime: formData.startTime,
          endTime: formData.endTime,
          roomNumber: formData.roomNumber,
        });
        setStatusMsg({ type: "success", text: "Timetable slot updated successfully." });
      } else {
        await api.timetable.create({
          batchId: formData.batchId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId,
          dayOfWeek: Number(formData.dayOfWeek),
          startTime: formData.startTime,
          endTime: formData.endTime,
          roomNumber: formData.roomNumber,
        });
        setStatusMsg({ type: "success", text: "Class schedule slot created successfully." });
      }
      setIsModalOpen(false);
      await fetchTimetable();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Error saving slot: " + (err?.message || "Failed") });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete slot
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this timetable slot?")) return;
    try {
      await api.timetable.delete(id);
      setStatusMsg({ type: "success", text: "Timetable slot removed." });
      await fetchTimetable();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to delete slot: " + (err?.message || "Error") });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Class Timetable & Schedule</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize weekly lecture hours, teacher assignments, and classroom allocations per batch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lecture Slot</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-medium ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Day:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Days (Weekly)</option>
              {DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Slots: <span className="text-indigo-600 font-bold">{timetable.length}</span>
        </div>
      </div>

      {/* Main Schedule Display */}
      {loading ? (
        <div className="min-h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 p-12">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading lecture schedule...</p>
        </div>
      ) : weekly.length === 0 ? (
        <div className="min-h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Timetable Slots Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There are no classes scheduled for the selected filter. Click &ldquo;Add Lecture Slot&rdquo; to schedule a lecture.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Add First Slot
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {weekly.map((dayGroup) => (
            <div key={dayGroup.dayName} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-800">{dayGroup.dayName}</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {dayGroup.entries.length} {dayGroup.entries.length === 1 ? "lecture" : "lectures"}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {dayGroup.entries.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-start md:items-center gap-4">
                      {/* Time pill */}
                      <div className="w-28 shrink-0 flex flex-col items-center justify-center p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-center">
                        <span className="text-xs font-bold text-indigo-700">{slot.startTime}</span>
                        <span className="text-[10px] text-indigo-500 font-medium">to {slot.endTime}</span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{slot.subjectName || "Subject"}</h3>
                          {slot.roomNumber && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <DoorOpen className="w-3 h-3 text-slate-400" />
                              {slot.roomNumber}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {slot.batchName || "All Batches"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                            {slot.teacherName || "Faculty Assigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleOpenEdit(slot)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        title="Edit Slot"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Delete Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingId ? "Edit Lecture Slot" : "Add New Lecture Slot"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Class</label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>Select Batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty / Teacher</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  {DAYS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom / Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. Room 101, Lab B"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {submitting ? "Saving..." : editingId ? "Update Slot" : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

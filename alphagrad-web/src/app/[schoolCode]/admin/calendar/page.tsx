"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Palmtree,
  BookOpen,
  Award,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  List,
  Grid3X3,
  PartyPopper,
  Zap,
  Info
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: "holiday" | "assessment" | "extra_class" | "event";
  subCategory: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: number;
  batchId: string | null;
  batchName?: string | null;
  targetAudience: string;
  color?: string | null;
  location?: string | null;
  isFromAssessmentTable?: boolean;
}

interface BatchOption {
  id: string;
  name: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminCalendarPage() {
  const { user } = useAuth();

  // Current view state (Year & Month)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split("T")[0]);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");

  // Data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    holidaysCount: 0,
    assessmentsCount: 0,
    extraCount: 0,
  });
  const [upcomingHolidays, setUpcomingHolidays] = useState<CalendarEvent[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Add / Edit Event
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "holiday" as "holiday" | "assessment" | "extra_class" | "event",
    subCategory: "",
    startDate: today.toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0],
    isAllDay: true,
    startTime: "09:00",
    endTime: "11:00",
    batchId: "all",
    location: "",
  });

  // Fetch batches
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await api.academic.batches();
        setBatches(res.batches || []);
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    }
    loadBatches();
  }, []);

  // Fetch calendar events
  const loadCalendar = async () => {
    try {
      setLoading(true);
      const res = await api.calendar.list({
        year: currentYear.toString(),
      });
      setEvents(res.events || []);
      setStats(res.stats || {
        totalEvents: 0,
        holidaysCount: 0,
        assessmentsCount: 0,
        extraCount: 0,
      });
      setUpcomingHolidays(res.upcomingHolidays || []);
      setUpcomingAssessments(res.upcomingAssessments || []);
    } catch (err: any) {
      console.error("Failed to fetch calendar events:", err);
      setStatusMsg({ type: "error", text: "Failed to load calendar events: " + (err?.message || "Error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [currentYear]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(now.toISOString().split("T")[0]);
  };

  // Seed default official holidays
  const handleSeedDefaults = async () => {
    try {
      setActionLoading(true);
      const res = await api.calendar.seedDefaults();
      setStatusMsg({ type: "success", text: res.message });
      await loadCalendar();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to seed defaults: " + (err?.message || "Error") });
    } finally {
      setActionLoading(false);
    }
  };

  // Open modal for Create
  const handleOpenCreateModal = (defaultCat?: "holiday" | "assessment" | "extra_class" | "event", datePreset?: string) => {
    setEditingEventId(null);
    const useDate = datePreset || selectedDate || today.toISOString().split("T")[0];
    setFormData({
      title: "",
      description: "",
      category: defaultCat || "holiday",
      subCategory: defaultCat === "holiday" ? "National Holiday" : defaultCat === "assessment" ? "Unit Test" : "",
      startDate: useDate,
      endDate: useDate,
      isAllDay: defaultCat === "holiday",
      startTime: "09:00",
      endTime: "11:00",
      batchId: "all",
      location: defaultCat === "holiday" ? "All Campuses" : "Main Campus",
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (ev: CalendarEvent) => {
    if (ev.isFromAssessmentTable) {
      setStatusMsg({
        type: "error",
        text: "This assessment was registered via the Assessments module. Please manage its marks and title in the Assessments tab.",
      });
      return;
    }
    setEditingEventId(ev.id);
    setFormData({
      title: ev.title,
      description: ev.description || "",
      category: ev.category,
      subCategory: ev.subCategory || "",
      startDate: ev.startDate,
      endDate: ev.endDate || ev.startDate,
      isAllDay: Boolean(ev.isAllDay),
      startTime: ev.startTime || "09:00",
      endTime: ev.endTime || "11:00",
      batchId: ev.batchId || "all",
      location: ev.location || "",
    });
    setIsModalOpen(true);
  };

  // Save Event
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setStatusMsg({ type: "error", text: "Event title is required." });
      return;
    }
    if (!formData.startDate) {
      setStatusMsg({ type: "error", text: "Start date is required." });
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        subCategory: formData.subCategory.trim() || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        isAllDay: formData.isAllDay,
        startTime: formData.isAllDay ? undefined : formData.startTime,
        endTime: formData.isAllDay ? undefined : formData.endTime,
        batchId: formData.batchId === "all" ? undefined : formData.batchId,
        location: formData.location.trim() || undefined,
      };

      if (editingEventId) {
        await api.calendar.update(editingEventId, payload);
        setStatusMsg({ type: "success", text: "Calendar entry updated successfully." });
      } else {
        await api.calendar.create(payload);
        setStatusMsg({ type: "success", text: "New calendar entry marked successfully." });
      }

      setIsModalOpen(false);
      await loadCalendar();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save entry: " + (err?.message || "Error") });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string, isFromAssessmentTable?: boolean) => {
    if (isFromAssessmentTable) {
      setStatusMsg({
        type: "error",
        text: "This assessment is linked with student scores. Please manage it in the Assessments tab.",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this calendar entry?")) return;

    try {
      setActionLoading(true);
      await api.calendar.delete(id);
      setStatusMsg({ type: "success", text: "Calendar entry removed successfully." });
      await loadCalendar();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to delete entry: " + (err?.message || "Error") });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Category filter
      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }
      // Batch filter
      if (selectedBatchFilter !== "all" && e.batchId && e.batchId !== selectedBatchFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDesc = (e.description || "").toLowerCase().includes(q);
        const matchesLoc = (e.location || "").toLowerCase().includes(q);
        const matchesSub = (e.subCategory || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesSub) return false;
      }
      return true;
    });
  }, [events, categoryFilter, selectedBatchFilter, searchQuery]);

  // Calendar Grid calculation for currentYear & currentMonth
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate(); // e.g. 31
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: CalendarEvent[];
    }> = [];

    // Preceding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === today.toISOString().split("T")[0],
        isSelected: dateStr === selectedDate,
        events: filteredEvents.filter((e) => {
          const s = e.startDate;
          const end = e.endDate || e.startDate;
          return dateStr >= s && dateStr <= end;
        }),
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split("T")[0],
        isSelected: dateStr === selectedDate,
        events: filteredEvents.filter((e) => {
          const s = e.startDate;
          const end = e.endDate || e.startDate;
          return dateStr >= s && dateStr <= end;
        }),
      });
    }

    // Trailing days to fill 42 cells (6 rows * 7 cols) or 35 cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === today.toISOString().split("T")[0],
        isSelected: dateStr === selectedDate,
        events: filteredEvents.filter((e) => {
          const s = e.startDate;
          const end = e.endDate || e.startDate;
          return dateStr >= s && dateStr <= end;
        }),
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, filteredEvents, today]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((e) => {
      const s = e.startDate;
      const end = e.endDate || e.startDate;
      return selectedDate >= s && selectedDate <= end;
    });
  }, [filteredEvents, selectedDate]);

  // Category style helper
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "holiday":
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          badge: "bg-rose-100 text-rose-800 border-rose-300",
          dot: "bg-rose-500",
          icon: Palmtree,
          label: "Holiday",
        };
      case "assessment":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-700",
          badge: "bg-purple-100 text-purple-800 border-purple-300",
          dot: "bg-purple-600",
          icon: Award,
          label: "Assessment",
        };
      case "extra_class":
        return {
          bg: "bg-sky-50",
          border: "border-sky-200",
          text: "text-sky-700",
          badge: "bg-sky-100 text-sky-800 border-sky-300",
          dot: "bg-sky-500",
          icon: Zap,
          label: "Extra Session",
        };
      default:
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-700",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          dot: "bg-emerald-500",
          icon: PartyPopper,
          label: "Event",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Academic Calendar & Schedule</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
              Admin Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative scheduling center for institute holidays, milestone examinations, extra sessions & academy events.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSeedDefaults}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition shadow-xs"
            title="Populate standard 2026-2027 Indian Academic & State Holidays"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Seed 2026–27 Holidays</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal("holiday")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
          >
            <Palmtree className="w-3.5 h-3.5" />
            <span>Mark Holiday</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal("assessment")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Mark Exam Date</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal("extra_class")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event / Extra Class</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Official Holidays</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Palmtree className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.holidaysCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Vacations & Festive breaks</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assessments & Exams</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.assessmentsCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tests, Mocks & Semester Finals</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Extra Classes & Events</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.extraCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Doubt bootcamps, PTM & Fairs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Scheduled Dates</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalEvents}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Academic Session 2026–27</p>
        </div>
      </div>

      {/* Main Interactive Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Month Calendar (3 Cols on Desktop) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-bold text-slate-900 min-w-[150px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Today
              </button>
            </div>

            {/* Filter Pills & View Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Pills */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${categoryFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setCategoryFilter("holiday")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${categoryFilter === "holiday" ? "bg-rose-50 text-rose-700 shadow-xs font-bold" : "hover:text-rose-700"}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Holidays
                </button>
                <button
                  onClick={() => setCategoryFilter("assessment")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${categoryFilter === "assessment" ? "bg-purple-50 text-purple-700 shadow-xs font-bold" : "hover:text-purple-700"}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  Exams
                </button>
                <button
                  onClick={() => setCategoryFilter("extra_class")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${categoryFilter === "extra_class" ? "bg-sky-50 text-sky-700 shadow-xs font-bold" : "hover:text-sky-700"}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Extra
                </button>
              </div>

              {/* View Switch */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  title="Grid Month View"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition ${viewMode === "list" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  title="List Agenda View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Month Grid View */}
          {viewMode === "grid" ? (
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[580px] sm:min-w-0">
                {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_OF_WEEK.map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[11px] font-bold py-1.5 uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? "text-rose-500" : "text-slate-400"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarGrid.map((day, idx) => {
                  const isSun = new Date(day.dateStr).getDay() === 0;
                  const isCurrent = day.isCurrentMonth;
                  const isSelected = day.isSelected;
                  const isToday = day.isToday;

                  return (
                    <div
                      key={day.dateStr + idx}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`min-h-[92px] sm:min-h-[105px] p-1.5 rounded-xl border flex flex-col justify-between transition cursor-pointer relative group ${
                        isSelected
                          ? "ring-2 ring-indigo-600 border-indigo-500 bg-indigo-50/30"
                          : isToday
                          ? "border-indigo-300 bg-indigo-50/15"
                          : isCurrent
                          ? "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                          : "border-slate-100 bg-slate-50/50 text-slate-300"
                      }`}
                    >
                      {/* Top Bar inside Cell */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-indigo-600 text-white shadow-xs"
                              : isSelected
                              ? "bg-indigo-100 text-indigo-700 font-black"
                              : isSun && isCurrent
                              ? "text-rose-600 font-extrabold"
                              : isCurrent
                              ? "text-slate-700 font-bold"
                              : "text-slate-400 font-medium"
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {/* Quick add button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateModal("holiday", day.dateStr);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-slate-200/70 text-slate-500 transition"
                          title="Quick mark holiday"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Event Badges in Cell */}
                      <div className="flex-1 mt-1 space-y-1 overflow-hidden">
                        {day.events.slice(0, 3).map((ev) => {
                          const theme = getCategoryTheme(ev.category);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day.dateStr);
                              }}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate border flex items-center gap-1 ${theme.bg} ${theme.text} ${theme.border}`}
                              title={`${ev.title} (${theme.label})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {day.events.length > 3 && (
                          <div className="text-[9px] font-bold text-slate-500 pl-1">
                            +{day.events.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          ) : (
            /* List / Agenda View */
            <div className="mt-4 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No calendar events found for selected filters.</p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const theme = getCategoryTheme(ev.category);
                  const Icon = theme.icon;

                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.bg} ${theme.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`p-2 rounded-xl bg-white border ${theme.border} ${theme.text} shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${theme.badge}`}>
                              {ev.subCategory || theme.label}
                            </span>
                            {ev.batchName && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                                {ev.batchName}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">{ev.title}</h3>
                          {ev.description && (
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{ev.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5 font-medium">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <CalendarIcon className="w-3 h-3 text-slate-400" />
                              {ev.startDate}
                              {ev.endDate && ev.endDate !== ev.startDate ? ` to ${ev.endDate}` : ""}
                            </span>
                            {!ev.isAllDay && ev.startTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {ev.startTime} – {ev.endTime || "End"}
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!ev.isFromAssessmentTable && (
                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1.5 rounded-lg hover:bg-white text-rose-600 transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Day Inspector & Upcoming Highlights */}
        <div className="space-y-5">
          {/* Selected Date Inspector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Day Inspector</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </h3>
              </div>
              <button
                onClick={() => handleOpenCreateModal("holiday", selectedDate)}
                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                title="Add event for this date"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Day Events List */}
            <div className="mt-3 space-y-2.5">
              {selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-500">Regular Academic Working Day</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No holidays or special assessments marked for this date.</p>
                  <div className="mt-4 flex flex-col gap-1.5">
                    <button
                      onClick={() => handleOpenCreateModal("holiday", selectedDate)}
                      className="w-full py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
                    >
                      + Mark as Holiday
                    </button>
                    <button
                      onClick={() => handleOpenCreateModal("assessment", selectedDate)}
                      className="w-full py-1.5 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition"
                    >
                      + Mark Assessment Date
                    </button>
                  </div>
                </div>
              ) : (
                selectedDateEvents.map((ev) => {
                  const theme = getCategoryTheme(ev.category);
                  const Icon = theme.icon;

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border ${theme.bg} ${theme.border} space-y-1.5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}>
                            {ev.subCategory || theme.label}
                          </span>
                        </div>
                        {!ev.isFromAssessmentTable && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(ev)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{ev.title}</h4>
                      {ev.description && <p className="text-[11px] text-slate-600 line-clamp-2">{ev.description}</p>}

                      <div className="pt-1 text-[10px] text-slate-500 space-y-0.5 font-medium">
                        {!ev.isAllDay && ev.startTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {ev.startTime} – {ev.endTime || "Done"}
                            </span>
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.location}</span>
                          </div>
                        )}
                        {ev.batchName && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{ev.batchName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Holidays Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Palmtree className="w-4 h-4 text-rose-500" />
                <span>Upcoming Holidays</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Session 2026–27</span>
            </div>

            <div className="mt-3 space-y-2">
              {upcomingHolidays.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming holidays scheduled.</p>
              ) : (
                upcomingHolidays.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedDate(h.startDate);
                      const [y, m] = h.startDate.split("-");
                      setCurrentYear(parseInt(y));
                      setCurrentMonth(parseInt(m) - 1);
                    }}
                    className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{h.title}</h5>
                      <span className="text-[10px] text-rose-600 font-medium">
                        {h.startDate}
                        {h.endDate && h.endDate !== h.startDate ? ` to ${h.endDate}` : ""}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-rose-700 border border-rose-200 shadow-2xs">
                      {h.subCategory || "Holiday"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Assessments Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Upcoming Assessments</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Exams & Mocks</span>
            </div>

            <div className="mt-3 space-y-2">
              {upcomingAssessments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming assessments scheduled.</p>
              ) : (
                upcomingAssessments.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedDate(a.startDate);
                      const [y, m] = a.startDate.split("-");
                      setCurrentYear(parseInt(y));
                      setCurrentMonth(parseInt(m) - 1);
                    }}
                    className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{a.title}</h5>
                      <span className="text-[10px] text-purple-600 font-medium">{a.startDate}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-purple-700 border border-purple-200 shadow-2xs">
                      Exam
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Mark / Edit Calendar Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl text-white ${
                    formData.category === "holiday"
                      ? "bg-rose-600"
                      : formData.category === "assessment"
                      ? "bg-purple-600"
                      : "bg-indigo-600"
                  }`}
                >
                  {formData.category === "holiday" ? (
                    <Palmtree className="w-5 h-5" />
                  ) : formData.category === "assessment" ? (
                    <Award className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingEventId ? "Edit Calendar Entry" : "Mark Calendar Schedule"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official dates visible to students, faculty & administrators
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {/* Category Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Schedule Category</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        category: "holiday",
                        subCategory: "National Holiday",
                        isAllDay: true,
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      formData.category === "holiday"
                        ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400/40"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Palmtree className="w-4 h-4" />
                    <span>Holiday</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        category: "assessment",
                        subCategory: "Monthly Assessment",
                        isAllDay: false,
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      formData.category === "assessment"
                        ? "bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-400/40"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Assessment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        category: "extra_class",
                        subCategory: "Doubt Session",
                        isAllDay: false,
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      formData.category === "extra_class"
                        ? "bg-sky-50 border-sky-300 text-sky-700 ring-2 ring-sky-400/40"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Extra / Event</span>
                  </button>
                </div>
              </div>

              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title / Event Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.category === "holiday"
                      ? "e.g. Diwali Holiday, Dussehra Vacation, Karnataka Rajyotsava"
                      : formData.category === "assessment"
                      ? "e.g. Class 11 Mid-Term Examination, JEE Mock CBT Series 1"
                      : "e.g. Weekend Math Doubt Solving, Science Exhibition 2026"
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Sub-Category Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type / Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. National Holiday, CBT Mock, PTM"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Cohort / Batch</label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="all">Institute Wide (All Students)</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData({
                        ...formData,
                        startDate: newStart,
                        endDate: formData.endDate < newStart ? newStart : formData.endDate,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date <span className="text-[10px] text-slate-400 font-normal">(for multi-day breaks)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* All-Day vs Timed */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Full Day Schedule</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAllDay}
                      onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {!formData.isAllDay && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location & Venue */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. All Campuses, Room 204, Examination Hall 1, Online"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional guidelines, preparation syllabus, or dress code details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editingEventId ? "Save Changes" : "Confirm Schedule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

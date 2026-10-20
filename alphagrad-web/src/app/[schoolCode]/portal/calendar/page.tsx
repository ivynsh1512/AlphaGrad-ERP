"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Award,
  Zap,
  PartyPopper,
  Clock,
  MapPin,
  Users,
  Search,
  Sparkles,
  Info,
  Grid3X3,
  List,
  CheckCircle2,
  CalendarCheck
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
  maxMarks?: number;
  subjectName?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentCalendarPage() {
  const { user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split("T")[0]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    holidaysCount: 0,
    assessmentsCount: 0,
    extraCount: 0,
  });
  const [upcomingHolidays, setUpcomingHolidays] = useState<CalendarEvent[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load calendar
  useEffect(() => {
    async function fetchCalendar() {
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
      } catch (err) {
        console.error("Failed to fetch student calendar:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
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

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDesc = (e.description || "").toLowerCase().includes(q);
        const matchesSub = (e.subCategory || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSub) return false;
      }
      return true;
    });
  }, [events, categoryFilter, searchQuery]);

  // Calendar Grid
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: CalendarEvent[];
    }> = [];

    // Preceding days
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

    // Trailing days
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

  // Next imminent holiday
  const nextHoliday = upcomingHolidays[0];
  // Next imminent assessment
  const nextAssessment = upcomingAssessments[0];

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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Student Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Academic Calendar</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Session 2026–27
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Check upcoming holidays, assessment milestone dates, doubt-clearing sessions & academy events.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dates, festivals, exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Hero Countdown Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Next Holiday Card */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none">
            <Palmtree className="w-32 h-32" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                <Palmtree className="w-3 h-3" />
                <span>Next Academy Holiday</span>
              </span>
              <span className="text-[11px] font-semibold text-rose-100">Official Break</span>
            </div>
            {nextHoliday ? (
              <div className="mt-3">
                <h3 className="text-lg font-black tracking-tight">{nextHoliday.title}</h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  {nextHoliday.startDate}
                  {nextHoliday.endDate && nextHoliday.endDate !== nextHoliday.startDate
                    ? ` to ${nextHoliday.endDate}`
                    : ""}
                </p>
                {nextHoliday.description && (
                  <p className="text-[11px] text-rose-100/90 mt-2 line-clamp-1">{nextHoliday.description}</p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <h3 className="text-sm font-bold">No upcoming holidays scheduled this term.</h3>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-rose-100">
            <span>Total Holidays: <strong>{stats.holidaysCount}</strong></span>
            <button
              onClick={() => {
                if (nextHoliday) {
                  setSelectedDate(nextHoliday.startDate);
                  const [y, m] = nextHoliday.startDate.split("-");
                  setCurrentYear(parseInt(y));
                  setCurrentMonth(parseInt(m) - 1);
                }
              }}
              className="text-white underline font-bold hover:opacity-80"
            >
              Jump to Date →
            </button>
          </div>
        </div>

        {/* Next Assessment Card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none">
            <Award className="w-32 h-32" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                <Award className="w-3 h-3" />
                <span>Next Milestone Exam</span>
              </span>
              <span className="text-[11px] font-semibold text-purple-100">Test Series</span>
            </div>
            {nextAssessment ? (
              <div className="mt-3">
                <h3 className="text-lg font-black tracking-tight">{nextAssessment.title}</h3>
                <p className="text-xs text-purple-100 mt-0.5">{nextAssessment.startDate}</p>
                {nextAssessment.description && (
                  <p className="text-[11px] text-purple-100/90 mt-2 line-clamp-1">{nextAssessment.description}</p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <h3 className="text-sm font-bold">No upcoming tests scheduled this week.</h3>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-purple-100">
            <span>Total Assessments: <strong>{stats.assessmentsCount}</strong></span>
            <button
              onClick={() => {
                if (nextAssessment) {
                  setSelectedDate(nextAssessment.startDate);
                  const [y, m] = nextAssessment.startDate.split("-");
                  setCurrentYear(parseInt(y));
                  setCurrentMonth(parseInt(m) - 1);
                }
              }}
              className="text-white underline font-bold hover:opacity-80"
            >
              Jump to Date →
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 min-w-[140px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Today
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    categoryFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCategoryFilter("holiday")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    categoryFilter === "holiday" ? "bg-rose-50 text-rose-700 shadow-xs font-bold" : "hover:text-rose-700"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Holidays
                </button>
                <button
                  onClick={() => setCategoryFilter("assessment")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    categoryFilter === "assessment"
                      ? "bg-purple-50 text-purple-700 shadow-xs font-bold"
                      : "hover:text-purple-700"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  Exams
                </button>
              </div>

              {/* View toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "list" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[580px] sm:min-w-0">
                {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_OF_WEEK.map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[11px] font-bold py-1 uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? "text-rose-500" : "text-slate-400"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarGrid.map((day, idx) => {
                  const isSun = new Date(day.dateStr).getDay() === 0;
                  const isCurrent = day.isCurrentMonth;
                  const isSelected = day.isSelected;
                  const isToday = day.isToday;

                  return (
                    <div
                      key={day.dateStr + idx}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`min-h-[85px] sm:min-h-[96px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition cursor-pointer relative ${
                        isSelected
                          ? "ring-2 ring-indigo-600 border-indigo-500 bg-indigo-50/30"
                          : isToday
                          ? "border-indigo-300 bg-indigo-50/15"
                          : isCurrent
                          ? "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          : "border-slate-100 bg-slate-50/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
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
                      </div>

                      {/* Event items in cell */}
                      <div className="flex-1 mt-1 space-y-1 overflow-hidden">
                        {day.events.slice(0, 2).map((ev) => {
                          const theme = getCategoryTheme(ev.category);
                          return (
                            <div
                              key={ev.id}
                              className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded truncate border flex items-center gap-1 ${theme.bg} ${theme.text} ${theme.border}`}
                              title={ev.title}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {day.events.length > 2 && (
                          <div className="text-[9px] font-bold text-slate-500 pl-0.5">
                            +{day.events.length - 2} more
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
            /* List Agenda View */
            <div className="mt-4 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No calendar events found.</p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const theme = getCategoryTheme(ev.category);
                  const Icon = theme.icon;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedDate(ev.startDate)}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition cursor-pointer hover:shadow-xs ${theme.bg} ${theme.border}`}
                    >
                      <span className={`p-2 rounded-xl bg-white border ${theme.border} ${theme.text} shrink-0 mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
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
                        <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">{ev.title}</h3>
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
                              {ev.startTime} – {ev.endTime || "Done"}
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
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Selected Date Inspector (Right Column) */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Date Schedule</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </h3>
            </div>

            <div className="mt-3 space-y-3">
              {selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-800">Regular Academic Working Day</p>
                  <p className="text-[11px] text-slate-400 mt-1">Standard class timetable applies. No holidays or special examinations marked.</p>
                </div>
              ) : (
                selectedDateEvents.map((ev) => {
                  const theme = getCategoryTheme(ev.category);
                  const Icon = theme.icon;

                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border ${theme.bg} ${theme.border} space-y-2`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}>
                          {ev.subCategory || theme.label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{ev.title}</h4>
                      {ev.description && <p className="text-[11px] text-slate-600">{ev.description}</p>}

                      <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1 font-medium">
                        {!ev.isAllDay && ev.startTime && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Time: <strong>{ev.startTime} – {ev.endTime || "Conclusion"}</strong>
                            </span>
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Venue: {ev.location}</span>
                          </div>
                        )}
                        {ev.batchName && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Applies to: {ev.batchName}</span>
                          </div>
                        )}
                        {ev.maxMarks && (
                          <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                            <Award className="w-3.5 h-3.5 text-purple-500" />
                            <span>Max Marks: {ev.maxMarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Legend Guide */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Calendar Color Legend</span>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-600 font-medium">Holidays & Breaks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                <span className="text-slate-600 font-medium">Assessments & Exams</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                <span className="text-slate-600 font-medium">Extra Doubt Classes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium">PTM & Academy Events</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

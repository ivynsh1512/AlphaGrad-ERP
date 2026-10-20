"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Clock,
  BookOpen,
  GraduationCap,
  DoorOpen,
  CalendarDays,
  Sparkles,
  ChevronRight,
  CalendarCheck
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

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const [weekly, setWeekly] = useState<{ dayName: string; entries: TimetableSlot[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");

  // Determine today's day of week (1=Mon ... 7=Sun)
  const currentDayOfWeek = useMemo(() => {
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    return jsDay === 0 ? 7 : jsDay;
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        // Student views their batch timetable
        const res = await api.timetable.list(
          selectedDay !== "all" ? { dayOfWeek: selectedDay } : undefined
        );
        setWeekly(res.weekly || []);
      } catch (err: any) {
        console.error("Failed to load timetable:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [selectedDay]);

  const todayEntries = useMemo(() => {
    const todayGroup = weekly.find((g) => {
      const matchDay = DAYS.find((d) => d.id === currentDayOfWeek);
      return matchDay && g.dayName === matchDay.name;
    });
    return todayGroup?.entries || [];
  }, [weekly, currentDayOfWeek]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Class Lecture Schedule</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Weekly lecture timetable, assigned faculties, and classroom locations
              </p>
            </div>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <button
            onClick={() => setSelectedDay("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedDay === "all"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Full Week
          </button>
          {DAYS.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDay === d.id
                  ? "bg-white text-indigo-700 shadow-xs"
                  : d.id === currentDayOfWeek
                  ? "text-indigo-600 font-bold hover:bg-white/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {d.short}
              {d.id === currentDayOfWeek && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 ml-1 mb-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Today's Quick Bar */}
      {selectedDay === "all" && todayEntries.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/50 p-5 rounded-2xl border border-indigo-100/60 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Today&apos;s Lectures ({DAYS.find((d) => d.id === currentDayOfWeek)?.name})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {todayEntries.map((slot) => (
              <div key={slot.id} className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700">{slot.startTime} – {slot.endTime}</span>
                  {slot.roomNumber && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {slot.roomNumber}
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-800 truncate">{slot.subjectName}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-slate-400" />
                  {slot.teacherName || "Faculty Assigned"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Schedule */}
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
          <h3 className="text-sm font-bold text-slate-800">No Scheduled Classes</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            No lecture slots scheduled for this day or batch.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {weekly.map((dayGroup) => {
            const isToday = DAYS.find((d) => d.id === currentDayOfWeek)?.name === dayGroup.dayName;
            return (
              <div
                key={dayGroup.dayName}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${
                  isToday ? "border-indigo-200 ring-2 ring-indigo-500/10" : "border-slate-100"
                }`}
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isToday ? "bg-indigo-600" : "bg-slate-300"}`} />
                    <h2 className="text-sm font-bold text-slate-800">{dayGroup.dayName}</h2>
                    {isToday && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {dayGroup.entries.length} {dayGroup.entries.length === 1 ? "lecture" : "lectures"}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {dayGroup.entries.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-28 shrink-0 flex flex-col items-center justify-center p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-center">
                          <span className="text-xs font-bold text-indigo-700">{slot.startTime}</span>
                          <span className="text-[10px] text-indigo-500 font-medium">to {slot.endTime}</span>
                        </div>

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
                              {slot.batchName || "Batch"}
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
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

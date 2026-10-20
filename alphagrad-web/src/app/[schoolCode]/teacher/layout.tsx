"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap,
  CalendarCheck,
  BookOpen,
  MessageSquareQuote,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  UserCheck,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  CalendarDays,
  Clock,
  Wand2,
  FileText,
  CheckSquare,
} from "lucide-react";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const schoolCode = (params.schoolCode as string)?.toLowerCase();
  const { user, school, features, logout, loading, hasFeature } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/${schoolCode}/login`);
      } else if (user.role === "admin") {
        router.push(`/${schoolCode}/admin`);
      } else if (user.role === "student_parent") {
        router.push(`/${schoolCode}/portal`);
      } else if (user.role !== "teacher") {
        router.push(`/${schoolCode}/login`);
      }
    }
  }, [user, loading, router, schoolCode]);

  if (loading || !user || user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading Faculty Portal...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: `/${schoolCode}/teacher`, icon: GraduationCap },
    { name: "AI Worksheet Studio", href: `/${schoolCode}/teacher/worksheets`, icon: Wand2, badge: "AI", featureKey: "worksheets" },
    { name: "Assigned Worksheets", href: `/${schoolCode}/teacher/assignments`, icon: FileText, featureKey: "worksheets" },
    { name: "Submissions & Grading", href: `/${schoolCode}/teacher/submissions`, icon: CheckSquare, featureKey: "worksheets" },
    { name: "Academic Calendar", href: `/${schoolCode}/teacher/calendar`, icon: CalendarDays, featureKey: "calendar" },
    { name: "Class Timetable", href: `/${schoolCode}/teacher/timetable`, icon: Clock, featureKey: "timetable" },
    { name: "Take Attendance", href: `/${schoolCode}/teacher/attendance`, icon: CalendarCheck, featureKey: "attendance" },
    { name: "Portion Completion", href: `/${schoolCode}/teacher/syllabus`, icon: Layers, featureKey: "syllabus" },
    { name: "Monthly Assessments", href: `/${schoolCode}/teacher/assessments`, icon: Award, featureKey: "assessments" },
    { name: "Homework & Tasks", href: `/${schoolCode}/teacher/homework`, icon: BookOpen, featureKey: "homework" },
    { name: "Student Remarks", href: `/${schoolCode}/teacher/remarks`, icon: MessageSquareQuote, featureKey: "remarks" },
    { name: "Support Desk", href: `/${schoolCode}/teacher/complaints`, icon: LifeBuoy, featureKey: "complaints" },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!item.featureKey) return true;
    return hasFeature(item.featureKey);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Light Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 p-0.5 shadow-xs shrink-0 flex items-center justify-center">
            <span className="font-bold text-xs text-emerald-700">{school?.name?.charAt(0) || "F"}</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">{school?.name || "Institute"}</h1>
            <p className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase mt-0.5">Faculty Workspace</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 shadow-xs ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-slate-200 p-0.5 shadow-xs shrink-0 flex items-center justify-center text-white font-bold">
                {school?.name?.charAt(0) || "F"}
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate">{school?.name || "Institute"}</h1>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 font-mono">
                  {schoolCode} • Faculty
                </p>
              </div>
            </div>
          </div>

          {/* User brief */}
          <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                {user.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-[10px] text-emerald-600 font-mono font-medium">{user.username}</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Faculty Workspace</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200/90 px-6 hidden md:flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">{school?.name}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-bold text-slate-800 capitalize">Faculty Portal</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Teaching Session Active</span>
            </span>

            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

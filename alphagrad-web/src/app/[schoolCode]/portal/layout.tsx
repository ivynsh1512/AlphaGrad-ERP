"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Home,
  BookOpen,
  CalendarCheck,
  CreditCard,
  LifeBuoy,
  MessageSquareQuote,
  LogOut,
  Bell,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Award,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  Menu,
  X,
  Bot,
  FileText,
  CheckCircle,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  isFeeTab?: boolean;
  badge?: string;
  featureKey?: string;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const schoolCode = (params.schoolCode as string)?.toLowerCase();
  const { user, school, features, loading, logout, hasFeature } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [hasPendingFee, setHasPendingFee] = useState<boolean>(false);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentCohort, setStudentCohort] = useState<string>("Academic Cohort");

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/${schoolCode}/login`);
      } else if (user.role === "admin") {
        router.push(`/${schoolCode}/admin`);
      } else if (user.role === "teacher") {
        router.push(`/${schoolCode}/teacher`);
      } else if (user.role !== "student_parent") {
        router.push(`/${schoolCode}/login`);
      }
    }
  }, [user, loading, router, schoolCode]);

  const allNavItems: NavItem[] = [
    { name: "Home", href: `/${schoolCode}/portal`, icon: Home },
    { name: "AI Tutor 24/7", href: `/${schoolCode}/portal/ai-tutor`, icon: Bot, badge: "AI", featureKey: "aiTutor" },
    { name: "Tests & Practice", href: `/${schoolCode}/portal/tests`, icon: CheckCircle, featureKey: "tests" },
    { name: "AI Worksheets", href: `/${schoolCode}/portal/worksheets`, icon: FileText, featureKey: "worksheets" },
    { name: "My Assignments", href: `/${schoolCode}/portal/assignments`, icon: ClipboardList, featureKey: "worksheets" },
    { name: "Academic Calendar", href: `/${schoolCode}/portal/calendar`, icon: CalendarDays, featureKey: "calendar" },
    { name: "Class Timetable", href: `/${schoolCode}/portal/timetable`, icon: Clock, featureKey: "timetable" },
    { name: "Attendance", href: `/${schoolCode}/portal/attendance`, icon: CalendarCheck, featureKey: "attendance" },
    { name: "Monthly Assessments", href: `/${schoolCode}/portal/assessments`, icon: Award, featureKey: "assessments" },
    { name: "Fees & Payment", href: `/${schoolCode}/portal/fees`, icon: CreditCard, isFeeTab: true, featureKey: "fees" },
    { name: "Portion Tracking", href: `/${schoolCode}/portal/syllabus`, icon: GraduationCap, featureKey: "syllabus" },
    { name: "Homework & Tasks", href: `/${schoolCode}/portal/homework`, icon: BookOpen, featureKey: "homework" },
    { name: "Notice Board", href: `/${schoolCode}/portal/notices`, icon: Bell, featureKey: "notices" },
    { name: "Faculty Remarks", href: `/${schoolCode}/portal/remarks`, icon: MessageSquareQuote, featureKey: "remarks" },
    { name: "Helpdesk & Tickets", href: `/${schoolCode}/portal/complaints`, icon: LifeBuoy, featureKey: "complaints" },
  ];

  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.featureKey) return true;
    return hasFeature(item.featureKey);
  });

  if (loading || !user || user.role !== "student_parent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading Student & Parent Portal...</p>
        </div>
      </div>
    );
  }

  const isAiTutor = pathname === `/${schoolCode}/portal/ai-tutor`;

  return (
    <div className={`bg-slate-50 flex flex-col md:flex-row text-slate-800 ${isAiTutor ? "h-[100dvh] md:h-screen overflow-hidden pb-14 md:pb-0" : "min-h-screen pb-20 md:pb-0"}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-68 bg-white border-r border-slate-200/90 shrink-0 min-h-screen shadow-xs">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 border border-slate-200 p-0.5 shadow-xs shrink-0 flex items-center justify-center text-white font-bold">
                {school?.name?.charAt(0) || "S"}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate">{school?.name || "Institute"}</h1>
                <p className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Student & Parent PWA
                </p>
              </div>
            </div>
          </div>

          {/* Student Profile Card */}
          <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                {user.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-[10px] text-indigo-600 font-mono font-medium">{user.username}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Institute Code</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px] font-mono">
                {schoolCode}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isBlinkingFee = item.isFeeTab && hasPendingFee;

              let linkClass = "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70";
              if (isActive) {
                linkClass = "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-xs";
              }

              if (isBlinkingFee) {
                linkClass = `relative bg-rose-50/90 text-rose-800 font-bold border border-rose-300 ring-2 ring-rose-500/80 shadow-md shadow-rose-200 animate-pulse`;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${linkClass}`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isBlinkingFee
                          ? "text-rose-600"
                          : isActive
                          ? "text-indigo-600"
                          : "text-slate-400"
                      }`}
                    />
                    {isBlinkingFee && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                      </span>
                    )}
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>

                  {item.badge && !isBlinkingFee && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-700 shrink-0">
                      {item.badge}
                    </span>
                  )}

                  {isActive && !isBlinkingFee && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 md:hidden"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-700 flex flex-col border-r border-slate-200 shadow-xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {school?.name?.charAt(0) || "S"}
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900">{school?.name || "Institute"}</h2>
              <p className="text-[10px] text-indigo-600 font-semibold">Student Portal</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile snippet */}
        <div className="px-4 py-3 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-indigo-600 font-mono font-medium">{user.username}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[9px]">
              {schoolCode}
            </span>
          </div>
        </div>

        {/* Links list */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className={`flex-1 flex flex-col min-w-0 ${isAiTutor ? "h-full overflow-hidden" : ""}`}>
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">{school?.name}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 hidden sm:inline" />
            <span className="text-xs font-bold text-slate-800 capitalize truncate">Student & Parent Workspace</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className={isAiTutor ? "flex-1 min-h-0 flex flex-col p-2 sm:p-4 overflow-hidden" : "flex-1 p-3.5 sm:p-8 overflow-y-auto"}>{children}</main>
      </div>
    </div>
  );
}

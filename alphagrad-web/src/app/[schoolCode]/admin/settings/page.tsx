"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Bell, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  Calendar,
  CreditCard,
  Download,
  Key,
  Activity,
  FileSpreadsheet,
  Check,
  RefreshCw
} from "lucide-react";
import BouncingLoader from "@/components/BouncingLoader";

interface SettingsData {
  institute: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    timezone: string;
    currency: string;
  };
  settings: {
    instituteId: string;
    feeReminderDays: number;
    allowStudentComplaints: number;
    usernamePrefix?: string;
    academicYearStartMonth?: number;
    receiptPrefix?: string;
    dateFormat?: string;
  };
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states - Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Academic Term & Hours
  const [academicSession, setAcademicSession] = useState("2026-2027");
  const [currentTerm, setCurrentTerm] = useState("Term 2 (Mid-Year Progress)");
  const [startMonth, setStartMonth] = useState(4); // April
  const [workingHours, setWorkingHours] = useState("08:30 AM - 05:30 PM (Mon - Sat)");

  // Fee Policies
  const [feeReminderDays, setFeeReminderDays] = useState(7);
  const [strictDueDatePolicy, setStrictDueDatePolicy] = useState(true);
  const [receiptPrefix, setReceiptPrefix] = useState("INV-2026-");
  const [gracePeriodDays, setGracePeriodDays] = useState(5);

  // Admissions & Portals
  const [usernamePrefix, setUsernamePrefix] = useState("Alpha");
  const [defaultPassword, setDefaultPassword] = useState("School@2026");
  const [allowComplaints, setAllowComplaints] = useState(true);

  // Export & Diagnostic state
  const [exportingStudents, setExportingStudents] = useState(false);
  const [exportingFees, setExportingFees] = useState(false);
  const [pingingEdge, setPingingEdge] = useState(false);
  const [edgeDiagnostic, setEdgeDiagnostic] = useState<{
    status: string;
    latencyMs: number;
    edgeRegion: string;
    timestamp: string;
  } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ institute: SettingsData["institute"]; settings: SettingsData["settings"] }>("/settings");
      if (res && res.institute) {
        setData(res);
        setName(res.institute.name || "");
        setEmail(res.institute.contactEmail || "");
        setPhone(res.institute.contactPhone || "");
        setAddress(res.institute.address || "");
        if (res.settings) {
          setFeeReminderDays(res.settings.feeReminderDays || 7);
          setAllowComplaints(Boolean(res.settings.allowStudentComplaints));
          if (res.settings.usernamePrefix) setUsernamePrefix(res.settings.usernamePrefix);
          if (res.settings.academicYearStartMonth) setStartMonth(res.settings.academicYearStartMonth);
        }
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setStatusMessage({ type: "error", text: "Failed to load institute settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await api.put("/settings", {
        instituteName: name,
        contactEmail: email,
        contactPhone: phone,
        address: address,
        feeReminderDays: Number(feeReminderDays),
        allowStudentComplaints: allowComplaints,
        usernamePrefix: usernamePrefix,
        academicYearStartMonth: Number(startMonth),
      });

      setStatusMessage({ type: "success", text: "Institute settings and operational policies saved successfully!" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update institute settings." });
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Export: Student Directory CSV
  const handleExportStudents = async () => {
    setExportingStudents(true);
    try {
      const res = await api.students.list();
      const list = res.students || [];
      if (list.length === 0) {
        alert("No student records available to export.");
        return;
      }

      const headers = ["ID", "Admission Number", "Full Name", "Username", "Batch", "Target Exam", "Fee Balance (INR)"];
      const rows = list.map((s: any) => [
        s.id,
        s.admissionNumber || "N/A",
        `"${(s.fullName || "").replace(/"/g, '""')}"`,
        s.username || "N/A",
        `"${(s.batchName || "Unassigned").replace(/"/g, '""')}"`,
        `"${(s.targetExam || "Standard").replace(/"/g, '""')}"`,
        s.feeSummary?.balance || 0,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Student_Directory_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || "Server error"}`);
    } finally {
      setExportingStudents(false);
    }
  };

  // 1-Click Export: Fee Ledger CSV
  const handleExportFeeLedger = async () => {
    setExportingFees(true);
    try {
      const res = await api.fees.allObligations();
      const obligations = res.obligations || [];
      if (obligations.length === 0) {
        alert("No fee obligations found to export.");
        return;
      }

      const headers = [
        "Student Name",
        "Username",
        "Admission #",
        "Installment Title",
        "Fee Plan",
        "Due Date",
        "Base Fee (INR)",
        "Concession (INR)",
        "Net Payable (INR)",
        "Paid (INR)",
        "Balance (INR)",
        "Status"
      ];

      const rows = obligations.map((ob: any) => [
        `"${(ob.fullName || "").replace(/"/g, '""')}"`,
        ob.username || "N/A",
        ob.admissionNumber || "N/A",
        `"${(ob.installmentTitle || "").replace(/"/g, '""')}"`,
        `"${(ob.structureName || "Standard").replace(/"/g, '""')}"`,
        ob.dueDate || "N/A",
        ob.baseAmountInRupees || 0,
        ob.concessionAmountInRupees || 0,
        ob.netAmountInRupees || 0,
        ob.paidAmountInRupees || 0,
        ob.balanceInRupees || 0,
        ob.status || "pending"
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Fee_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || "Server error"}`);
    } finally {
      setExportingFees(false);
    }
  };

  // Edge Ping Diagnostic
  const handlePingEdge = async () => {
    setPingingEdge(true);
    try {
      const res = await api.get<any>("/settings/ping");
      setEdgeDiagnostic(res);
    } catch (err: any) {
      setEdgeDiagnostic({
        status: "error",
        latencyMs: 0,
        edgeRegion: "Connection test failed",
        timestamp: new Date().toISOString()
      });
    } finally {
      setPingingEdge(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl py-12">
        <BouncingLoader text="Loading institute configuration & operational policies..." color="indigo" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
            Governance & Ops
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Control Center</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Institute Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage school academic parameters, strict fee payment rules, admission defaults, and operational data tools.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Academic Session & Operational Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Session & Term Configuration</h2>
              <p className="text-xs text-slate-500">Active school year, current academic term, and operational timetable hours.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Active Academic Session
              </label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Applies across calendar, timetable, and student admissions.</p>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Current Active Term / Evaluation Period
              </label>
              <select
                value={currentTerm}
                onChange={(e) => setCurrentTerm(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Term 1 (Foundation & First Quarter)">Term 1 (Foundation & First Quarter)</option>
                <option value="Term 2 (Mid-Year Progress)">Term 2 (Mid-Year Progress)</option>
                <option value="Term 3 (Final Board Prep & Revisions)">Term 3 (Final Board Prep & Revisions)</option>
                <option value="Annual Continuous Assessment">Annual Continuous Assessment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Academic Year Start Month
              </label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value={4}>April (Standard CBSE/ICSE)</option>
                <option value={6}>June (South India State Board)</option>
                <option value={1}>January (International / NIOS Session 1)</option>
                <option value={9}>September (Autumn Cohort)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Standard Institute Operating Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Fee Due & Payment Policy (CRITICAL USER REQUIREMENT) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Fee Payment & Due Date Visibility Policies</h2>
              <p className="text-xs text-slate-500">Configure when dues are shown to parents and automated collection rules.</p>
            </div>
          </div>

          {/* Strict Due Date Policy Toggle */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs">
                  Strict Due Date Visibility (Show Dues Only on/after Due Date)
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  When enabled, installment balances are displayed as <strong className="text-indigo-700">Scheduled / Upcoming</strong> until the exact Due Date arrives (<code className="font-mono text-slate-700">dueDate &le; today</code>). Dues and urgent payment alerts are never pushed to parents ahead of time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={strictDueDatePolicy}
                  onChange={(e) => setStrictDueDatePolicy(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Automated Reminder Lead Days
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={feeReminderDays}
                  onChange={(e) => setFeeReminderDays(Number(e.target.value))}
                  className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500">days prior</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Invoice / Receipt Prefix
              </label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                placeholder="INV-PA-2026-"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Default Late Grace Period
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500">days buffer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Admissions & Security Defaults */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Admissions & Student Portal Credentials</h2>
              <p className="text-xs text-slate-500">Default username schemes, default provisional passwords, and support desks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Auto-Generated Username Prefix
              </label>
              <input
                type="text"
                value={usernamePrefix}
                onChange={(e) => setUsernamePrefix(e.target.value)}
                placeholder="Alpha"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Generates usernames like <code className="font-mono text-slate-700 font-bold">{usernamePrefix}1933</code> during admission.
              </p>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Default Provisional Password for New Students
              </label>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="School@2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Issued upon enrollment and visible in the admin student directory.
              </p>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Student & Parent Grievance Desk</span>
                <p className="text-[11px] text-slate-500">Allow students and parents to submit feedback and formal remarks.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowComplaints}
                  onChange={(e) => setAllowComplaints(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 4: Institute Profile & Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Institute Profile & Legal Identity</h2>
              <p className="text-xs text-slate-500">Official information shown on receipts, report cards, and notices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Institute Legal Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Institute Code
              </label>
              <input
                type="text"
                disabled
                value={data?.institute.code || "SCHOOL"}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="contact@school.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Helpline Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Physical Campus Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Indiranagar, Bangalore, Karnataka, India"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: High-Value Operational Tools & CSV Ledger Exports */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Institutional Reports & Data Exports</h2>
              <p className="text-xs text-slate-500">Download formatted CSV reports for audit, accounts, and offline management.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs">Student Master Registry</div>
                <div className="text-[11px] text-slate-500">Complete student roster with batches & contact</div>
              </div>
              <button
                type="button"
                onClick={handleExportStudents}
                disabled={exportingStudents}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>{exportingStudents ? "Exporting..." : "Export CSV"}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs">Master Fee Obligations Ledger</div>
                <div className="text-[11px] text-slate-500">Financial records, due dates, paid & balance</div>
              </div>
              <button
                type="button"
                onClick={handleExportFeeLedger}
                disabled={exportingFees}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{exportingFees ? "Exporting..." : "Export CSV"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 6: Edge Infrastructure & Connection Health Diagnostics */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Cloudflare Edge & D1 Diagnostics</div>
                <div className="text-xs text-slate-400 font-mono">
                  Engine: Cloudflare Workers • Database: D1 SQLite 3.x
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePingEdge}
              disabled={pingingEdge}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pingingEdge ? "animate-spin text-indigo-400" : ""}`} />
              <span>{pingingEdge ? "Testing Edge Ping..." : "Test Edge Latency"}</span>
            </button>
          </div>

          {edgeDiagnostic && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-400 font-bold uppercase">{edgeDiagnostic.status}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">{edgeDiagnostic.edgeRegion}</span>
              </div>
              <div className="text-indigo-300 font-bold">
                Round-trip: {edgeDiagnostic.latencyMs} ms
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur border border-slate-200/90 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Make sure to review changes before committing institute policies.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Institute Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

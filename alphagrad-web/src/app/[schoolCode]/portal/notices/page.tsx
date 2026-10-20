"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Bell, Pin, Calendar, AlertCircle, Sparkles, School } from "lucide-react";

export default function StudentNoticesPage() {
  const { school } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notices.list();
      setNotices(res.notices || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const getNoticeBadge = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("holiday")) {
      return { label: "HOLIDAY", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (lower.includes("exam") || lower.includes("test") || lower.includes("assessment")) {
      return { label: "EXAMINATION", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    }
    if (lower.includes("fee") || lower.includes("payment")) {
      return { label: "FEE NOTICE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (lower.includes("urgent") || lower.includes("important")) {
      return { label: "IMPORTANT", color: "bg-red-50 text-red-700 border-red-200" };
    }
    return { label: "ANNOUNCEMENT", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notice Board & Announcements</h1>
        <p className="text-xs text-slate-500 mt-1">
          Official academic updates, holiday schedules, examination notices, and institute circulars.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading institute announcements...</div>
      ) : notices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-slate-800">No active announcements</p>
          <p className="text-xs text-slate-400 mt-1">Check back later for institute circulars and holiday updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => {
            const badge = getNoticeBadge(n.title);
            return (
              <div
                key={n.id}
                className={`p-6 rounded-2xl bg-white border transition shadow-xs space-y-3 ${
                  n.isPinned === 1 ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {n.isPinned === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Pin className="w-3 h-3 text-amber-600" />
                        PINNED
                      </span>
                    )}
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(n.publishedAt * 1000).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{n.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      Issued by: <strong className="text-slate-700">{n.publisherName || school?.name || "School Administration"}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Audience: {n.targetAudience}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

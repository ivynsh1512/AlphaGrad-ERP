"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  MessageSquareQuote,
  Sparkles,
  Calendar,
  Award,
  BookOpen
} from "lucide-react";

interface RemarkItem {
  id: string;
  category: "academic" | "behavioral" | "attendance" | "general";
  remarkText: string;
  facultyName: string;
  subjectName: string | null;
  createdAt: number;
}

export default function StudentRemarksPage() {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRemarks = async () => {
      try {
        setLoading(true);
        const studentId = user?.studentId;
        if (!studentId) return;

        const res = await api.get<{ remarks: RemarkItem[] }>(`/remarks/student/${studentId}`);
        setRemarks(res.remarks || []);
      } catch (err: any) {
        console.error("Failed to load remarks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRemarks();
  }, [user]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "academic":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Academic</span>;
      case "behavioral":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Behavioral</span>;
      case "attendance":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Attendance</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Feedback & Remarks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalized evaluations and actionable recommendations from your subject teachers.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : remarks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <MessageSquareQuote className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Teacher Remarks Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Faculty observations will appear here throughout your academic term.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {remarks.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryBadge(r.category)}
                  {r.subjectName && (
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {r.subjectName}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(r.createdAt * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-sm text-slate-800 leading-relaxed font-normal">&ldquo;{r.remarkText}&rdquo;</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Observed by: {r.facultyName}</span>
                <span className="text-[11px] text-slate-400">Proventus Academy Faculty Desk</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

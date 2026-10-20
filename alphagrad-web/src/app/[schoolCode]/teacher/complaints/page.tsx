"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  X,
  Filter,
  ArrowUpRight
} from "lucide-react";

interface ComplaintItem {
  id: string;
  ticketNumber: string;
  studentId: string;
  studentName: string;
  category: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "escalated" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  resolutionNotes: string | null;
  createdAt: number;
}

export default function TeacherComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [nextStatus, setNextStatus] = useState<"in_progress" | "resolved" | "escalated">("in_progress");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ complaints: ComplaintItem[] }>("/complaints");
      setComplaints(res.complaints || []);
    } catch (err: any) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post(`/complaints/${selectedComplaint.id}/respond`, {
        message: replyMessage,
        updateStatus: nextStatus,
        resolutionNotes: resolutionNotes || undefined,
        isInternalNote: false,
      });

      setStatusMessage({ type: "success", text: `Ticket ${selectedComplaint.ticketNumber} updated successfully!` });
      setSelectedComplaint(null);
      setReplyMessage("");
      setResolutionNotes("");
      fetchComplaints();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update complaint." });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (filterStatus === "all") return true;
    return c.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Open</span>;
      case "in_progress":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      case "resolved":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case "escalated":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Escalated</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Urgent</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">High</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Desk & Student Inquiries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review academic and general student feedback, communicate resolutions, and escalate issues.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="all">All Statuses ({complaints.length})</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
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

      {/* Complaints List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <LifeBuoy className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Tickets Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no inquiries matching your filter criteria.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-emerald-200 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {item.ticketNumber}
                    </span>
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Submitted by: {item.studentName}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedComplaint(item);
                    setNextStatus(item.status === "open" ? "in_progress" : "resolved");
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-semibold text-slate-700 transition flex items-center space-x-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Respond</span>
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>

              {item.resolutionNotes && (
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resolution Summary:</span>
                  </p>
                  <p className="text-emerald-800">{item.resolutionNotes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Respond to Ticket #{selectedComplaint.ticketNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedComplaint.title}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRespond} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Update Ticket Status
                </label>
                <select
                  value={nextStatus}
                  onChange={(e: any) => setNextStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="in_progress">In Progress (Investigating / In Review)</option>
                  <option value="resolved">Resolved (Addressed Completely)</option>
                  <option value="escalated">Escalate to Institute Leadership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Faculty Response Message
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain actions taken or next steps directly to the student/parent..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize the definitive outcome if resolving..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Send Response & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

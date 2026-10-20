"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LifeBuoy,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  MessageSquare,
  Trash2,
} from "lucide-react";

interface ComplaintItem {
  id: string;
  ticketNumber: string;
  category: "academic" | "faculty" | "facility" | "fee" | "transport" | "other";
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "escalated" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  resolutionNotes: string | null;
  createdAt: number;
}

export default function StudentComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New ticket modal
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<"academic" | "faculty" | "facility" | "fee" | "transport" | "other">("academic");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.post<{ ticketNumber: string }>("/complaints", {
        category,
        priority,
        title,
        description,
      });

      setStatusMessage({
        type: "success",
        text: `Inquiry ticket #${res.ticketNumber} registered successfully!`,
      });
      setModalOpen(false);
      setTitle("");
      setDescription("");
      fetchComplaints();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to register inquiry." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComplaint = async (id: string, ticketNumber: string) => {
    const confirmDelete = window.confirm(`Delete inquiry ticket #${ticketNumber}?`);
    if (!confirmDelete) return;

    try {
      await api.complaints.delete(id);
      setStatusMessage({ type: "success", text: `Ticket #${ticketNumber} deleted.` });
      fetchComplaints();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert("Failed to delete ticket: " + (err?.message || "Server error"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Ticket Open</span>;
      case "in_progress":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">In Review</span>;
      case "resolved":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case "escalated":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Escalated</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Helpdesk & Inquiries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit academic feedback, operational inquiries, or fee questions to the administration.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Inquiry Ticket</span>
        </button>
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

      {/* Ticket List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <LifeBuoy className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Inquiries Submitted</h3>
            <p className="text-xs text-slate-500 mt-1">
              Have a question or feedback? Click &quot;New Inquiry Ticket&quot; to contact institute coordinators.
            </p>
          </div>
        ) : (
          complaints.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.ticketNumber}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{item.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt * 1000).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteComplaint(item.id, item.ticketNumber)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{item.description}</p>

              {item.resolutionNotes && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resolution from Academy Desk:</span>
                  </p>
                  <p className="text-emerald-800">{item.resolutionNotes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Inquiry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">New Inquiry / Feedback Ticket</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Inquiry Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="academic">Academic / Curriculum</option>
                    <option value="faculty">Faculty Inquiry</option>
                    <option value="facility">Classroom / Facility</option>
                    <option value="fee">Fees / Billing</option>
                    <option value="transport">Transport</option>
                    <option value="other">General Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Urgency Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of your question or issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide all relevant details to help our academic team assist you..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

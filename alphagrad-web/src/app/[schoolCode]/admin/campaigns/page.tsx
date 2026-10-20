"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	Megaphone,
	Calendar,
	Sparkles,
	Eye,
	Plus,
	Trash2,
	Edit3,
	CheckCircle,
	AlertCircle,
	Smartphone,
	Monitor,
	ArrowRight,
	ExternalLink,
} from "lucide-react";

export default function AdminCampaignsPage() {
	const [campaigns, setCampaigns] = useState<any[]>([]);
	const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Campaign Edit / Create modal or pane
	const [isEditing, setIsEditing] = useState(false);
	const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
	const [formData, setFormData] = useState({
		id: "",
		title: "",
		campaignType: "admission",
		headline: "",
		subheadline: "",
		description: "",
		ctaText: "Enroll Today",
		ctaUrl: "/contact",
		secondaryCtaText: "",
		secondaryCtaUrl: "",
		badgeText: "Academic Year 2026–2027",
		startDate: new Date().toISOString().split("T")[0],
		endDate: new Date(Date.now() + 90 * 86400 * 1000).toISOString().split("T")[0],
		priority: 10,
		isActive: true,
		isDefault: false,
		seoTitle: "",
		seoDescription: "",
		seoKeywords: "",
	});

	useEffect(() => {
		loadCampaigns();
	}, []);

	const loadCampaigns = async () => {
		setLoading(true);
		try {
			const [listRes, activeRes] = await Promise.all([
				api.campaigns.list(),
				api.campaigns.active(),
			]);
			setCampaigns(listRes.campaigns || []);
			setActiveCampaign(activeRes.campaign || null);
		} catch (err: any) {
			setError(err?.message || "Failed to load campaigns");
		} finally {
			setLoading(false);
		}
	};

	const openCreateForm = () => {
		setFormData({
			id: "",
			title: "",
			campaignType: "admission",
			headline: "Admissions Open — Build Your Academic Future with Proventus Academy",
			subheadline: "Premier NIOS Open Schooling & CBSE/ICSE Foundation Coaching in Bangalore",
			description:
				"Empowering students across Grades 1–12 with personalized 15-student cohorts, 24/7 AI Doubt Solving, and structured exam test series.",
			ctaText: "Apply for Admission",
			ctaUrl: "/contact",
			secondaryCtaText: "Meet Proventus AI Tutor",
			secondaryCtaUrl: "/portal/ai-tutor",
			badgeText: "Admissions Open 2026–2027",
			startDate: new Date().toISOString().split("T")[0],
			endDate: new Date(Date.now() + 60 * 86400 * 1000).toISOString().split("T")[0],
			priority: 20,
			isActive: true,
			isDefault: false,
			seoTitle: "Admissions Open 2026-27 | Proventus Academy Bangalore",
			seoDescription: "Enroll today for NIOS Open Schooling and CBSE/ICSE foundation coaching in Kothanur.",
			seoKeywords: "Admissions 2026, Proventus Academy, NIOS Bangalore",
		});
		setIsEditing(true);
	};

	const openEditForm = (camp: any) => {
		setFormData({
			id: camp.id,
			title: camp.title,
			campaignType: camp.campaignType,
			headline: camp.headline,
			subheadline: camp.subheadline || "",
			description: camp.description || "",
			ctaText: camp.ctaText || "Enroll Today",
			ctaUrl: camp.ctaUrl || "/contact",
			secondaryCtaText: camp.secondaryCtaText || "",
			secondaryCtaUrl: camp.secondaryCtaUrl || "",
			badgeText: camp.badgeText || "",
			startDate: camp.startDate,
			endDate: camp.endDate,
			priority: camp.priority || 10,
			isActive: camp.isActive === 1,
			isDefault: camp.isDefault === 1,
			seoTitle: camp.seoTitle || "",
			seoDescription: camp.seoDescription || "",
			seoKeywords: Array.isArray(camp.seoKeywords) ? camp.seoKeywords.join(", ") : "",
		});
		setIsEditing(true);
	};

	const handleSaveCampaign = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccessMsg(null);

		const keywordsArray = formData.seoKeywords
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);

		const payload = {
			...formData,
			seoKeywords: keywordsArray,
		};

		try {
			if (formData.id) {
				await api.campaigns.update(formData.id, payload);
				setSuccessMsg("Campaign updated successfully!");
			} else {
				await api.campaigns.create(payload);
				setSuccessMsg("New campaign created and scheduled!");
			}
			setIsEditing(false);
			loadCampaigns();
		} catch (err: any) {
			setError(err?.message || "Failed to save campaign");
		}
	};

	const handleDeleteCampaign = async (id: string) => {
		if (!confirm("Are you sure you want to delete this campaign?")) return;
		try {
			await api.campaigns.delete(id);
			setCampaigns((prev) => prev.filter((c) => c.id !== id));
		} catch (err: any) {
			alert(err?.message || "Failed to delete campaign");
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			{/* Top Header */}
			<div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center space-x-3.5">
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
						<Megaphone className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
							Seasonal Campaigns & Dynamic SEO
						</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Automatically adapt promotional banners, headlines, CTAs, and SEO metadata to the academic calendar.
						</p>
					</div>
				</div>

				<button
					onClick={openCreateForm}
					className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
				>
					<Plus className="w-4 h-4" />
					<span>New Campaign</span>
				</button>
			</div>

			{/* Currently Active Campaign Status Card */}
			{activeCampaign && (
				<div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-2">
							<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
							<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
								Currently Live on Homepage & Portal
							</span>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
								{activeCampaign.campaignType} Season
							</span>
						</div>
						<h3 className="text-sm sm:text-base font-bold mt-1 text-white">{activeCampaign.headline}</h3>
						<p className="text-xs text-slate-300 mt-0.5">
							Schedule: {activeCampaign.startDate} to {activeCampaign.endDate} • Priority: {activeCampaign.priority}
						</p>
					</div>
					<div className="text-right shrink-0">
						<span className="text-xs font-bold bg-white text-indigo-900 px-3 py-1.5 rounded-xl shadow-xs">
							CTA: {activeCampaign.ctaText}
						</span>
					</div>
				</div>
			)}

			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
					<CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
					<span>{successMsg}</span>
				</div>
			)}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{isEditing ? (
				// Edit Form + Live Preview Workbench
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Form Column */}
					<div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-xs">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h2 className="text-sm font-bold text-slate-900">
								{formData.id ? "Edit Campaign" : "Create New Seasonal Campaign"}
							</h2>
							<button onClick={() => setIsEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">
								Cancel
							</button>
						</div>

						<form onSubmit={handleSaveCampaign} className="space-y-3.5 text-xs">
							<div>
								<label className="font-bold text-slate-700 block mb-1">Internal Campaign Title</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									required
									placeholder="e.g. 2026-27 Admission Drive"
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="font-bold text-slate-700 block mb-1">Campaign Type</label>
									<select
										value={formData.campaignType}
										onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
									>
										<option value="admission">Admission Season</option>
										<option value="examination">Examination Season</option>
										<option value="regular">Regular Academic Season</option>
									</select>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">Badge Text</label>
									<input
										type="text"
										value={formData.badgeText}
										onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
										placeholder="e.g. Admissions Open 2026"
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
									/>
								</div>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Hero Headline</label>
								<input
									type="text"
									value={formData.headline}
									onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
									required
									placeholder="Headline displayed on homepage hero..."
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Subheadline</label>
								<input
									type="text"
									value={formData.subheadline}
									onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
									placeholder="Secondary subtitle..."
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
								/>
							</div>

							<div>
								<label className="font-bold text-slate-700 block mb-1">Promotional Description</label>
								<textarea
									rows={2}
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="font-bold text-slate-700 block mb-1">Primary CTA Text</label>
									<input
										type="text"
										value={formData.ctaText}
										onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
									/>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">Primary CTA URL</label>
									<input
										type="text"
										value={formData.ctaUrl}
										onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-3">
								<div>
									<label className="font-bold text-slate-700 block mb-1">Start Date</label>
									<input
										type="date"
										value={formData.startDate}
										onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
										required
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
									/>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">End Date</label>
									<input
										type="date"
										value={formData.endDate}
										onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
										required
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
									/>
								</div>
								<div>
									<label className="font-bold text-slate-700 block mb-1">Priority (Order)</label>
									<input
										type="number"
										value={formData.priority}
										onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
									/>
								</div>
							</div>

							{/* SEO Metadata */}
							<div className="pt-3 border-t border-slate-100 space-y-2">
								<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamic SEO & Open Graph</p>
								<div>
									<input
										type="text"
										value={formData.seoTitle}
										onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
										placeholder="SEO Title Tag (e.g. Admissions Open 2026-27 | Proventus Academy)"
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
									/>
								</div>
								<div>
									<input
										type="text"
										value={formData.seoKeywords}
										onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
										placeholder="SEO Keywords (comma separated)"
										className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
									/>
								</div>
							</div>

							<div className="flex items-center gap-4 pt-2">
								<label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
									<input
										type="checkbox"
										checked={formData.isActive}
										onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
										className="rounded text-indigo-600"
									/>
									<span>Campaign Enabled</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
									<input
										type="checkbox"
										checked={formData.isDefault}
										onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
										className="rounded text-indigo-600"
									/>
									<span>Default Fallback</span>
								</label>
							</div>

							<div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsEditing(false)}
									className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs"
								>
									Save Campaign
								</button>
							</div>
						</form>
					</div>

					{/* Live Desktop & Mobile Preview Pane */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
							<div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs">
								<button
									onClick={() => setPreviewMode("desktop")}
									className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
										previewMode === "desktop" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"
									}`}
								>
									<Monitor className="w-3.5 h-3.5" />
									<span>Desktop</span>
								</button>
								<button
									onClick={() => setPreviewMode("mobile")}
									className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
										previewMode === "mobile" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"
									}`}
								>
									<Smartphone className="w-3.5 h-3.5" />
									<span>Mobile</span>
								</button>
							</div>
						</div>

						{/* Preview Frame */}
						<div
							className={`mx-auto bg-slate-900 rounded-3xl p-6 text-white border-4 border-slate-800 shadow-xl transition-all duration-300 ${
								previewMode === "mobile" ? "max-w-xs" : "w-full"
							}`}
						>
							<div className="space-y-4">
								<div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
									{formData.badgeText || "Admissions 2026-27"}
								</div>

								<h1
									className={`font-black tracking-tight leading-tight ${
										previewMode === "mobile" ? "text-lg" : "text-2xl"
									}`}
								>
									{formData.headline || "Seasonal Headline Goes Here"}
								</h1>

								{formData.subheadline && (
									<p className="text-xs text-indigo-200 font-semibold">{formData.subheadline}</p>
								)}

								<p className="text-xs text-slate-300 leading-relaxed">
									{formData.description || "Promotional description text will be rendered here."}
								</p>

								<div className="pt-2 flex flex-wrap gap-2">
									<div className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-xs shadow-md">
										{formData.ctaText || "Enroll Today"}
									</div>
									{formData.secondaryCtaText && (
										<div className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/20">
											{formData.secondaryCtaText}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				// Campaigns Table
				<div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
								<tr>
									<th className="p-4">Campaign Title</th>
									<th className="p-4">Type</th>
									<th className="p-4">Date Window</th>
									<th className="p-4 text-center">Priority</th>
									<th className="p-4 text-center">Status</th>
									<th className="p-4 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 font-medium text-slate-800">
								{campaigns.map((c) => (
									<tr key={c.id} className="hover:bg-slate-50/70 transition">
										<td className="p-4 font-bold text-slate-900">
											<div>{c.title}</div>
											<div className="text-[11px] text-slate-400 font-normal line-clamp-1">{c.headline}</div>
										</td>
										<td className="p-4">
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
												{c.campaignType}
											</span>
										</td>
										<td className="p-4 font-mono text-[11px] text-slate-600">
											{c.startDate} → {c.endDate}
										</td>
										<td className="p-4 text-center font-bold">{c.priority}</td>
										<td className="p-4 text-center">
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
													c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
												}`}
											>
												{c.isActive ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="p-4 text-right space-x-2">
											<button
												onClick={() => openEditForm(c)}
												className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
												title="Edit"
											>
												<Edit3 className="w-3.5 h-3.5" />
											</button>
											<button
												onClick={() => handleDeleteCampaign(c.id)}
												className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600"
												title="Delete"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

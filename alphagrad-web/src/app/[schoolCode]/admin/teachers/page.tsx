"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	GraduationCap,
	Plus,
	CheckCircle2,
	X,
	Copy,
	Check,
	AlertCircle,
	BookOpen,
	Trash2,
	Layers,
	Mail,
	Phone,
	UserCheck,
	Key,
	Eye,
	EyeOff,
	Clock,
	CalendarCheck,
	CheckCircle,
	Circle,
	ListTodo,
	ChevronRight,
	BarChart2,
	ShieldCheck,
	ArrowRight,
	ExternalLink
} from "lucide-react";
import BouncingLoader from "@/components/BouncingLoader";

const GRADE_GROUPS = [
	{ id: "1-4", label: "Grade 1-4", subtext: "Primary (Grades 1, 2, 3, 4)" },
	{ id: "5-8", label: "Grade 5-8", subtext: "Middle School (Grades 5, 6, 7, 8)" },
	{ id: "9-12", label: "Grade 9-12", subtext: "Secondary & Sr. Sec (Grades 9-12)" },
	{ id: "9-12 NIOS", label: "9-12 NIOS", subtext: "NIOS Open Schooling" },
];

function groupTeacherAssignments(assignments: any[]) {
	if (!assignments || assignments.length === 0) return [];

	const bySubject: Record<string, any[]> = {};
	for (const a of assignments) {
		const key = a.subjectName || "Subject";
		if (!bySubject[key]) bySubject[key] = [];
		bySubject[key].push(a);
	}

	const groupedBadges: Array<{
		key: string;
		label: string;
		subject: string;
		assignmentIds: string[];
	}> = [];

	for (const [subjectName, items] of Object.entries(bySubject)) {
		// Grade 1-4
		const g1to4 = items.filter((x) => {
			const n = (x.batchName || "").toLowerCase();
			const c = (x.batchCode || "").toLowerCase();
			return [1, 2, 3, 4].some((i) => n === `grade ${i}` || c.startsWith(`g${i}`));
		});
		// Grade 5-8
		const g5to8 = items.filter((x) => {
			const n = (x.batchName || "").toLowerCase();
			const c = (x.batchCode || "").toLowerCase();
			return [5, 6, 7, 8].some((i) => n === `grade ${i}` || c.startsWith(`g${i}`));
		});
		// Grade 9-12 (non-nios)
		const g9to12 = items.filter((x) => {
			const n = (x.batchName || "").toLowerCase();
			const c = (x.batchCode || "").toLowerCase();
			return (
				!n.includes("nios") &&
				!c.includes("nios") &&
				[9, 10, 11, 12].some((i) => n === `grade ${i}` || c.startsWith(`g${i}`))
			);
		});
		// NIOS
		const nios = items.filter((x) => {
			const n = (x.batchName || "").toLowerCase();
			const c = (x.batchCode || "").toLowerCase();
			return n.includes("nios") || c.includes("nios");
		});

		const handledIds = new Set<string>();

		if (g1to4.length >= 2) {
			groupedBadges.push({
				key: `1-4-${subjectName}`,
				label: "Grade 1-4",
				subject: subjectName,
				assignmentIds: g1to4.map((x) => x.id),
			});
			g1to4.forEach((x) => handledIds.add(x.id));
		}

		if (g5to8.length >= 2) {
			groupedBadges.push({
				key: `5-8-${subjectName}`,
				label: "Grade 5-8",
				subject: subjectName,
				assignmentIds: g5to8.map((x) => x.id),
			});
			g5to8.forEach((x) => handledIds.add(x.id));
		}

		if (g9to12.length >= 2) {
			groupedBadges.push({
				key: `9-12-${subjectName}`,
				label: "Grade 9-12",
				subject: subjectName,
				assignmentIds: g9to12.map((x) => x.id),
			});
			g9to12.forEach((x) => handledIds.add(x.id));
		}

		if (nios.length > 0) {
			groupedBadges.push({
				key: `nios-${subjectName}`,
				label: "9-12 NIOS",
				subject: subjectName,
				assignmentIds: nios.map((x) => x.id),
			});
			nios.forEach((x) => handledIds.add(x.id));
		}

		for (const x of items) {
			if (!handledIds.has(x.id)) {
				groupedBadges.push({
					key: x.id,
					label: x.batchName || "Class",
					subject: subjectName,
					assignmentIds: [x.id],
				});
			}
		}
	}

	return groupedBadges;
}

export default function AdminTeachersPage() {
	const [teachers, setTeachers] = useState<any[]>([]);
	const [batches, setBatches] = useState<any[]>([]);
	const [subjects, setSubjects] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isAssignOpen, setIsAssignOpen] = useState(false);
	const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
	const [copied, setCopied] = useState(false);
	const [createdCredentials, setCreatedCredentials] = useState<any>(null);
	const [showPassword, setShowPassword] = useState(true);
	const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

	// Comprehensive Teacher Dossier Modal State
	const [dossierTeacher, setDossierTeacher] = useState<any>(null);
	const [dossierTab, setDossierTab] = useState<"chapters" | "attendance" | "tasks" | "batches">("chapters");
	const [loadingDossier, setLoadingDossier] = useState(false);
	const [curriculumOversight, setCurriculumOversight] = useState<any[]>([]);
	const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
	const [teacherTasks, setTeacherTasks] = useState<any[]>([]);

	// Attendance marking form for teacher
	const [attDate, setAttDate] = useState<string>(new Date().toISOString().split("T")[0]);
	const [attStatus, setAttStatus] = useState<"present" | "absent" | "half_day">("present");
	const [attNotes, setAttNotes] = useState<string>("");
	const [markingAttendance, setMarkingAttendance] = useState(false);

	// New task for teacher form
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [newTaskDue, setNewTaskDue] = useState("");
	const [newTaskPriority, setNewTaskPriority] = useState<"urgent" | "high" | "normal">("normal");
	const [creatingTask, setCreatingTask] = useState(false);

	const toggleRevealPassword = (id: string) => {
		setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// Form state
	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		phone: "",
		designation: "Subject Faculty",
		specialization: "",
		monthlySalaryInRupees: 35000,
		batchId: "",
		subjectId: "",
		isClassTeacher: false,
	});

	// Multi-select states for Add Faculty modal
	const [selectedGradeGroups, setSelectedGradeGroups] = useState<string[]>([]);
	const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

	// Multi-select states for Assign Grade/Class modal
	const [assignGradeGroups, setAssignGradeGroups] = useState<string[]>([]);
	const [assignSubjectIds, setAssignSubjectIds] = useState<string[]>([]);
	const [assignIsClassTeacher, setAssignIsClassTeacher] = useState(false);

	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		setError(null);
		try {
			const [tchRes, batchRes, subRes] = await Promise.all([
				api.teachers.list(),
				api.academic.batches(),
				api.academic.subjects(),
			]);
			setTeachers(tchRes.teachers || []);
			setBatches(batchRes.batches || []);
			setSubjects(subRes.subjects || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load faculty directory");
		} finally {
			setLoading(false);
		}
	}

	// Open Teacher Dossier & load curriculum oversight, attendance, and tasks
	const handleOpenDossier = async (teacher: any) => {
		setDossierTeacher(teacher);
		setDossierTab("chapters");
		setLoadingDossier(true);

		try {
			const [curricRes, attRes, taskRes] = await Promise.all([
				api.teachers.getChaptersOversight(teacher.id).catch(() => ({ curriculumOversight: [] })),
				api.teachers.getAttendance(teacher.id).catch(() => ({ attendance: [] })),
				api.tasks.list({ assignedToType: "teacher", assignedToId: teacher.id }).catch(() => ({ tasks: [] })),
			]);

			setCurriculumOversight(curricRes.curriculumOversight || []);
			setTeacherAttendance(attRes.attendance || []);
			setTeacherTasks(taskRes.tasks || []);
		} catch (err) {
			console.error("Failed to load full teacher dossier:", err);
		} finally {
			setLoadingDossier(false);
		}
	};

	// Mark Attendance for Teacher
	const handleMarkTeacherAttendance = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dossierTeacher) return;

		setMarkingAttendance(true);
		try {
			await api.teachers.markAttendance(dossierTeacher.id, {
				date: attDate,
				status: attStatus,
				notes: attNotes.trim() || undefined,
			});

			// Refresh attendance
			const attRes = await api.teachers.getAttendance(dossierTeacher.id);
			setTeacherAttendance(attRes.attendance || []);
			setAttNotes("");
			setSuccessMsg(`Attendance recorded as "${attStatus.toUpperCase()}" for ${dossierTeacher.fullName}`);
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to record attendance: ${err?.message || "Server error"}`);
		} finally {
			setMarkingAttendance(false);
		}
	};

	// Assign Task to Teacher
	const handleCreateTeacherTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dossierTeacher || !newTaskTitle.trim()) return;

		setCreatingTask(true);
		try {
			const res = await api.tasks.create({
				title: newTaskTitle.trim(),
				assignedToType: "teacher",
				assignedToId: dossierTeacher.id,
				priority: newTaskPriority,
				dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : null,
			});

			setTeacherTasks((prev) => [res.task, ...prev]);
			setNewTaskTitle("");
			setNewTaskDue("");
			setSuccessMsg(`Task assigned to ${dossierTeacher.fullName}!`);
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to assign task: ${err?.message || "Server error"}`);
		} finally {
			setCreatingTask(false);
		}
	};

	const handleCreateTeacher = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			const payload = {
				fullName: formData.fullName.trim(),
				email: formData.email.trim() || undefined,
				phone: formData.phone.trim() || undefined,
				designation: formData.designation.trim() || "Subject Faculty",
				specialization: formData.specialization.trim() || undefined,
				monthlySalaryInRupees: Number(formData.monthlySalaryInRupees) || 0,
				gradeGroups: selectedGradeGroups.length > 0 ? selectedGradeGroups : undefined,
				subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
				isClassTeacher: formData.isClassTeacher,
			};

			const res = await api.teachers.create(payload);
			const generatedPwd = res.credentials?.password || res.credentials?.defaultPassword || "Proventus@3393";

			setCreatedCredentials({
				username: res.credentials.username,
				defaultPassword: generatedPwd,
				fullName: formData.fullName,
				title: "Faculty Registered Successfully",
			});
			setShowPassword(true);
			setIsCreateOpen(false);
			setFormData({
				fullName: "",
				email: "",
				phone: "",
				designation: "Subject Faculty",
				specialization: "",
				monthlySalaryInRupees: 35000,
				batchId: "",
				subjectId: "",
				isClassTeacher: false,
			});
			setSelectedGradeGroups([]);
			setSelectedSubjectIds([]);
			setSuccessMsg(`Faculty member "${formData.fullName}" created successfully! Generated Password: ${generatedPwd}`);
			setTimeout(() => setSuccessMsg(null), 8000);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to create faculty profile");
		} finally {
			setSubmitting(false);
		}
	};

	const handleViewCredentials = (teacher: any) => {
		setCreatedCredentials({
			fullName: teacher.fullName,
			username: teacher.username,
			defaultPassword: teacher.password || "Proventus@3393",
			userId: teacher.userId,
			title: "Faculty Login Credentials",
		});
		setShowPassword(true);
	};

	const handleResetPassword = async (userId: string) => {
		const confirmReset = window.confirm(
			"Are you sure you want to generate a new password for this faculty member?"
		);
		if (!confirmReset) return;

		try {
			const res = await api.auth.resetPassword({ userId });
			setCreatedCredentials({
				fullName: res.fullName,
				username: res.username,
				defaultPassword: res.password,
				userId,
				title: "New Password Generated",
			});
			setShowPassword(true);
			setSuccessMsg("Password regenerated successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to reset password: ${err?.message || "Server error"}`);
		}
	};

	const handleAssign = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedTeacher) return;
		if (assignGradeGroups.length === 0) {
			setError("Please select at least one Grade / Class (e.g. 1-4, 5-8, 9-12, 9-12 NIOS)");
			return;
		}
		setSubmitting(true);

		try {
			await api.teachers.assign({
				teacherId: selectedTeacher.id,
				gradeGroups: assignGradeGroups,
				subjectIds: assignSubjectIds.length > 0 ? assignSubjectIds : undefined,
				isClassTeacher: assignIsClassTeacher,
			});
			setIsAssignOpen(false);
			setAssignGradeGroups([]);
			setAssignSubjectIds([]);
			setAssignIsClassTeacher(false);
			setSuccessMsg("Faculty batch assignments updated successfully!");
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
			if (dossierTeacher?.id === selectedTeacher.id) {
				handleOpenDossier(selectedTeacher);
			}
		} catch (err: any) {
			setError(err?.message || "Failed to assign faculty to batch");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteTeacher = async (teacher: any) => {
		const confirmDelete = window.confirm(
			`Are you sure you want to delete faculty member "${teacher.fullName}" (${teacher.username})?\n\nThis will remove their profile and login access.`
		);
		if (!confirmDelete) return;

		try {
			await api.teachers.delete(teacher.id);
			setSuccessMsg(`Faculty "${teacher.fullName}" deleted successfully.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to delete faculty: ${err?.message || "Server error"}`);
		}
	};

	const handleRemoveGroupedAssignment = async (assignmentIds: string[], label: string) => {
		const confirmRemove = window.confirm(`Remove assignment for "${label}"?`);
		if (!confirmRemove) return;

		try {
			if (assignmentIds.length === 1) {
				await api.teachers.removeAssignment(assignmentIds[0]);
			} else {
				await api.teachers.bulkRemoveAssignments(assignmentIds);
			}
			setSuccessMsg(`Assignment for "${label}" removed.`);
			setTimeout(() => setSuccessMsg(null), 3000);
			loadData();
		} catch (err: any) {
			alert(`Failed to remove assignment: ${err?.message || "Server error"}`);
		}
	};

	const handleRemoveAssignment = async (assignmentId: string, batchName: string) => {
		await handleRemoveGroupedAssignment([assignmentId], batchName);
	};

	return (
		<div className="space-y-6">
			{/* Top Bar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold">
						<GraduationCap className="w-3.5 h-3.5" />
						<span>Faculty Segment • Curriculum & Attendance Oversight</span>
					</div>
					<h1 className="text-xl font-bold text-slate-900 mt-1">Faculty & Staff Directory</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Inspect whether educators are actively completing syllabus chapters for students, review faculty attendance, and assign directives.
					</p>
				</div>
				<button
					onClick={() => setIsCreateOpen(true)}
					className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
				>
					<Plus className="w-4 h-4" />
					Add Faculty Member
				</button>
			</div>

			{/* Success Alert */}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
						<span>{successMsg}</span>
					</div>
					<button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Error Alert */}
			{error && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 flex-shrink-0" />
						<span>{error}</span>
					</div>
					<button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Faculty Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{loading ? (
					<div className="col-span-full">
						<BouncingLoader text="Loading faculty directory..." color="indigo" />
					</div>
				) : teachers.length === 0 ? (
					<div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
						<GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
						<p className="font-semibold text-sm text-slate-800">No faculty members found</p>
						<p className="text-xs text-slate-400 mt-1">
							Click &quot;Add Faculty Member&quot; to register teachers and assign their teaching batches.
						</p>
					</div>
				) : (
					teachers.map((t) => (
						<div key={t.id} className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-sm space-y-4 flex flex-col justify-between transition group">
							<div className="space-y-3">
								<div className="flex items-start justify-between">
									<div className="cursor-pointer" onClick={() => handleOpenDossier(t)}>
										<h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
											<span>{t.fullName}</span>
											<ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
										</h3>
										<div className="text-[11px] text-indigo-600 font-semibold">{t.designation}</div>
										<div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.employeeId}</div>
									</div>
									<span className="inline-flex px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
										{t.username}
									</span>
								</div>

								{/* Direct Password Viewer */}
								<div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
									<div className="flex items-center gap-1.5">
										<span className="text-[11px] font-semibold text-slate-500">Password:</span>
										<span className="font-mono font-bold text-slate-900">
											{revealedPasswords[t.id] ? (t.password || "Proventus@3393") : "••••••••••••"}
										</span>
									</div>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => toggleRevealPassword(t.id)}
											className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition"
											title={revealedPasswords[t.id] ? "Hide Password" : "View Password"}
										>
											{revealedPasswords[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
										</button>
										<button
											type="button"
											onClick={() => {
												navigator.clipboard.writeText(t.password || "Proventus@3393");
												setSuccessMsg(`Copied password for ${t.fullName}`);
												setTimeout(() => setSuccessMsg(null), 2500);
											}}
											className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-white transition"
											title="Copy Password"
										>
											<Copy className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>

								<div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
									<div className="flex items-center gap-2">
										<BookOpen className="w-3.5 h-3.5 text-slate-400" />
										<span>{t.specialization || "General Faculty"}</span>
									</div>
									{t.email && (
										<div className="flex items-center gap-2 truncate">
											<Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
											<span className="truncate">{t.email}</span>
										</div>
									)}
									{t.phone && (
										<div className="flex items-center gap-2">
											<Phone className="w-3.5 h-3.5 text-slate-400" />
											<span>{t.phone}</span>
										</div>
									)}
								</div>

								{/* Assigned Classes (Clean Grouped Display) */}
								<div className="pt-2 border-t border-slate-100">
									{(() => {
										const groupedBadges = groupTeacherAssignments(t.assignments);
										return (
											<>
												<div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
													<span>Assigned Classes ({groupedBadges.length})</span>
												</div>
												{groupedBadges.length > 0 ? (
													<div className="flex flex-wrap gap-1.5">
														{groupedBadges.map((badge) => (
															<span
																key={badge.key}
																className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-900 border border-indigo-200"
															>
																<span className="font-extrabold text-indigo-700">{badge.label}</span>
																<span className="text-slate-600">({badge.subject})</span>
																<button
																	onClick={() =>
																		handleRemoveGroupedAssignment(
																			badge.assignmentIds,
																			`${badge.label} (${badge.subject})`
																		)
																	}
																	title="Remove class assignment"
																	className="text-slate-400 hover:text-red-600 transition ml-0.5"
																>
																	<X className="w-3 h-3" />
																</button>
															</span>
														))}
													</div>
												) : (
													<p className="text-[11px] text-amber-600 italic">No classes assigned yet.</p>
												)}
											</>
										);
									})()}
								</div>
							</div>

							<div className="pt-3 border-t border-slate-100 space-y-2">
								{/* Direct Chapter Oversight & Profile Button */}
								<button
									onClick={() => handleOpenDossier(t)}
									className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition"
								>
									<BarChart2 className="w-3.5 h-3.5" />
									<span>Inspect Chapters & Attendance</span>
								</button>

								<div className="flex items-center gap-2">
									<button
										onClick={() => {
											setSelectedTeacher(t);
											setIsAssignOpen(true);
										}}
										className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition text-center"
									>
										+ Assign Grade/Class
									</button>
									<button
										onClick={() => handleViewCredentials(t)}
										title="View Login Credentials"
										className="p-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
									>
										<Key className="w-4 h-4" />
									</button>
									<button
										onClick={() => handleDeleteTeacher(t)}
										title="Delete Faculty Profile"
										className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* ================= COMPREHENSIVE FACULTY DOSSIER MODAL ================= */}
			{dossierTeacher && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
						{/* Header */}
						<div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
							<div className="flex items-center gap-3.5">
								<div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
									{dossierTeacher.fullName.charAt(0)}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-base font-extrabold text-slate-900">{dossierTeacher.fullName}</h2>
										<span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
											{dossierTeacher.username}
										</span>
									</div>
									<p className="text-xs text-slate-500 mt-0.5">
										{dossierTeacher.designation} • {dossierTeacher.specialization || "General Faculty"} • ID: {dossierTeacher.employeeId}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2 self-end sm:self-auto">
								<button
									onClick={() => handleViewCredentials(dossierTeacher)}
									className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5 shadow-sm"
								>
									<Key className="w-3.5 h-3.5" />
									<span>Credentials</span>
								</button>
								<button
									onClick={() => setDossierTeacher(null)}
									className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Tabs */}
						<div className="px-5 border-b border-slate-200 flex gap-4 text-xs font-bold text-slate-500 overflow-x-auto bg-white">
							<button
								onClick={() => setDossierTab("chapters")}
								className={`py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
									dossierTab === "chapters"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<BookOpen className="w-3.5 h-3.5" />
								<span>Curriculum & Chapters Oversight</span>
							</button>
							<button
								onClick={() => setDossierTab("attendance")}
								className={`py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
									dossierTab === "attendance"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<CalendarCheck className="w-3.5 h-3.5" />
								<span>Teacher Attendance ({teacherAttendance.length})</span>
							</button>
							<button
								onClick={() => setDossierTab("tasks")}
								className={`py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
									dossierTab === "tasks"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<ListTodo className="w-3.5 h-3.5" />
								<span>Assigned Tasks ({teacherTasks.length})</span>
							</button>
							<button
								onClick={() => setDossierTab("batches")}
								className={`py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
									dossierTab === "batches"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<Layers className="w-3.5 h-3.5" />
								<span>Batch Allocations ({dossierTeacher.assignments?.length || 0})</span>
							</button>
						</div>

						{/* Modal Body */}
						<div className="p-5 overflow-y-auto flex-1 space-y-4">
							{loadingDossier ? (
								<BouncingLoader text="Loading faculty dossier & academic records..." color="indigo" />
							) : (
								<>
									{/* TAB 1: CURRICULUM & CHAPTERS OVERSIGHT */}
									{dossierTab === "chapters" && (
										<div className="space-y-4">
											<div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div>
													<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
														Curriculum Accountability
													</span>
													<h3 className="text-sm font-bold text-slate-900 mt-0.5">
														Tracking If Teacher is Progressing Chapters for Students
													</h3>
													<p className="text-xs text-slate-500 mt-0.5">
														Inspecting syllabus completion rate across all assigned batches & subjects.
													</p>
												</div>

												<div className="flex items-center gap-2">
													<div className="text-right">
														<span className="text-xs font-bold text-indigo-900">
															{curriculumOversight.reduce((acc, curr) => acc + (curr.completedCount || 0), 0)} /{" "}
															{curriculumOversight.reduce((acc, curr) => acc + (curr.totalChapters || 0), 0)}
														</span>
														<div className="text-[10px] text-slate-500 font-medium">Chapters Finished</div>
													</div>
												</div>
											</div>

											{curriculumOversight.length === 0 ? (
												<div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
													<BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
													<p className="text-xs font-semibold text-slate-700">No batch syllabus assigned</p>
													<p className="text-[11px] text-slate-500 mt-0.5">
														Assign this teacher to a batch and subject to start tracking their chapter completion.
													</p>
												</div>
											) : (
												<div className="space-y-4">
													{curriculumOversight.map((item, idx) => (
														<div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
															<div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
																<div>
																	<div className="flex items-center gap-2">
																		<span className="text-xs font-bold text-slate-900">{item.batchName}</span>
																		<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-semibold border border-slate-200">
																			{item.subjectName}
																		</span>
																	</div>
																	<p className="text-[10px] text-slate-500 mt-0.5">
																		{item.completedCount} Completed • {item.inProgressCount} In Progress • {item.pendingCount} Pending
																	</p>
																</div>

																<div className="flex items-center gap-3">
																	<div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
																		<div
																			className="bg-emerald-600 h-2 rounded-full transition-all"
																			style={{ width: `${item.completionPercentage || 0}%` }}
																		/>
																	</div>
																	<span className="text-xs font-bold text-emerald-700 w-10 text-right">
																		{item.completionPercentage}%
																	</span>
																</div>
															</div>

															{/* Chapter List */}
															<div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
																{item.chapters && item.chapters.length > 0 ? (
																	item.chapters.map((ch: any) => (
																		<div key={ch.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition">
																			<div className="flex items-center gap-2.5">
																				<span className="font-mono text-slate-400 font-bold text-[11px]">
																					#{ch.chapterNumber}
																				</span>
																				<div>
																					<div className="font-semibold text-slate-900">{ch.chapterTitle || ch.title || "Untitled Chapter"}</div>
																					{ch.completionDate && (
																						<div className="text-[10px] text-emerald-600">
																							Completed: {new Date(ch.completionDate).toLocaleDateString("en-IN")}
																						</div>
																					)}
																				</div>
																			</div>

																			<span
																				className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
																					ch.status === "completed"
																						? "bg-emerald-100 text-emerald-800"
																						: ch.status === "in_progress"
																						? "bg-amber-100 text-amber-800"
																						: "bg-slate-100 text-slate-600"
																				}`}
																			>
																				{ch.status.replace("_", " ")}
																			</span>
																		</div>
																	))
																) : (
																	<div className="p-4 text-center text-xs text-slate-400">
																		No chapters created yet under this subject.
																	</div>
																)}
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)}

									{/* TAB 2: FACULTY ATTENDANCE */}
									{dossierTab === "attendance" && (
										<div className="space-y-4">
											{/* Mark Attendance Form */}
											<form
												onSubmit={handleMarkTeacherAttendance}
												className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
											>
												<div className="flex items-center justify-between">
													<span className="font-bold text-slate-900 text-xs">
														Record Attendance for {dossierTeacher.fullName}
													</span>
													<span className="text-[10px] text-slate-500">Daily Faculty Register</span>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
													<div>
														<label className="block text-[11px] font-semibold text-slate-600 mb-1">Date *</label>
														<input
															type="date"
															required
															value={attDate}
															onChange={(e) => setAttDate(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>

													<div>
														<label className="block text-[11px] font-semibold text-slate-600 mb-1">Status *</label>
														<select
															value={attStatus}
															onChange={(e) => setAttStatus(e.target.value as any)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 font-semibold"
														>
															<option value="present">Present</option>
															<option value="absent">Absent</option>
															<option value="half_day">Half Day</option>
														</select>
													</div>

													<div>
														<label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes / Reason</label>
														<input
															type="text"
															placeholder="e.g. On-time, took morning session"
															value={attNotes}
															onChange={(e) => setAttNotes(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>
												</div>

												<div className="flex justify-end pt-1">
													<button
														type="submit"
														disabled={markingAttendance}
														className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
													>
														{markingAttendance ? "Recording..." : "Save Attendance"}
													</button>
												</div>
											</form>

											{/* Attendance History Log */}
											<div className="border border-slate-200 rounded-2xl overflow-hidden">
												<div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
													<span>Attendance Logs</span>
													<span className="text-[10px] text-slate-500">{teacherAttendance.length} records</span>
												</div>
												<div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
													{teacherAttendance.length === 0 ? (
														<div className="p-8 text-center text-xs text-slate-400">
															No attendance records marked yet for this educator. Use the form above to record presence.
														</div>
													) : (
														teacherAttendance.map((rec) => (
															<div key={rec.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition">
																<div className="flex items-center gap-2">
																	<CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
																	<span className="font-semibold text-slate-900">
																		{new Date(rec.attendanceDate).toLocaleDateString("en-IN", {
																			weekday: "short",
																			year: "numeric",
																			month: "short",
																			day: "numeric",
																		})}
																	</span>
																	{rec.notes && <span className="text-[11px] text-slate-500 italic">({rec.notes})</span>}
																</div>

																<span
																	className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
																		rec.status === "present"
																			? "bg-emerald-100 text-emerald-800"
																			: rec.status === "half_day"
																			? "bg-amber-100 text-amber-800"
																			: "bg-red-100 text-red-800"
																	}`}
																>
																	{rec.status}
																</span>
															</div>
														))
													)}
												</div>
											</div>
										</div>
									)}

									{/* TAB 3: ASSIGNED TASKS */}
									{dossierTab === "tasks" && (
										<div className="space-y-4">
											{/* Assign Task Form */}
											<form
												onSubmit={handleCreateTeacherTask}
												className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
											>
												<span className="font-bold text-slate-900 text-xs block">
													Allocate Directive / Task to {dossierTeacher.fullName}
												</span>

												<div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
													<div className="sm:col-span-2">
														<input
															type="text"
															required
															placeholder="Task title (e.g. Submit Sanskrit terminal exam papers)"
															value={newTaskTitle}
															onChange={(e) => setNewTaskTitle(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>
													<div>
														<input
															type="date"
															value={newTaskDue}
															onChange={(e) => setNewTaskDue(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>
													<div className="flex gap-2">
														<select
															value={newTaskPriority}
															onChange={(e) => setNewTaskPriority(e.target.value as any)}
															className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
														>
															<option value="normal">Normal</option>
															<option value="high">High</option>
															<option value="urgent">Urgent</option>
														</select>
														<button
															type="submit"
															disabled={creatingTask}
															className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
														>
															{creatingTask ? "Assigning..." : "Assign"}
														</button>
													</div>
												</div>
											</form>

											{/* Tasks List */}
											<div className="space-y-2">
												{teacherTasks.length === 0 ? (
													<div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
														No directives currently assigned to this faculty member.
													</div>
												) : (
													teacherTasks.map((task) => (
														<div
															key={task.id}
															className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
														>
															<div className="flex items-center gap-2.5">
																<div
																	className={`w-3.5 h-3.5 rounded-full ${
																		task.status === "completed" ? "bg-emerald-500" : "bg-amber-400"
																	}`}
																/>
																<div>
																	<div className={`font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
																		{task.title}
																	</div>
																	{task.dueDate && (
																		<div className="text-[10px] text-slate-400">
																			Due: {new Date(task.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
																		</div>
																	)}
																</div>
															</div>

															<div className="flex items-center gap-2">
																<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
																	task.priority === "urgent" || task.priority === "high"
																		? "bg-red-50 text-red-700 border border-red-200"
																		: "bg-slate-100 text-slate-600"
																}`}>
																	{task.priority || "normal"}
																</span>
																<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
																	task.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
																}`}>
																	{task.status}
																</span>
															</div>
														</div>
													))
												)}
											</div>
										</div>
									)}

									{/* TAB 4: BATCH ALLOCATIONS */}
									{dossierTab === "batches" && (
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold text-slate-800">
													Teaching Batches for {dossierTeacher.fullName}
												</span>
												<button
													onClick={() => {
														setSelectedTeacher(dossierTeacher);
														setIsAssignOpen(true);
													}}
													className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
												>
													+ Assign to Another Batch
												</button>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												{dossierTeacher.assignments && dossierTeacher.assignments.length > 0 ? (
													dossierTeacher.assignments.map((a: any) => (
														<div key={a.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
															<div className="flex items-center justify-between">
																<span className="text-xs font-bold text-slate-900">{a.batchName}</span>
																{a.isClassTeacher ? (
																	<span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
																		Class Teacher
																	</span>
																) : null}
															</div>
															<div className="text-[11px] text-slate-500">
																Subject: <span className="font-semibold text-slate-800">{a.subjectName}</span>
															</div>
															<div className="pt-2 border-t border-slate-200 flex justify-end">
																<button
																	onClick={() => handleRemoveAssignment(a.id, a.batchName)}
																	className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
																>
																	<Trash2 className="w-3 h-3" />
																	<span>Remove</span>
																</button>
															</div>
														</div>
													))
												) : (
													<div className="col-span-full p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
														No batches currently assigned.
													</div>
												)}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ================= CREATE FACULTY MODAL ================= */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div>
								<h3 className="font-bold text-slate-900 text-sm">Add New Faculty Member</h3>
								<p className="text-[11px] text-slate-500">Create profile and optionally assign initial teaching batch.</p>
							</div>
							<button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
								<input
									type="text"
									required
									value={formData.fullName}
									onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
									placeholder="e.g. Dr. Arvind Rao"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
									<input
										type="email"
										required
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
										placeholder="faculty@proventusacademy.com"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
									<input
										type="tel"
										value={formData.phone}
										onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
										placeholder="e.g. 9108396010"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Designation</label>
									<input
										type="text"
										value={formData.designation}
										onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
										placeholder="e.g. Subject Faculty"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Subject Specialization</label>
									<input
										type="text"
										value={formData.specialization}
										onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
										placeholder="e.g. Mathematics"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Monthly Salary (₹) *</label>
									<input
										type="number"
										required
										min="0"
										value={formData.monthlySalaryInRupees}
										onChange={(e) => setFormData({ ...formData, monthlySalaryInRupees: Number(e.target.value) })}
										placeholder="e.g. 35000"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
									/>
								</div>
							</div>

							{/* Grouped Grade/Class & Subject Multi-Selection */}
							<div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
										<Layers className="w-4 h-4 text-indigo-600" />
										<span>Assign Grade / Class & Subjects (Optional)</span>
									</div>
									<span className="text-[10px] text-slate-400 font-medium">Multiple options enabled</span>
								</div>

								{/* Grouped Grades (1-4, 5-8, 9-12, 9-12 NIOS) */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label className="block font-bold text-slate-700 text-xs">
											Grade / Class (Grouped)
										</label>
										<div className="flex items-center gap-2 text-[10px]">
											<button
												type="button"
												onClick={() => setSelectedGradeGroups(GRADE_GROUPS.map((g) => g.id))}
												className="text-indigo-600 hover:text-indigo-800 font-semibold"
											>
												Select All
											</button>
											<span className="text-slate-300">|</span>
											<button
												type="button"
												onClick={() => setSelectedGradeGroups([])}
												className="text-slate-400 hover:text-slate-600 font-semibold"
											>
												Clear
											</button>
										</div>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										{GRADE_GROUPS.map((grp) => {
											const isSelected = selectedGradeGroups.includes(grp.id);
											return (
												<button
													key={grp.id}
													type="button"
													onClick={() => {
														setSelectedGradeGroups((prev) =>
															prev.includes(grp.id) ? prev.filter((g) => g !== grp.id) : [...prev, grp.id]
														);
													}}
													className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
														isSelected
															? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
															: "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
													}`}
												>
													<div className="flex items-center justify-between gap-1">
														<span className="font-extrabold text-xs">{grp.label}</span>
														{isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
													</div>
													<span
														className={`text-[10px] mt-1 line-clamp-1 ${
															isSelected ? "text-indigo-100" : "text-slate-400"
														}`}
													>
														{grp.subtext}
													</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* Teaching Subjects Multi-Select */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label className="block font-bold text-slate-700 text-xs">
											Teaching Subject(s)
										</label>
										<div className="flex items-center gap-2 text-[10px]">
											<button
												type="button"
												onClick={() => setSelectedSubjectIds(subjects.map((s) => s.id))}
												className="text-indigo-600 hover:text-indigo-800 font-semibold"
											>
												Select All
											</button>
											<span className="text-slate-300">|</span>
											<button
												type="button"
												onClick={() => setSelectedSubjectIds([])}
												className="text-slate-400 hover:text-slate-600 font-semibold"
											>
												Clear
											</button>
										</div>
									</div>

									<div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
										{subjects.map((s) => {
											const isSelected = selectedSubjectIds.includes(s.id);
											return (
												<button
													key={s.id}
													type="button"
													onClick={() => {
														setSelectedSubjectIds((prev) =>
															prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
														);
													}}
													className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
														isSelected
															? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
															: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
													}`}
												>
													<span>
														{s.name} ({s.code})
													</span>
													{isSelected && <Check className="w-3 h-3 text-indigo-600" />}
												</button>
											);
										})}
									</div>
								</div>
							</div>

							<div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
								<span className="font-semibold">Auto-Generated Password:</span> A secure unique password (e.g.{" "}
								<code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">
									Proventus@3393
								</code>
								) will be automatically created and displayed upon creation.
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Creating Faculty..." : "Create Faculty Member"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= ASSIGN MODAL ================= */}
			{isAssignOpen && selectedTeacher && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div>
								<h3 className="font-bold text-slate-900 text-sm">Assign Faculty to Grade/Class</h3>
								<p className="text-[11px] text-slate-500">{selectedTeacher.fullName}</p>
							</div>
							<button onClick={() => setIsAssignOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleAssign} className="space-y-4 text-xs">
							{/* Grouped Grades (1-4, 5-8, 9-12, 9-12 NIOS) */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="block font-bold text-slate-700 text-xs">
										Grade / Class (Select one or multiple) *
									</label>
									<div className="flex items-center gap-2 text-[10px]">
										<button
											type="button"
											onClick={() => setAssignGradeGroups(GRADE_GROUPS.map((g) => g.id))}
											className="text-indigo-600 hover:text-indigo-800 font-semibold"
										>
											Select All
										</button>
										<span className="text-slate-300">|</span>
										<button
											type="button"
											onClick={() => setAssignGradeGroups([])}
											className="text-slate-400 hover:text-slate-600 font-semibold"
										>
											Clear
										</button>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2">
									{GRADE_GROUPS.map((grp) => {
										const isSelected = assignGradeGroups.includes(grp.id);
										return (
											<button
												key={grp.id}
												type="button"
												onClick={() => {
													setAssignGradeGroups((prev) =>
														prev.includes(grp.id) ? prev.filter((g) => g !== grp.id) : [...prev, grp.id]
													);
												}}
												className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
													isSelected
														? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
														: "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
												}`}
											>
												<div className="flex items-center justify-between gap-1">
													<span className="font-extrabold text-xs">{grp.label}</span>
													{isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
												</div>
												<span
													className={`text-[10px] mt-1 line-clamp-1 ${
														isSelected ? "text-indigo-100" : "text-slate-400"
													}`}
												>
													{grp.subtext}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Teaching Subjects Multi-Select */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="block font-bold text-slate-700 text-xs">
										Teaching Subject(s)
									</label>
									<div className="flex items-center gap-2 text-[10px]">
										<button
											type="button"
											onClick={() => setAssignSubjectIds(subjects.map((s) => s.id))}
											className="text-indigo-600 hover:text-indigo-800 font-semibold"
										>
											Select All
										</button>
										<span className="text-slate-300">|</span>
										<button
											type="button"
											onClick={() => setAssignSubjectIds([])}
											className="text-slate-400 hover:text-slate-600 font-semibold"
										>
											Clear
										</button>
									</div>
								</div>

								<div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
									{subjects.map((s) => {
										const isSelected = assignSubjectIds.includes(s.id);
										return (
											<button
												key={s.id}
												type="button"
												onClick={() => {
													setAssignSubjectIds((prev) =>
														prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
													);
												}}
												className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
													isSelected
														? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
														: "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
												}`}
											>
												<span>
													{s.name} ({s.code})
												</span>
												{isSelected && <Check className="w-3 h-3 text-indigo-600" />}
											</button>
										);
									})}
								</div>
							</div>

							<div className="pt-1 flex items-center gap-2">
								<input
									type="checkbox"
									id="assignClassTeacher"
									checked={assignIsClassTeacher}
									onChange={(e) => setAssignIsClassTeacher(e.target.checked)}
									className="rounded text-indigo-600 focus:ring-indigo-500"
								/>
								<label htmlFor="assignClassTeacher" className="text-slate-700 font-medium">
									Grant Class Teacher status for these classes
								</label>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsAssignOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Assigning..." : "Confirm Assignment"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= SUCCESS / CREDENTIALS POPUP ================= */}
			{createdCredentials && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
						<div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
							<CheckCircle2 className="w-6 h-6" />
						</div>

						<div>
							<h3 className="text-base font-bold text-slate-900">{createdCredentials.title || "Faculty Registered Successfully"}</h3>
							<p className="text-xs text-slate-500 mt-1">Credentials ready for portal access.</p>
						</div>

						<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
							<div>
								<span className="text-slate-500">Name:</span>
								<div className="font-bold text-slate-900">{createdCredentials.fullName}</div>
							</div>
							<div>
								<span className="text-slate-500">Username:</span>
								<div className="font-mono font-bold text-indigo-700 text-sm">{createdCredentials.username}</div>
							</div>
							<div>
								<div className="flex items-center justify-between text-slate-500 mb-1">
									<span>Password:</span>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
									>
										{showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
										<span>{showPassword ? "Hide Password" : "View Password"}</span>
									</button>
								</div>
								<div className="font-mono font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 text-sm tracking-wide">
									{showPassword ? createdCredentials.defaultPassword : "••••••••••••"}
								</div>
							</div>
						</div>

						<div className="pt-2 flex flex-col gap-2">
							<button
								onClick={() => {
									const text = `Proventus Academy Faculty Login:\nName: ${createdCredentials.fullName}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.defaultPassword}\nPortal: https://proventusacademy.com/login`;
									navigator.clipboard.writeText(text);
									setCopied(true);
									setTimeout(() => setCopied(false), 2000);
								}}
								className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
							>
								{copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
								{copied ? "Copied to Clipboard!" : "Copy Faculty Login"}
							</button>

							{createdCredentials.userId && (
								<button
									type="button"
									onClick={() => handleResetPassword(createdCredentials.userId)}
									className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition text-center py-1"
								>
									Need to change this password? Generate new password
								</button>
							)}

							<button
								onClick={() => setCreatedCredentials(null)}
								className="w-full py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
	Users,
	Plus,
	Search,
	CheckCircle2,
	X,
	AlertCircle,
	CreditCard,
	Trash2,
	Edit3,
	Calendar,
	IndianRupee,
	BookOpen,
	Key,
	Eye,
	EyeOff,
	Copy,
	Check,
	Sparkles,
	Filter,
	ChevronRight,
	Award,
	ListTodo,
	CalendarCheck,
	Clock,
	CheckCircle,
	Circle,
	Target,
	BarChart3,
	Layers,
	FileText
} from "lucide-react";
import { ParentInvoiceModal } from "@/components/portal/ParentInvoiceModal";
import BouncingLoader from "@/components/BouncingLoader";

export default function AdminStudentsPage() {
	const [students, setStudents] = useState<any[]>([]);
	const [batches, setBatches] = useState<any[]>([]);
	const [subjects, setSubjects] = useState<any[]>([]); // Global subjects list for dropdown fallback
	const [search, setSearch] = useState("");
	const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isFeePlanOpen, setIsFeePlanOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [studentFeeDetails, setStudentFeeDetails] = useState<any>(null);
	const [loadingFeeDetails, setLoadingFeeDetails] = useState(false);
	const [createdCredentials, setCreatedCredentials] = useState<any>(null);
	const [showPassword, setShowPassword] = useState(true);
	const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
	const [editingObligationId, setEditingObligationId] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [adminViewingReceipt, setAdminViewingReceipt] = useState<any | null>(null);
	const [quickDueModal, setQuickDueModal] = useState<{
		isOpen: boolean;
		obligationId: string;
		title: string;
		currentDueDate: string;
		newDueDate: string;
		saving: boolean;
	}>({
		isOpen: false,
		obligationId: "",
		title: "",
		currentDueDate: "",
		newDueDate: "",
		saving: false,
	});

	// Batch assignment modal states
	const [isAssignBatchOpen, setIsAssignBatchOpen] = useState(false);
	const [selectedBatchId, setSelectedBatchId] = useState("");
	const [selectedTargetExam, setSelectedTargetExam] = useState("");

	// Comprehensive Student Dossier Modal
	const [dossierStudent, setDossierStudent] = useState<any>(null);
	const [dossierTab, setDossierTab] = useState<"syllabus" | "attendance" | "assessments" | "tasks" | "fees">("syllabus");
	const [loadingDossier, setLoadingDossier] = useState(false);
	const [dossierSyllabus, setDossierSyllabus] = useState<{ summary?: any; subjects?: any[]; chapters?: any[] }>({});
	const [dossierAttendance, setDossierAttendance] = useState<{ summary?: any; records?: any[] }>({});
	const [dossierAssessments, setDossierAssessments] = useState<{ summary?: any; assessments?: any[] }>({});
	const [dossierTasks, setDossierTasks] = useState<any[]>([]);

	// Fast grading in dossier
	const [dossierGradeTitle, setDossierGradeTitle] = useState("");
	const [dossierGradeSubjectId, setDossierGradeSubjectId] = useState("");
	const [dossierGradeMax, setDossierGradeMax] = useState<number>(50);
	const [dossierGradeObtained, setDossierGradeObtained] = useState<number>(40);
	const [dossierGradeRemarks, setDossierGradeRemarks] = useState("");
	const [submittingDossierGrade, setSubmittingDossierGrade] = useState(false);

	// Fast task assignment in dossier
	const [dossierTaskTitle, setDossierTaskTitle] = useState("");
	const [dossierTaskDue, setDossierTaskDue] = useState("");
	const [dossierTaskPriority, setDossierTaskPriority] = useState<"urgent" | "high" | "normal">("normal");
	const [submittingDossierTask, setSubmittingDossierTask] = useState(false);

	// Fast chapter addition in dossier
	const [dossierChapterTitle, setDossierChapterTitle] = useState("");
	const [dossierChapterSubjectId, setDossierChapterSubjectId] = useState("");
	const [dossierChapterNumber, setDossierChapterNumber] = useState<number>(1);
	const [submittingDossierChapter, setSubmittingDossierChapter] = useState(false);

	const toggleRevealPassword = (id: string) => {
		setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// Create Student Form state
	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		phone: "",
		targetExam: "NIOS 9th & 10th Open School",
		batchId: "",
		rollNumber: "",
		monthlyFeeAmountInRupees: 5000,
		monthlyDueDay: 5,
		guardianName: "",
		guardianPhone: "",
		guardianRelation: "Parent",
	});

	// Fee Plan Form state
	const [feeFormData, setFeeFormData] = useState({
		installmentTitle: "Monthly Tuition Fee",
		dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split("T")[0],
		baseAmountInRupees: 5000,
		concessionAmountInRupees: 0,
	});

	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		setError(null);
		try {
			const [studentsRes, batchesRes, subjectsRes] = await Promise.all([
				api.students.list(),
				api.academic.batches(),
				api.academic.subjects(),
			]);
			setStudents(studentsRes.students || []);
			setBatches(batchesRes.batches || []);
			setSubjects(subjectsRes.subjects || []);
		} catch (err: any) {
			setError(err?.message || "Failed to load student profiles");
		} finally {
			setLoading(false);
		}
	}

	// Open Full Student Dossier Modal
	const handleOpenDossier = async (student: any) => {
		setDossierStudent(student);
		setDossierTab("syllabus");
		setLoadingDossier(true);

		try {
			const [sylRes, attRes, assRes, tskRes, feeRes, subRes] = await Promise.all([
				api.syllabus.student(student.id).catch(() => ({ summary: null, subjects: [], chapters: [] })),
				api.attendance.studentSummary(student.id).catch(() => ({ summary: null, records: [] })),
				api.assessments.student(student.id).catch(() => ({ summary: null, assessments: [] })),
				api.tasks.list({ assignedToType: "student", assignedToId: student.id }).catch(() => ({ tasks: [] })),
				api.fees.studentFees(student.id).catch(() => ({ summary: null, obligations: [], receipts: [] })),
				api.academic.subjects().catch(() => ({ subjects: [] })),
			]);

			setDossierSyllabus(sylRes || {});
			setDossierAttendance(attRes || {});
			setDossierAssessments(assRes || {});
			setDossierTasks(tskRes.tasks || []);
			setStudentFeeDetails(feeRes || {});

			const latestSubjects = subRes.subjects?.length ? subRes.subjects : subjects;
			if (subRes.subjects?.length) {
				setSubjects(subRes.subjects);
			}

			// Initialize subject dropdowns — always use all global subjects so admin can add any subject's chapters
			const dropdownSubjects = latestSubjects.length > 0 ? latestSubjects : (sylRes?.subjects || []);
			if (dropdownSubjects.length > 0) {
				const firstId = dropdownSubjects[0].id || dropdownSubjects[0].subjectId || "";
				setDossierGradeSubjectId(firstId);
				setDossierChapterSubjectId(firstId);
			}

		} catch (err) {
			console.error("Failed to load student dossier:", err);
		} finally {
			setLoadingDossier(false);
		}
	};

	// Toggle Chapter Status in Dossier
	const handleUpdateChapterStatus = async (chapterId: string, currentStatus: string) => {
		const nextStatus = currentStatus === "completed" ? "pending" : currentStatus === "in_progress" ? "completed" : "in_progress";
		try {
			await api.syllabus.update(chapterId, {
				status: nextStatus,
				completionDate: nextStatus === "completed" ? new Date().toISOString() : null,
			});

			setDossierSyllabus((prev) => {
				const updatedChapters = (prev.chapters || []).map((ch: any) =>
					ch.id === chapterId ? { ...ch, status: nextStatus } : ch
				);
				const comp = updatedChapters.filter((c: any) => c.status === "completed").length;
				const inProg = updatedChapters.filter((c: any) => c.status === "in_progress").length;
				const total = updatedChapters.length;
				return {
					...prev,
					chapters: updatedChapters,
					summary: {
						...prev.summary,
						completedChapters: comp,
						inProgressChapters: inProg,
						completionPercentage: total > 0 ? Math.round((comp / total) * 100) : 0,
					},
				};
			});

			setSuccessMsg(`Chapter status updated to ${nextStatus.toUpperCase()}`);
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to update chapter: ${err?.message || "Server error"}`);
		}
	};

	// Add Chapter in Dossier
	const handleAddDossierChapter = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dossierStudent || !dossierChapterTitle.trim() || !dossierChapterSubjectId) return;

		setSubmittingDossierChapter(true);
		try {
			await api.syllabus.create({
				batchId: dossierStudent.enrollment?.batchId || batches[0]?.id || "batch-default",
				subjectId: dossierChapterSubjectId,
				chapterTitle: dossierChapterTitle.trim(),
				title: dossierChapterTitle.trim(),
				chapterNumber: Number(dossierChapterNumber) || 1,
				studentId: dossierStudent.id,
			});

			const sylRes = await api.syllabus.student(dossierStudent.id);
			setDossierSyllabus(sylRes);
			setDossierChapterTitle("");
			setSuccessMsg("Chapter added for student!");
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to add chapter: ${err?.message || "Server error"}`);
		} finally {
			setSubmittingDossierChapter(false);
		}
	};

	// Record Grade in Dossier
	const handleRecordDossierGrade = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dossierStudent || !dossierGradeTitle.trim() || !dossierGradeSubjectId) return;

		setSubmittingDossierGrade(true);
		try {
			await api.assessments.createStudentMark({
				studentId: dossierStudent.id,
				subjectId: dossierGradeSubjectId,
				title: dossierGradeTitle.trim(),
				maxMarks: Number(dossierGradeMax),
				marksObtained: Number(dossierGradeObtained),
				remarks: dossierGradeRemarks.trim() || undefined,
			});

			const assRes = await api.assessments.student(dossierStudent.id);
			setDossierAssessments(assRes);
			setDossierGradeTitle("");
			setDossierGradeRemarks("");
			setSuccessMsg("Assessment recorded successfully!");
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to record assessment: ${err?.message || "Server error"}`);
		} finally {
			setSubmittingDossierGrade(false);
		}
	};

	// Assign Task in Dossier
	const handleAssignDossierTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dossierStudent || !dossierTaskTitle.trim()) return;

		setSubmittingDossierTask(true);
		try {
			const res = await api.tasks.create({
				title: dossierTaskTitle.trim(),
				assignedToType: "student",
				assignedToId: dossierStudent.id,
				priority: dossierTaskPriority,
				dueDate: dossierTaskDue ? new Date(dossierTaskDue).toISOString() : null,
				batchId: dossierStudent.enrollment?.batchId || undefined,
			});

			setDossierTasks((prev) => [res.task, ...prev]);
			setDossierTaskTitle("");
			setDossierTaskDue("");
			setSuccessMsg(`Task assigned to ${dossierStudent.fullName}!`);
			setTimeout(() => setSuccessMsg(null), 3000);
		} catch (err: any) {
			alert(`Failed to assign task: ${err?.message || "Server error"}`);
		} finally {
			setSubmittingDossierTask(false);
		}
	};

	const handleCreateStudent = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			const payload = {
				fullName: formData.fullName.trim(),
				email: formData.email.trim() || undefined,
				phone: formData.phone.trim() || undefined,
				targetExam: formData.targetExam,
				batchId: formData.batchId || undefined,
				rollNumber: formData.rollNumber.trim() || undefined,
				monthlyFeeAmountInRupees: Number(formData.monthlyFeeAmountInRupees) || 0,
				monthlyDueDay: Number(formData.monthlyDueDay) || 5,
				guardian: formData.guardianName.trim()
					? {
							name: formData.guardianName.trim(),
							phone: formData.guardianPhone.trim() || undefined,
							relation: formData.guardianRelation,
					  }
					: undefined,
			};

			const res = await api.students.create(payload);
			const generatedPwd = res.credentials?.password || res.credentials?.defaultPassword || "Proventus@3393";

			setIsCreateOpen(false);
			setFormData({
				fullName: "",
				email: "",
				phone: "",
				targetExam: "NIOS 9th & 10th Open School",
				batchId: "",
				rollNumber: "",
				monthlyFeeAmountInRupees: 5000,
				monthlyDueDay: 5,
				guardianName: "",
				guardianPhone: "",
				guardianRelation: "Parent",
			});

			setCreatedCredentials({
				fullName: res.student.fullName,
				username: res.student.username,
				defaultPassword: generatedPwd,
				title: "Student Enrolled Successfully",
			});
			setShowPassword(true);

			setSuccessMsg(`Student "${res.student.fullName}" enrolled successfully! Username: ${res.student.username}`);
			setTimeout(() => setSuccessMsg(null), 8000);
			loadData();
		} catch (err: any) {
			setError(err?.message || "Failed to create student profile");
		} finally {
			setSubmitting(false);
		}
	};

	const handleViewCredentials = (student: any) => {
		setCreatedCredentials({
			fullName: student.fullName,
			username: student.username,
			defaultPassword: student.password || "Proventus@3393",
			userId: student.userId,
			title: "Student Login Credentials",
		});
		setShowPassword(true);
	};

	const handleResetPassword = async (userId: string) => {
		const confirmReset = window.confirm(
			"Are you sure you want to generate a new password for this student?"
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

	const handleDeleteStudent = async (student: any) => {
		const confirmDelete = window.confirm(
			`Are you sure you want to delete student "${student.fullName}" (${student.admissionNumber})?\n\nThis will remove their profile, enrollment, and credentials permanently.`
		);
		if (!confirmDelete) return;

		try {
			await api.students.delete(student.id);
			setSuccessMsg(`Student "${student.fullName}" removed.`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to delete student: ${err?.message || "Server error"}`);
		}
	};

	const openFeePlanModal = async (student: any) => {
		setSelectedStudent(student);
		setEditingObligationId(null);
		setIsFeePlanOpen(true);
		setLoadingFeeDetails(true);

		try {
			const res = await api.fees.studentFees(student.id);
			setStudentFeeDetails(res);
		} catch (err: any) {
			console.error("Failed to load student fees:", err);
		} finally {
			setLoadingFeeDetails(false);
		}
	};

	const handleAddFeeObligation = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent) return;
		setSubmitting(true);

		try {
			if (editingObligationId) {
				await api.fees.updateObligation(editingObligationId, {
					installmentTitle: feeFormData.installmentTitle,
					dueDate: feeFormData.dueDate,
					baseAmountInRupees: Number(feeFormData.baseAmountInRupees),
					concessionAmountInRupees: Number(feeFormData.concessionAmountInRupees),
				});
				setSuccessMsg("Fee installment updated successfully!");
			} else {
				await api.fees.createObligation({
					studentId: selectedStudent.id,
					installmentTitle: feeFormData.installmentTitle,
					dueDate: feeFormData.dueDate,
					baseAmountInRupees: Number(feeFormData.baseAmountInRupees),
					concessionAmountInRupees: Number(feeFormData.concessionAmountInRupees),
				});
				setSuccessMsg("Fee installment added successfully!");
			}

			setEditingObligationId(null);
			setFeeFormData({
				installmentTitle: "Monthly Tuition Fee",
				dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split("T")[0],
				baseAmountInRupees: 5000,
				concessionAmountInRupees: 0,
			});

			const res = await api.fees.studentFees(selectedStudent.id);
			setStudentFeeDetails(res);
			loadData();
			setTimeout(() => setSuccessMsg(null), 4000);
		} catch (err: any) {
			alert(`Failed to save fee installment: ${err?.message || "Server error"}`);
		} finally {
			setSubmitting(false);
		}
	};

	const startEditObligation = (ob: any) => {
		setEditingObligationId(ob.id);
		setFeeFormData({
			installmentTitle: ob.installmentTitle,
			dueDate: ob.dueDate,
			baseAmountInRupees: ob.baseAmountInRupees,
			concessionAmountInRupees: ob.concessionAmountInRupees || 0,
		});
	};

	const cancelEditObligation = () => {
		setEditingObligationId(null);
		setFeeFormData({
			installmentTitle: "Monthly Tuition Fee",
			dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split("T")[0],
			baseAmountInRupees: 5000,
			concessionAmountInRupees: 0,
		});
	};

	const handleOpenAssignBatch = (student: any) => {
		setSelectedStudent(student);
		setSelectedBatchId(student.enrollment?.batchId || "");
		setSelectedTargetExam(student.targetExam || "NIOS 9th & 10th Open School");
		setIsAssignBatchOpen(true);
	};

	const handleSaveBatchAssignment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent) return;
		setSubmitting(true);

		try {
			await api.students.assignBatch(selectedStudent.id, {
				batchId: selectedBatchId || "",
				targetExam: selectedTargetExam,
			});
			setIsAssignBatchOpen(false);
			setSuccessMsg(`Batch assignment updated for "${selectedStudent.fullName}"!`);
			setTimeout(() => setSuccessMsg(null), 4000);
			loadData();
		} catch (err: any) {
			alert(`Failed to assign batch: ${err?.message || "Server error"}`);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteFeeObligation = async (obligationId: string) => {
		const confirmDelete = window.confirm("Are you sure you want to remove this fee installment?");
		if (!confirmDelete) return;

		try {
			await api.fees.deleteObligation(obligationId);
			if (selectedStudent) {
				const res = await api.fees.studentFees(selectedStudent.id);
				setStudentFeeDetails(res);
			}
			loadData();
		} catch (err: any) {
			alert(`Failed to delete fee obligation: ${err?.message || "Server error"}`);
		}
	};

	const handleOpenQuickDueDate = (ob: any) => {
		setQuickDueModal({
			isOpen: true,
			obligationId: ob.id,
			title: ob.installmentTitle || "Fee Obligation",
			currentDueDate: ob.dueDate || "",
			newDueDate: ob.dueDate || new Date().toISOString().split("T")[0],
			saving: false,
		});
	};

	const handleSaveQuickDueDate = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!quickDueModal.obligationId || !quickDueModal.newDueDate) return;
		setQuickDueModal((prev) => ({ ...prev, saving: true }));
		try {
			await api.fees.updateObligation(quickDueModal.obligationId, {
				dueDate: quickDueModal.newDueDate,
			});
			setSuccessMsg("Due date updated successfully!");
			setTimeout(() => setSuccessMsg(null), 3500);
			setQuickDueModal({ isOpen: false, obligationId: "", title: "", currentDueDate: "", newDueDate: "", saving: false });
			if (dossierStudent) {
				const feeRes = await api.fees.studentFees(dossierStudent.id).catch(() => null);
				if (feeRes) setStudentFeeDetails(feeRes);
			}
			if (selectedStudent) {
				const feeRes = await api.fees.studentFees(selectedStudent.id).catch(() => null);
				if (feeRes) setStudentFeeDetails(feeRes);
			}
			loadData();
		} catch (err: any) {
			alert(`Failed to update due date: ${err?.message || "Server error"}`);
		} finally {
			setQuickDueModal((prev) => ({ ...prev, saving: false }));
		}
	};

	const [selectedCategory, setSelectedCategory] = useState<string>("all"); // 'all' | 'g1-4' | 'g5-8' | 'g9-12' | 'nios' | 'unassigned'

	// Operational categories
	const ACADEMIC_CATEGORIES = [
		{ id: "g1-4", label: "Grade 1 to 4", sub: "CBSE & ICSE (Primary)", min: 1, max: 4, programName: "Grade 1 to 4 (CBSE & ICSE)" },
		{ id: "g5-8", label: "Grade 5 to 8", sub: "CBSE & ICSE (Middle)", min: 5, max: 8, programName: "Grade 5 to 8 (CBSE & ICSE)" },
		{ id: "g9-12", label: "Grade 9 to 12", sub: "CBSE & ICSE (High / Sr)", min: 9, max: 12, programName: "Grade 9 to 12 (CBSE & ICSE)" },
		{ id: "nios", label: "NIOS Open School", sub: "9th & 10th Morning", isNios: true, programName: "NIOS 9th & 10th Open School" },
	];

	// Helper to extract grade number from a batch
	const getBatchGradeNum = (b: any) => {
		const m = (b.name || "").match(/Grade\s*(\d+)/i) || (b.code || "").match(/G(\d+)/i);
		return m ? parseInt(m[1], 10) : null;
	};

	// Helper to check if a batch belongs to a category
	const isBatchInCategory = (b: any, catId: string) => {
		if (catId === "all") return true;
		if (catId === "nios") {
			return (b.name || "").toLowerCase().includes("nios") || (b.code || "").toLowerCase().includes("nios");
		}
		const num = getBatchGradeNum(b);
		if (!num) return false;
		if (catId === "g1-4") return num >= 1 && num <= 4;
		if (catId === "g5-8") return num >= 5 && num <= 8;
		if (catId === "g9-12") return num >= 9 && num <= 12;
		return false;
	};

	// Helper to check if a student belongs to a category
	const isStudentInCategory = (s: any, catId: string) => {
		if (catId === "all") return true;
		if (catId === "unassigned") return !s.enrollment?.batchId;
		const sBatch = batches.find((b) => b.id === s.enrollment?.batchId);
		if (sBatch) return isBatchInCategory(sBatch, catId);
		// Fallback check against student.targetExam
		const target = (s.targetExam || "").toLowerCase();
		if (catId === "nios") return target.includes("nios");
		if (catId === "g1-4") return target.includes("1 to 4") || target.includes("grade 1");
		if (catId === "g5-8") return target.includes("5 to 8") || target.includes("grade 5");
		if (catId === "g9-12") return target.includes("9 to 12") || target.includes("grade 9");
		return false;
	};

	// Helper to get batches matching a target exam string
	const getBatchesForTargetExam = (targetExam: string) => {
		const target = (targetExam || "").toLowerCase();
		if (target.includes("nios")) {
			return batches.filter((b) => (b.name || "").toLowerCase().includes("nios") || (b.code || "").toLowerCase().includes("nios"));
		}
		if (target.includes("1 to 4")) return batches.filter((b) => { const n = getBatchGradeNum(b); return n !== null && n >= 1 && n <= 4; });
		if (target.includes("5 to 8")) return batches.filter((b) => { const n = getBatchGradeNum(b); return n !== null && n >= 5 && n <= 8; });
		if (target.includes("9 to 12")) return batches.filter((b) => { const n = getBatchGradeNum(b); return n !== null && n >= 9 && n <= 12; });
		return batches;
	};

	// Filter students by search, selected category, and optional specific batch
	const filteredStudents = students.filter((s) => {
		const matchesSearch =
			s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
			s.username?.toLowerCase().includes(search.toLowerCase()) ||
			s.admissionNumber?.toLowerCase().includes(search.toLowerCase());

		if (!matchesSearch) return false;

		// Category check
		if (selectedCategory === "unassigned") {
			return !s.enrollment?.batchId;
		}
		if (selectedCategory !== "all" && !isStudentInCategory(s, selectedCategory)) {
			return false;
		}

		// Specific batch check
		if (selectedBatchFilter !== "all" && selectedBatchFilter !== "unassigned") {
			return s.enrollment?.batchId === selectedBatchFilter;
		}

		return true;
	});

	// Operational target calculations (100 students across 4 Programs)
	const totalTarget = 100;
	const currentEnrollment = students.length;
	const enrollmentPercentage = Math.min(100, Math.round((currentEnrollment / totalTarget) * 100));

	return (
		<div className="space-y-6">
			{/* Top Bar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
						<Users className="w-3.5 h-3.5" />
						<span>Students Segment • Operational Target 2026–2027</span>
					</div>
					<h1 className="text-xl font-bold text-slate-900 mt-1">Student Directory & Admissions</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Track individual students, chapter progress, roll-call attendance, assessment reports, and fee commitments.
					</p>
				</div>
				<button
					onClick={() => {
						const initialTarget = "Grade 1 to 4 (CBSE & ICSE)";
						const initialBatches = getBatchesForTargetExam(initialTarget);
						setFormData({
							...formData,
							targetExam: initialTarget,
							batchId: initialBatches[0]?.id || "",
						});
						setIsCreateOpen(true);
					}}
					className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
				>
					<Plus className="w-4 h-4" />
					Enroll New Student
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

			{/* ================= 100 STUDENTS / 4 ACADEMIC PROGRAMS TARGET GAUGE ================= */}
			<div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
				<div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-500/10 -skew-x-12 transform origin-top pointer-events-none" />
				<div className="relative z-10 space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
								<Target className="w-5 h-5" />
							</div>
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
									Vision & Operational Goal
								</span>
								<h2 className="text-lg font-extrabold text-white">Target: 100 Students Across Academic Programs</h2>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="text-right">
								<span className="text-2xl font-black text-white">{currentEnrollment}</span>
								<span className="text-xs text-indigo-200"> / {totalTarget} Students</span>
							</div>
							<div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
								{enrollmentPercentage}% Filled
							</div>
						</div>
					</div>

					{/* Overall Progress Bar */}
					<div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
						<div
							className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2.5 rounded-full transition-all duration-700"
							style={{ width: `${enrollmentPercentage}%` }}
						/>
					</div>

					{/* 4 Academic Programs / Categories Breakdown */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
						{ACADEMIC_CATEGORIES.map((cat) => {
							const catStudents = students.filter((s) => isStudentInCategory(s, cat.id)).length;
							const catCapacity = 25; // 4 programs * 25 = 100 students
							const catPct = Math.min(100, Math.round((catStudents / catCapacity) * 100));
							const isSelected = selectedCategory === cat.id;

							return (
								<div
									key={cat.id}
									onClick={() => {
										if (selectedCategory === cat.id) {
											setSelectedCategory("all");
											setSelectedBatchFilter("all");
										} else {
											setSelectedCategory(cat.id);
											setSelectedBatchFilter("all");
										}
									}}
									className={`p-3 rounded-2xl border transition cursor-pointer ${
										isSelected
											? "bg-white/20 border-indigo-400 ring-2 ring-indigo-400/40"
											: "bg-white/5 hover:bg-white/10 border-white/10"
									}`}
								>
									<div className="flex items-center justify-between text-[10px]">
										<span className="font-semibold text-indigo-300">{cat.label}</span>
										<span className="text-indigo-200 font-medium">{catStudents}/25 Seats</span>
									</div>
									<div className="text-[11px] text-slate-300 font-normal truncate mt-0.5">{cat.sub}</div>
									<div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
										<div
											className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
											style={{ width: `${catPct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Search & Hierarchical Category / Batch Filters */}
			<div className="space-y-2.5">
				<div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
					<div className="flex flex-col sm:flex-row items-center gap-3">
						<div className="relative flex-1 w-full">
							<Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by student name, Alpha username, or admission number..."
								className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
							/>
						</div>

						{/* Level 1: Category Filter Buttons */}
						<div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
							<button
								onClick={() => {
									setSelectedCategory("all");
									setSelectedBatchFilter("all");
								}}
								className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
									selectedCategory === "all"
										? "bg-indigo-600 text-white shadow-sm"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								All Students ({students.length})
							</button>

							{ACADEMIC_CATEGORIES.map((cat) => {
								const count = students.filter((s) => isStudentInCategory(s, cat.id)).length;
								const isActive = selectedCategory === cat.id;
								return (
									<button
										key={cat.id}
										onClick={() => {
											setSelectedCategory(cat.id);
											setSelectedBatchFilter("all");
										}}
										className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
											isActive
												? "bg-indigo-600 text-white shadow-sm"
												: "bg-slate-100 text-slate-600 hover:bg-slate-200"
										}`}
									>
										{cat.label} ({count})
									</button>
								);
							})}

							<button
								onClick={() => {
									setSelectedCategory("unassigned");
									setSelectedBatchFilter("all");
								}}
								className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
									selectedCategory === "unassigned"
										? "bg-amber-600 text-white shadow-sm"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								Unassigned ({students.filter((s) => !s.enrollment?.batchId).length})
							</button>
						</div>
					</div>

					{/* Level 2: Sub-filter for specific grades within selected category */}
					{selectedCategory !== "all" && selectedCategory !== "unassigned" && (
						<div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
							<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
								Select Specific Grade:
							</span>
							<button
								onClick={() => setSelectedBatchFilter("all")}
								className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
									selectedBatchFilter === "all"
										? "bg-slate-900 text-white"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								All in {ACADEMIC_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
							</button>
							{batches
								.filter((b) => isBatchInCategory(b, selectedCategory))
								.map((b) => {
									const count = students.filter((s) => s.enrollment?.batchId === b.id).length;
									const isActive = selectedBatchFilter === b.id;
									return (
										<button
											key={b.id}
											onClick={() => setSelectedBatchFilter(b.id)}
											className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
												isActive
													? "bg-indigo-600 text-white"
													: "bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
											}`}
										>
											{b.name} ({count})
										</button>
									);
								})}
						</div>
					)}
				</div>
			</div>

			{/* Students Table */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{loading ? (
					<BouncingLoader text="Loading student directory..." color="indigo" />
				) : filteredStudents.length === 0 ? (
					<div className="p-12 text-center text-slate-500">
						<Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
						<p className="font-semibold text-sm text-slate-800">No students found</p>
						<p className="text-xs text-slate-400 mt-1">
							Try adjusting your search criteria or click &quot;Enroll New Student&quot; to admit students.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
								<tr>
									<th className="py-3 px-4">Student</th>
									<th className="py-3 px-4">Admission #</th>
									<th className="py-3 px-4">Username</th>
									<th className="py-3 px-4">Batch / Program</th>
									<th className="py-3 px-4">Fee Balance</th>
									<th className="py-3 px-4 text-right">Actions & Dossier</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredStudents.map((student) => (
									<tr key={student.id} className="hover:bg-slate-50/70 transition group">
										<td className="py-3 px-4">
											<div
												className="font-semibold text-slate-900 group-hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
												onClick={() => handleOpenDossier(student)}
											>
												<span>{student.fullName}</span>
												<ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
											</div>
											<div className="text-[11px] text-slate-400">{student.email || student.phone || "No contact"}</div>
										</td>
										<td className="py-3 px-4 font-mono text-slate-700">{student.admissionNumber}</td>
										<td className="py-3 px-4">
											<span className="inline-flex px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
												{student.username}
											</span>
											<div className="flex items-center gap-1.5 mt-1 text-[11px]">
												<span className="font-mono text-slate-700">
													{revealedPasswords[student.id] ? (student.password || "Proventus@3393") : "••••••••"}
												</span>
												<button
													type="button"
													onClick={() => toggleRevealPassword(student.id)}
													className="text-slate-400 hover:text-indigo-600 transition p-0.5"
													title={revealedPasswords[student.id] ? "Hide password" : "View password"}
												>
													{revealedPasswords[student.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
												</button>
												<button
													type="button"
													onClick={() => {
														navigator.clipboard.writeText(student.password || "Proventus@3393");
														setSuccessMsg(`Copied password for ${student.fullName}`);
														setTimeout(() => setSuccessMsg(null), 2500);
													}}
													className="text-slate-400 hover:text-emerald-600 transition p-0.5"
													title="Copy password"
												>
													<Copy className="w-3 h-3" />
												</button>
											</div>
										</td>
										<td className="py-3 px-4">
											<div className="flex items-center gap-2">
												<div className="flex-1 min-w-0">
													{student.enrollment ? (
														<div>
															<div className="font-semibold text-slate-900 text-xs">{student.enrollment.batchName}</div>
															{student.targetExam ? (
																<div className="text-[10px] text-slate-400 truncate">{student.targetExam}</div>
															) : student.enrollment.className && student.enrollment.className !== student.enrollment.batchName ? (
																<div className="text-[10px] text-slate-400">{student.enrollment.className}</div>
															) : null}
														</div>
													) : (
														<div>
															<span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
																Unassigned
															</span>
															<div className="text-[10px] text-slate-400 mt-0.5">{student.targetExam || "No target set"}</div>
														</div>
													)}
												</div>
												<button
													type="button"
													onClick={() => handleOpenAssignBatch(student)}
													className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border border-indigo-100 shrink-0"
													title={student.enrollment ? "Change Batch Assignment" : "Assign to Batch"}
												>
													<Edit3 className="w-3 h-3" />
													<span>{student.enrollment ? "Change" : "Assign"}</span>
												</button>
											</div>
										</td>
										<td className="py-3 px-4">
											{student.feeSummary ? (
												<div>
													<span
														className={`font-semibold ${
															student.feeSummary.balance > 0 ? "text-amber-600" : "text-emerald-600"
														}`}
													>
														₹{student.feeSummary.balance.toLocaleString("en-IN")}
													</span>
													<div className="text-[10px] text-slate-400">
														Paid: ₹{student.feeSummary.totalPaid.toLocaleString("en-IN")}
													</div>
												</div>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="py-3 px-4 text-right">
											<div className="flex items-center justify-end gap-1.5">
												{/* Open Full Dossier */}
												<button
													onClick={() => handleOpenDossier(student)}
													className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
													title="Inspect Student Dossier (Chapters, Attendance, Reports, Tasks)"
												>
													<BookOpen className="w-3.5 h-3.5" />
													<span>Dossier</span>
												</button>
												<button
													onClick={() => openFeePlanModal(student)}
													className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
													title="Manage Fee Plan"
												>
													<CreditCard className="w-3.5 h-3.5" />
													<span>Fees</span>
												</button>
												<button
													onClick={() => handleViewCredentials(student)}
													className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
													title="View Login Credentials"
												>
													<Key className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => handleDeleteStudent(student)}
													className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
													title="Delete Student"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* ================= COMPREHENSIVE INDIVIDUAL STUDENT DOSSIER MODAL ================= */}
			{dossierStudent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
						{/* Header */}
						<div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 shrink-0">
							<div className="flex items-center gap-3.5">
								<div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
									{dossierStudent.fullName.charAt(0)}
								</div>
								<div>
									<div className="flex items-center gap-2 flex-wrap">
										<h2 className="text-base font-extrabold text-slate-900">{dossierStudent.fullName}</h2>
										<span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
											{dossierStudent.username}
										</span>
									</div>
									<p className="text-xs text-slate-500 mt-0.5">
										Admission #{dossierStudent.admissionNumber} • Batch: {dossierStudent.enrollment?.batchName || "Unassigned"}
										{dossierStudent.targetExam ? ` • ${dossierStudent.targetExam}` : ""}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
								<button
									onClick={() => handleViewCredentials(dossierStudent)}
									className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5 shadow-sm"
								>
									<Key className="w-3.5 h-3.5" />
									<span>Credentials</span>
								</button>
								<button
									onClick={() => setDossierStudent(null)}
									className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Tabs */}
						<div className="px-4 sm:px-5 border-b border-slate-200 flex items-center gap-2 sm:gap-5 text-xs font-bold text-slate-500 overflow-x-auto bg-white shrink-0 h-12">
							<button
								onClick={() => setDossierTab("syllabus")}
								className={`h-full border-b-2 px-1 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
									dossierTab === "syllabus"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<BookOpen className="w-3.5 h-3.5" />
								<span>Portion & Chapters Tracker</span>
							</button>
							<button
								onClick={() => setDossierTab("attendance")}
								className={`h-full border-b-2 px-1 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
									dossierTab === "attendance"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<CalendarCheck className="w-3.5 h-3.5" />
								<span>Attendance Log</span>
							</button>
							<button
								onClick={() => setDossierTab("assessments")}
								className={`h-full border-b-2 px-1 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
									dossierTab === "assessments"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<Award className="w-3.5 h-3.5" />
								<span>Assessments & Gradebook</span>
							</button>
							<button
								onClick={() => setDossierTab("tasks")}
								className={`h-full border-b-2 px-1 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
									dossierTab === "tasks"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<ListTodo className="w-3.5 h-3.5" />
								<span>Assigned Tasks ({dossierTasks.length})</span>
							</button>
							<button
								onClick={() => setDossierTab("fees")}
								className={`h-full border-b-2 px-1 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
									dossierTab === "fees"
										? "border-indigo-600 text-indigo-700"
										: "border-transparent hover:text-slate-900"
								}`}
							>
								<IndianRupee className="w-3.5 h-3.5" />
								<span>Fee Commitments</span>
							</button>
						</div>

						{/* Modal Content */}
						<div className="p-5 overflow-y-auto flex-1 space-y-4">
							{loadingDossier ? (
								<BouncingLoader text="Loading student dossier & academic history..." color="indigo" />
							) : (
								<>
									{/* TAB 1: SYLLABUS & CHAPTERS */}
									{dossierTab === "syllabus" && (
										<div className="space-y-4">
											{/* Status banner */}
											<div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div>
													<span className="text-[10px] font-bold text-slate-500 uppercase">Portion Completion</span>
													<div className="text-xl font-extrabold text-slate-900 mt-0.5">
														{dossierSyllabus.summary?.completedChapters || 0} of {dossierSyllabus.chapters?.length || 0} Chapters Completed
													</div>
													<div className="text-xs text-slate-500">
														{dossierSyllabus.summary?.inProgressChapters || 0} currently in progress
													</div>
												</div>

												<div className="flex items-center gap-3">
													<div className="w-24 bg-slate-200 rounded-full h-2.5 overflow-hidden">
														<div
															className="bg-emerald-600 h-2.5 rounded-full"
															style={{ width: `${dossierSyllabus.summary?.completionPercentage || 0}%` }}
														/>
													</div>
													<span className="text-sm font-bold text-emerald-700">
														{dossierSyllabus.summary?.completionPercentage || 0}%
													</span>
												</div>
											</div>

											{/* Add Chapter for this student */}
											<form
												onSubmit={handleAddDossierChapter}
												className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
											>
												<span className="font-bold text-slate-800 text-[11px] block">
													Add Individual Chapter for {dossierStudent.fullName}
												</span>
												<div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
													<div>
														<select
															value={dossierChapterSubjectId}
															onChange={(e) => setDossierChapterSubjectId(e.target.value)}
															className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
														>
															{(subjects.length > 0 ? subjects : (dossierSyllabus.subjects || [])).map((s: any) => {
																const sId = s.id || s.subjectId;
																const sName = s.name || s.subjectName || "Subject";
																const sCode = s.code || s.subjectCode || "";
																return (
																	<option key={sId} value={sId}>
																		{sName} {sCode ? `(${sCode})` : ""}
																	</option>
																);
															})}
															{(subjects.length === 0 && (dossierSyllabus.subjects?.length || 0) === 0) && (
																<option value="">-- No subjects available --</option>
															)}
														</select>
													</div>
													<div>
														<input
															type="number"
															placeholder="Ch #"
															value={dossierChapterNumber}
															onChange={(e) => setDossierChapterNumber(Number(e.target.value))}
															className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
														/>
													</div>
													<div className="sm:col-span-2 flex gap-2">
														<input
															type="text"
															required
															placeholder="Chapter title..."
															value={dossierChapterTitle}
															onChange={(e) => setDossierChapterTitle(e.target.value)}
															className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
														/>
														<button
															type="submit"
															disabled={submittingDossierChapter}
															className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-xs"
														>
															{submittingDossierChapter ? "Saving..." : "Add"}
														</button>
													</div>
												</div>
											</form>

											{/* Subject breakdown */}
											{dossierSyllabus.subjects && dossierSyllabus.subjects.length > 0 ? (
												<div className="space-y-3">
													{dossierSyllabus.subjects.map((sub: any) => {
														const currentSubId = sub.id || sub.subjectId;
														const subChapters = (dossierSyllabus.chapters || []).filter(
															(c: any) => c.subjectId === currentSubId
														);
														const compCount = subChapters.filter((c: any) => c.status === "completed").length;

														return (
															<div key={currentSubId} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
																<div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
																	<div className="flex items-center gap-2">
																		<span className="font-bold text-slate-900 text-xs">{sub.name || sub.subjectName || "Subject"}</span>
																		{(sub.code || sub.subjectCode) && (
																			<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 font-semibold border border-slate-200">
																				{sub.code || sub.subjectCode}
																			</span>
																		)}
																	</div>
																	<span className="text-[11px] font-semibold text-slate-600">
																		{compCount} / {subChapters.length} Completed
																	</span>
																</div>

																<div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
																	{subChapters.length === 0 ? (
																		<div className="p-3 text-xs text-slate-400 italic">No chapters added yet.</div>
																	) : (
																		subChapters.map((ch: any) => (
																			<div
																				key={ch.id}
																				className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition"
																			>
																				<div className="flex items-center gap-2.5">
																					<span className="font-mono text-slate-400 font-bold text-[11px]">
																						#{ch.chapterNumber}
																					</span>
																					<span className="font-semibold text-slate-900">{ch.chapterTitle || ch.title || "Untitled Chapter"}</span>
																				</div>

																				<button
																					onClick={() => handleUpdateChapterStatus(ch.id, ch.status)}
																					className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 ${
																						ch.status === "completed"
																							? "bg-emerald-100 text-emerald-800 border border-emerald-200"
																							: ch.status === "in_progress"
																							? "bg-amber-100 text-amber-800 border border-amber-200"
																							: "bg-slate-100 text-slate-600 border border-slate-200"
																					}`}
																				>
																					{ch.status === "completed" && <CheckCircle className="w-3 h-3 text-emerald-600" />}
																					{ch.status === "in_progress" && <Clock className="w-3 h-3 text-amber-600" />}
																					{ch.status === "pending" && <Circle className="w-3 h-3 text-slate-400" />}
																					<span>{ch.status.replace("_", " ")}</span>
																				</button>
																			</div>
																		))
																	)}
																</div>
															</div>
														);
													})}
												</div>
											) : (
												<div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
													No curriculum configured for this student yet.
												</div>
											)}
										</div>
									)}

									{/* TAB 2: ATTENDANCE */}
									{dossierTab === "attendance" && (
										<div className="space-y-4">
											<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
												<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
													<span className="text-[10px] font-bold text-emerald-700 uppercase">Presence Rate</span>
													<div className="text-2xl font-black text-emerald-800 mt-1">
														{dossierAttendance.summary?.attendancePercentage || 0}%
													</div>
													<span className="text-[11px] text-emerald-600">Total Attendance</span>
												</div>

												<div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
													<span className="text-[10px] font-bold text-slate-500 uppercase">Sessions Attended</span>
													<div className="text-2xl font-black text-slate-900 mt-1">
														{dossierAttendance.summary?.presentDays || 0}
													</div>
													<span className="text-[11px] text-slate-500">Present</span>
												</div>

												<div className="p-4 rounded-xl bg-red-50 border border-red-100">
													<span className="text-[10px] font-bold text-red-600 uppercase">Absences</span>
													<div className="text-2xl font-black text-red-700 mt-1">
														{dossierAttendance.summary?.absentDays || 0}
													</div>
													<span className="text-[11px] text-red-500">Missed</span>
												</div>
											</div>

											{/* Attendance Table */}
											<div className="border border-slate-200 rounded-2xl overflow-hidden">
												<div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
													Attendance Log History
												</div>
												<div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
													{dossierAttendance.records && dossierAttendance.records.length > 0 ? (
														dossierAttendance.records.map((rec: any, idx: number) => (
															<div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition">
																<div className="flex items-center gap-2">
																	<CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
																	<span className="font-semibold text-slate-900">
																		{new Date(rec.sessionDate).toLocaleDateString("en-IN", {
																			weekday: "short",
																			year: "numeric",
																			month: "short",
																			day: "numeric",
																		})}
																	</span>
																</div>
																<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
																	rec.status === "present"
																		? "bg-emerald-100 text-emerald-800"
																		: "bg-red-100 text-red-800"
																}`}>
																	{rec.status}
																</span>
															</div>
														))
													) : (
														<div className="p-8 text-center text-xs text-slate-400">
															No attendance records marked for this student yet.
														</div>
													)}
												</div>
											</div>
										</div>
									)}

									{/* TAB 3: ASSESSMENTS */}
									{dossierTab === "assessments" && (
										<div className="space-y-4">
											{/* Direct Assessment Entry */}
											<form
												onSubmit={handleRecordDossierGrade}
												className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs"
											>
												<span className="font-bold text-slate-800 text-xs block">
													Record Assessment Mark for {dossierStudent.fullName}
												</span>

												<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
													<div>
														<label className="block text-[11px] font-semibold text-slate-600 mb-1">Title *</label>
														<input
															type="text"
															required
															placeholder="e.g. Unit Test 2"
															value={dossierGradeTitle}
															onChange={(e) => setDossierGradeTitle(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>

													<div>
														<label className="block text-[11px] font-semibold text-slate-600 mb-1">Subject *</label>
														<select
															required
															value={dossierGradeSubjectId}
															onChange={(e) => setDossierGradeSubjectId(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														>
															{(subjects.length > 0 ? subjects : (dossierSyllabus.subjects || [])).map((sub: any) => {
																const subId = sub.id || sub.subjectId;
																const subName = sub.name || sub.subjectName || "Subject";
																const subCode = sub.code || sub.subjectCode || "";
																return (
																	<option key={subId} value={subId}>
																		{subName} {subCode ? `(${subCode})` : ""}
																	</option>
																);
															})}
															{(subjects.length === 0 && (dossierSyllabus.subjects?.length || 0) === 0) && (
																<option value="">-- No subjects available --</option>
															)}
														</select>
													</div>

													<div className="grid grid-cols-2 gap-2">
														<div>
															<label className="block text-[11px] font-semibold text-slate-600 mb-1">Max</label>
															<input
																type="number"
																value={dossierGradeMax}
																onChange={(e) => setDossierGradeMax(Number(e.target.value))}
																className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
															/>
														</div>
														<div>
															<label className="block text-[11px] font-semibold text-slate-600 mb-1">Obtained</label>
															<input
																type="number"
																value={dossierGradeObtained}
																onChange={(e) => setDossierGradeObtained(Number(e.target.value))}
																className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 font-bold text-emerald-800"
															/>
														</div>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<input
														type="text"
														placeholder="Optional remarks (e.g. Good performance)"
														value={dossierGradeRemarks}
														onChange={(e) => setDossierGradeRemarks(e.target.value)}
														className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
													/>
													<button
														type="submit"
														disabled={submittingDossierGrade}
														className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
													>
														{submittingDossierGrade ? "Saving..." : "Record Score"}
													</button>
												</div>
											</form>

											{/* Assessments List */}
											<div className="border border-slate-200 rounded-2xl overflow-hidden">
												<div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800">
													Grading History
												</div>
												<div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
													{dossierAssessments.assessments && dossierAssessments.assessments.length > 0 ? (
														dossierAssessments.assessments.map((ass: any) => (
															<div key={ass.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition">
																<div>
																	<div className="font-semibold text-slate-900">{ass.title}</div>
																	<div className="text-[11px] text-slate-500">
																		{ass.subjectName} • {ass.assessmentDate ? new Date(ass.assessmentDate).toLocaleDateString("en-IN") : "Recent"}
																	</div>
																	{ass.remarks && (
																		<div className="text-[10px] text-slate-500 italic mt-0.5">Note: {ass.remarks}</div>
																	)}
																</div>

																<div className="text-right">
																	<div className="font-bold text-slate-900 text-sm">
																		{ass.marksObtained} / {ass.maxMarks}
																	</div>
																	<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
																		{ass.percentage}% {ass.grade ? `(${ass.grade})` : ""}
																	</span>
																</div>
															</div>
														))
													) : (
														<div className="p-8 text-center text-xs text-slate-400">
															No assessment records logged for this student yet.
														</div>
													)}
												</div>
											</div>
										</div>
									)}

									{/* TAB 4: TASKS */}
									{dossierTab === "tasks" && (
										<div className="space-y-4">
											{/* Assign Task */}
											<form
												onSubmit={handleAssignDossierTask}
												className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs"
											>
												<span className="font-bold text-slate-800 text-xs block">
													Assign Task to {dossierStudent.fullName}
												</span>

												<div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
													<div className="sm:col-span-2">
														<input
															type="text"
															required
															placeholder="Task title (e.g. Complete French workbook #4)"
															value={dossierTaskTitle}
															onChange={(e) => setDossierTaskTitle(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>
													<div>
														<input
															type="date"
															value={dossierTaskDue}
															onChange={(e) => setDossierTaskDue(e.target.value)}
															className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
														/>
													</div>
													<div className="flex gap-2">
														<select
															value={dossierTaskPriority}
															onChange={(e) => setDossierTaskPriority(e.target.value as any)}
															className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
														>
															<option value="normal">Normal</option>
															<option value="high">High</option>
															<option value="urgent">Urgent</option>
														</select>
														<button
															type="submit"
															disabled={submittingDossierTask}
															className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
														>
															{submittingDossierTask ? "Assigning..." : "Assign"}
														</button>
													</div>
												</div>
											</form>

											{/* Task list */}
											<div className="space-y-2">
												{dossierTasks.length === 0 ? (
													<div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
														No tasks assigned to this student yet.
													</div>
												) : (
													dossierTasks.map((t) => (
														<div
															key={t.id}
															className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
														>
															<div className="flex items-center gap-2.5">
																<div
																	className={`w-3.5 h-3.5 rounded-full ${
																		t.status === "completed" ? "bg-emerald-500" : "bg-amber-400"
																	}`}
																/>
																<div>
																	<div className={`font-semibold ${t.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
																		{t.title}
																	</div>
																	{t.dueDate && (
																		<div className="text-[10px] text-slate-400">
																			Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
																		</div>
																	)}
																</div>
															</div>

															<div className="flex items-center gap-2">
																<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
																	t.priority === "urgent" || t.priority === "high"
																		? "bg-red-50 text-red-700 border border-red-200"
																		: "bg-slate-100 text-slate-600"
																}`}>
																	{t.priority || "normal"}
																</span>
																<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
																	t.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
																}`}>
																	{t.status}
																</span>
															</div>
														</div>
													))
												)}
											</div>
										</div>
									)}

									{/* TAB 5: FEES */}
									{dossierTab === "fees" && (
										<div className="space-y-4">
											<div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
												<div>
													<span className="text-[10px] font-bold text-slate-500 uppercase">Outstanding Balance</span>
													<div className="text-2xl font-black text-amber-600 mt-0.5">
														₹{(studentFeeDetails?.summary?.balance || 0).toLocaleString("en-IN")}
													</div>
													<div className="text-xs text-slate-500">
														Total Paid: ₹{(studentFeeDetails?.summary?.totalPaid || 0).toLocaleString("en-IN")}
													</div>
												</div>

												<button
													onClick={() => {
														setDossierStudent(null);
														openFeePlanModal(dossierStudent);
													}}
													className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
												>
													Manage Full Fee Plan
												</button>
											</div>

											{/* Fee Installments List */}
											<div className="space-y-2">
												<div className="font-bold text-slate-800 text-xs">Fee Obligations & Dues</div>
												{studentFeeDetails?.obligations && studentFeeDetails.obligations.length > 0 ? (
													studentFeeDetails.obligations.map((ob: any) => {
														const todayStr = new Date().toISOString().split("T")[0];
														const isPaid = ob.status === "paid" || (ob.balanceInRupees !== undefined && ob.balanceInRupees <= 0);
														const isDueNow = !isPaid && ob.dueDate && ob.dueDate <= todayStr;
														return (
															<div
																key={ob.id}
																className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-2"
															>
																<div>
																	<div className="font-semibold text-slate-900">{ob.installmentTitle}</div>
																	<div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
																		<span className={isDueNow ? "font-bold text-rose-600" : ""}>
																			Due: {ob.dueDate}
																		</span>
																		<span>•</span>
																		<span>Total: ₹{ob.netAmountInRupees?.toLocaleString("en-IN")}</span>
																	</div>
																</div>
																<div className="flex items-center gap-2">
																	<button
																		onClick={() => handleOpenQuickDueDate(ob)}
																		className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 transition inline-flex items-center gap-1"
																		title="Change Payment Due Date"
																	>
																		<Calendar className="w-3 h-3 text-indigo-500" />
																		<span>Change Date</span>
																	</button>
																	<span
																		className={`px-2 py-0.5 rounded text-[10px] font-bold ${
																			isPaid
																				? "bg-emerald-100 text-emerald-800"
																				: isDueNow
																				? "bg-rose-100 text-rose-800 border border-rose-200 font-extrabold"
																				: "bg-slate-100 text-slate-700 border border-slate-200"
																		}`}
																	>
																		{isPaid
																			? "Paid"
																			: isDueNow
																			? `Due Now: ₹${ob.balanceInRupees?.toLocaleString("en-IN")}`
																			: `Scheduled (Due ${ob.dueDate})`}
																	</span>
																</div>
															</div>
														);
													})
												) : (
													<div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
														No fee installments logged yet.
													</div>
												)}
											</div>

											{/* Verified Tax Invoices & Receipts */}
											<div className="pt-3 border-t border-slate-200 space-y-2">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-1.5">
														<FileText className="w-3.5 h-3.5 text-indigo-600" />
														<span className="font-bold text-slate-800 text-xs">Official Invoices & Tax Receipts</span>
													</div>
													<span className="text-[10px] font-semibold text-slate-500">
														{studentFeeDetails?.receipts?.length || 0} Issued
													</span>
												</div>

												{studentFeeDetails?.receipts && studentFeeDetails.receipts.length > 0 ? (
													<div className="space-y-2">
														{studentFeeDetails.receipts.map((rc: any) => (
															<div
																key={rc.id}
																className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-indigo-300 transition"
															>
																<div className="space-y-0.5">
																	<div className="flex items-center gap-2">
																		<span className="font-mono font-bold text-indigo-700">{rc.receiptNumber}</span>
																		<span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">PAID</span>
																	</div>
																	<div className="text-[11px] text-slate-600 font-medium">{rc.installmentTitle || "Tuition Fee"}</div>
																	<div className="text-[10px] text-slate-400">
																		{rc.generatedAt ? new Date(rc.generatedAt * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Verified"} • {rc.paymentMode?.toUpperCase() || "ONLINE"}
																	</div>
																</div>

																<div className="flex items-center gap-3">
																	<div className="text-right">
																		<div className="font-black text-slate-900 text-sm">₹{rc.amountPaidInRupees?.toLocaleString("en-IN")}</div>
																		<div className="text-[9px] text-slate-400">Paid Amount</div>
																	</div>
																	<button
																		type="button"
																		onClick={() => {
																			setAdminViewingReceipt({
																				receiptNumber: rc.receiptNumber,
																				studentName: dossierStudent?.fullName || "Student",
																				studentUsername: dossierStudent?.username || "",
																				admissionNumber: dossierStudent?.admissionNumber,
																				batchName: dossierStudent?.batchName || "Academic Batch",
																				amountPaidInRupees: rc.amountPaidInRupees,
																				paymentMode: rc.paymentMode || "ONLINE",
																				installmentTitle: rc.installmentTitle || "Academic Fee",
																				structureName: rc.structureName || "Standard Academic Plan",
																				paymentDate: rc.generatedAt ? new Date(rc.generatedAt * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN"),
																				transactionRef: rc.id,
																				notes: rc.remarks || "Audited and verified institutional fee receipt."
																			});
																		}}
																		className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition"
																	>
																		<FileText className="w-3.5 h-3.5" />
																		<span>Tax Invoice</span>
																	</button>
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
														No formal receipts issued yet. Receipts are generated automatically upon fee payment.
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

			{/* ================= CREATE STUDENT MODAL ================= */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
							<div>
								<h3 className="font-bold text-slate-900 text-sm">Enroll New Student</h3>
								<p className="text-[11px] text-slate-500">Admit student, assign batch, and configure fee schedule.</p>
							</div>
							<button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleCreateStudent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
								<input
									type="text"
									required
									value={formData.fullName}
									onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
									placeholder="e.g. Aarav Sharma"
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Target Program / Syllabus *</label>
									<select
										value={formData.targetExam}
										onChange={(e) => {
											const nextExam = e.target.value;
											const matchingBatches = getBatchesForTargetExam(nextExam);
											setFormData({
												...formData,
												targetExam: nextExam,
												batchId: matchingBatches[0]?.id || "",
											});
										}}
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
									>
										<option value="Grade 1 to 4 (CBSE & ICSE)" className="bg-white text-slate-900">
											Grade 1 to 4 (CBSE & ICSE, 5 PM - 8 PM)
										</option>
										<option value="Grade 5 to 8 (CBSE & ICSE)" className="bg-white text-slate-900">
											Grade 5 to 8 (CBSE & ICSE, 5 PM - 8 PM)
										</option>
										<option value="Grade 9 to 12 (CBSE & ICSE)" className="bg-white text-slate-900">
											Grade 9 to 12 (CBSE & ICSE, 5 PM - 8 PM)
										</option>
										<option value="NIOS 9th & 10th Open School" className="bg-white text-slate-900">
											NIOS 9th & 10th Open School (9 AM - 12:30 PM)
										</option>
									</select>
								</div>

								<div>
									<label className="block font-semibold text-slate-700 mb-1">Grade / Class</label>
									<select
										value={formData.batchId}
										onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
									>
										<option value="" className="bg-white text-slate-900">
											-- Select Grade / Class --
										</option>
										{getBatchesForTargetExam(formData.targetExam).map((b) => (
											<option key={b.id} value={b.id} className="bg-white text-slate-900">
												{b.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
									<input
										type="tel"
										value={formData.phone}
										onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
										placeholder="10-digit mobile"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>

								<div>
									<label className="block font-semibold text-slate-700 mb-1">Email Address</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
										placeholder="student@example.com"
										className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
									/>
								</div>
							</div>

							{/* Monthly Fee Plan Configuration */}
							<div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
								<div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px]">
									<CreditCard className="w-3.5 h-3.5 text-indigo-600" />
									<span>Monthly Fee Plan & Due Date</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block font-medium text-slate-700 mb-1">Monthly Fee (₹)</label>
										<input
											type="number"
											value={formData.monthlyFeeAmountInRupees}
											onChange={(e) => setFormData({ ...formData, monthlyFeeAmountInRupees: Number(e.target.value) })}
											placeholder="e.g. 5000"
											className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
										/>
									</div>

									<div>
										<label className="block font-medium text-slate-700 mb-1">Monthly Payment Due Day</label>
										<select
											value={formData.monthlyDueDay}
											onChange={(e) => setFormData({ ...formData, monthlyDueDay: Number(e.target.value) })}
											className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
										>
											{[1, 5, 7, 10, 15, 20, 25, 28].map((day) => (
												<option key={day} value={day} className="bg-white text-slate-900">
													{day === 1 ? "1st" : `${day}th`} of every month
												</option>
											))}
										</select>
									</div>
								</div>
							</div>

							{/* Guardian Information */}
							<div className="pt-2 border-t border-slate-100">
								<h4 className="font-bold text-slate-800 mb-2">Parent / Guardian Details</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block font-semibold text-slate-700 mb-1">Guardian Name</label>
										<input
											type="text"
											value={formData.guardianName}
											onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
											placeholder="Parent Name"
											className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
										/>
									</div>
									<div>
										<label className="block font-semibold text-slate-700 mb-1">Guardian Phone</label>
										<input
											type="tel"
											value={formData.guardianPhone}
											onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
											placeholder="Contact number"
											className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
										/>
									</div>
								</div>
							</div>

							<div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
								<span className="font-semibold">Auto-Generated Password:</span> A secure unique password (e.g.{" "}
								<code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">
									Proventus@3393
								</code>
								) will be automatically created and displayed upon enrollment.
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
									{submitting ? "Enrolling Student..." : "Enroll Student"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= FEE PLAN MODAL ================= */}
			{isFeePlanOpen && selectedStudent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
							<div>
								<h3 className="font-bold text-slate-900 text-sm">
									Fee Plan & Payment Schedule: {selectedStudent.fullName}
								</h3>
								<p className="text-[11px] text-slate-500">
									Username: <span className="font-mono font-bold text-indigo-600">{selectedStudent.username}</span> |
									Admission: {selectedStudent.admissionNumber}
								</p>
							</div>
							<button onClick={() => setIsFeePlanOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
							{/* Current Fee Obligations */}
							<div>
								<h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
									<IndianRupee className="w-4 h-4 text-emerald-600" />
									<span>Existing Fee Installments & Status</span>
								</h4>

								{loadingFeeDetails ? (
									<BouncingLoader text="Loading student fee obligations..." color="indigo" />
								) : !studentFeeDetails?.obligations || studentFeeDetails.obligations.length === 0 ? (
									<div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-center border border-slate-200">
										No fee installments created yet. Add an installment below.
									</div>
								) : (
									<div className="space-y-2">
										{studentFeeDetails.obligations.map((ob: any) => {
											const todayStr = new Date().toISOString().split("T")[0];
											const isPaid = ob.status === "paid" || (ob.balanceInRupees !== undefined && ob.balanceInRupees <= 0);
											const isDueNow = !isPaid && ob.dueDate && ob.dueDate <= todayStr;
											return (
												<div
													key={ob.id}
													className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3"
												>
													<div className="space-y-1">
														<div className="font-bold text-slate-900">{ob.installmentTitle}</div>
														<div className="flex items-center gap-3 text-slate-500 text-[11px]">
															<span className={isDueNow ? "font-bold text-rose-600" : ""}>
																Due: {ob.dueDate}
															</span>
															<span>•</span>
															<span>Total: ₹{ob.netAmountInRupees.toLocaleString("en-IN")}</span>
															<span>•</span>
															<span className="text-emerald-600 font-medium">
																Paid: ₹{ob.paidAmountInRupees.toLocaleString("en-IN")}
															</span>
														</div>
													</div>

													<div className="flex items-center gap-2">
														<span
															className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
																isPaid
																	? "bg-emerald-50 text-emerald-700 border border-emerald-200"
																	: isDueNow
																	? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
																	: "bg-slate-100 text-slate-700 border border-slate-200"
															}`}
														>
															{isPaid
																? "Paid"
																: isDueNow
																? `Due Now: ₹${ob.balanceInRupees.toLocaleString("en-IN")}`
																: `Scheduled (Due ${ob.dueDate})`}
														</span>
														<button
															type="button"
															onClick={() => handleOpenQuickDueDate(ob)}
															title="Quickly change due date"
															className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
														>
															<Calendar className="w-3.5 h-3.5" />
														</button>
														<button
															type="button"
															onClick={() => startEditObligation(ob)}
															title="Edit installment"
															className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
														>
															<Edit3 className="w-3.5 h-3.5" />
														</button>
														<button
															type="button"
															onClick={() => handleDeleteFeeObligation(ob.id)}
															title="Delete installment"
															className="p-1.5 text-slate-400 hover:text-red-600 transition"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Add / Edit Fee Installment */}
							<div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="font-bold text-slate-800 text-[11px]">
										{editingObligationId ? "Edit Fee Obligation / Installment" : "Add New Fee Obligation / Month"}
									</h4>
									{editingObligationId && (
										<button
											type="button"
											onClick={cancelEditObligation}
											className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
										>
											Cancel Edit
										</button>
									)}
								</div>

								<form onSubmit={handleAddFeeObligation} className="space-y-3">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="block font-medium text-slate-700 mb-1">Installment Title</label>
											<input
												type="text"
												required
												value={feeFormData.installmentTitle}
												onChange={(e) => setFeeFormData({ ...feeFormData, installmentTitle: e.target.value })}
												placeholder="e.g. Monthly Tuition Fee (Dec 2026)"
												className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
											/>
										</div>

										<div>
											<label className="block font-medium text-slate-700 mb-1">Due Date</label>
											<input
												type="date"
												required
												value={feeFormData.dueDate}
												onChange={(e) => setFeeFormData({ ...feeFormData, dueDate: e.target.value })}
												className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="block font-medium text-slate-700 mb-1">Base Amount (₹)</label>
											<input
												type="number"
												required
												value={feeFormData.baseAmountInRupees}
												onChange={(e) =>
													setFeeFormData({ ...feeFormData, baseAmountInRupees: Number(e.target.value) })
												}
												placeholder="5000"
												className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
											/>
										</div>

										<div>
											<label className="block font-medium text-slate-700 mb-1">Concession / Discount (₹)</label>
											<input
												type="number"
												value={feeFormData.concessionAmountInRupees}
												onChange={(e) =>
													setFeeFormData({ ...feeFormData, concessionAmountInRupees: Number(e.target.value) })
												}
												placeholder="0"
												className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
											/>
										</div>
									</div>

									<div className="flex items-center justify-end gap-2 pt-1">
										{editingObligationId && (
											<button
												type="button"
												onClick={cancelEditObligation}
												className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
											>
												Cancel
											</button>
										)}
										<button
											type="submit"
											disabled={submitting}
											className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
										>
											{submitting
												? (editingObligationId ? "Updating..." : "Adding...")
												: (editingObligationId ? "Update Fee Installment" : "+ Add Fee Installment")}
										</button>
									</div>
								</form>
							</div>

							<div className="pt-2 flex justify-end">
								<button
									type="button"
									onClick={() => setIsFeePlanOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ================= ASSIGN / CHANGE BATCH MODAL ================= */}
			{isAssignBatchOpen && selectedStudent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
							<div>
								<h3 className="font-bold text-slate-900 text-sm">Assign Grade/Class & Program</h3>
								<p className="text-[11px] text-slate-500">{selectedStudent.fullName} ({selectedStudent.username})</p>
							</div>
							<button onClick={() => setIsAssignBatchOpen(false)} className="text-slate-400 hover:text-slate-600">
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSaveBatchAssignment} className="p-6 space-y-4 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">Target Program / Syllabus *</label>
								<select
									value={selectedTargetExam}
									onChange={(e) => {
										const nextExam = e.target.value;
										setSelectedTargetExam(nextExam);
										const matchingBatches = getBatchesForTargetExam(nextExam);
										if (matchingBatches.length > 0 && !matchingBatches.some((b) => b.id === selectedBatchId)) {
											setSelectedBatchId(matchingBatches[0].id);
										}
									}}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								>
									<option value="Grade 1 to 4 (CBSE & ICSE)">Grade 1 to 4 (CBSE & ICSE, 5 PM - 8 PM)</option>
									<option value="Grade 5 to 8 (CBSE & ICSE)">Grade 5 to 8 (CBSE & ICSE, 5 PM - 8 PM)</option>
									<option value="Grade 9 to 12 (CBSE & ICSE)">Grade 9 to 12 (CBSE & ICSE, 5 PM - 8 PM)</option>
									<option value="NIOS 9th & 10th Open School">NIOS 9th & 10th Open School (9 AM - 12:30 PM)</option>
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">Grade / Class</label>
								<select
									value={selectedBatchId}
									onChange={(e) => setSelectedBatchId(e.target.value)}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								>
									<option value="">-- No Grade / Class (Unassigned) --</option>
									{getBatchesForTargetExam(selectedTargetExam).map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
								<p className="text-[10px] text-slate-500 mt-1">
									Assigning a grade connects the student to the teachers handling that cohort and enables portion tracking.
								</p>
							</div>

							<div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setIsAssignBatchOpen(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-semibold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{submitting ? "Saving..." : "Save Assignment"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= CREDENTIALS MODAL ================= */}
			{createdCredentials && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
						<div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
							<CheckCircle2 className="w-6 h-6" />
						</div>

						<div>
							<h3 className="text-base font-bold text-slate-900">{createdCredentials.title || "Student Enrolled Successfully"}</h3>
							<p className="text-xs text-slate-500 mt-1">Credentials ready for student & parent portal access.</p>
						</div>

						<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
							<div>
								<span className="text-slate-500">Student Name:</span>
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
									const text = `Proventus Academy Student Login:\nName: ${createdCredentials.fullName}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.defaultPassword}\nPortal: https://proventusacademy.com/login`;
									navigator.clipboard.writeText(text);
									setCopied(true);
									setTimeout(() => setCopied(false), 2000);
								}}
								className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
							>
								{copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
								{copied ? "Copied to Clipboard!" : "Copy Student Login"}
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

			{/* Quick Change Due Date Modal */}
			{quickDueModal.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-indigo-600" />
								<h3 className="font-bold text-slate-900 text-sm">Update Payment Due Date</h3>
							</div>
							<button
								onClick={() => setQuickDueModal((prev) => ({ ...prev, isOpen: false }))}
								className="text-slate-400 hover:text-slate-600"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSaveQuickDueDate} className="p-5 space-y-4 text-xs">
							<div>
								<div className="font-semibold text-slate-800">{quickDueModal.title}</div>
								<div className="text-[11px] text-slate-500 mt-0.5">
									Current Due Date: <span className="font-semibold text-slate-700">{quickDueModal.currentDueDate || "Not set"}</span>
								</div>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1.5">New Payment Due Date *</label>
								<input
									type="date"
									required
									value={quickDueModal.newDueDate}
									onChange={(e) => setQuickDueModal((prev) => ({ ...prev, newDueDate: e.target.value }))}
									className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
								/>
								<p className="text-[10px] text-slate-400 mt-1">
									Note: Outstanding balance will only be displayed as due to parents on/after this date.
								</p>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setQuickDueModal((prev) => ({ ...prev, isOpen: false }))}
									className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={quickDueModal.saving}
									className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
								>
									{quickDueModal.saving ? "Saving..." : "Update Due Date"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Official Parent / Student Tax Invoice Modal */}
			{adminViewingReceipt && (
				<ParentInvoiceModal
					invoice={adminViewingReceipt}
					onClose={() => setAdminViewingReceipt(null)}
				/>
			)}
		</div>
	);
}

// API client for Proventus Academy ERP Cloudflare Worker API

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://alphagrad-erp-api.divyansh-shukla.workers.dev";

function getAuthHeader(): Record<string, string> {
	if (typeof window === "undefined") return {};
	const isSuperAdmin = window.location.pathname.startsWith("/super-admin");
	const token = isSuperAdmin
		? localStorage.getItem("alphagrad_super_token")
		: (localStorage.getItem("alphagrad_token") || localStorage.getItem("proventus_token"));

	const parts = window.location.pathname.split("/").filter(Boolean);
	const schoolCode = localStorage.getItem("alphagrad_school_code") || (parts[0] && parts[0] !== "super-admin" ? parts[0] : null);

	const headers: Record<string, string> = {};
	if (token) headers["Authorization"] = `Bearer ${token}`;
	if (schoolCode) headers["x-school-code"] = schoolCode;
	return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...getAuthHeader(),
		...((options.headers as Record<string, string>) || {}),
	};

	const formattedEndpoint = endpoint.startsWith("/api/v1") ? endpoint : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

	const url = `${API_BASE}${formattedEndpoint}`;
	const res = await fetch(url, { ...options, headers });

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(errorData.error || `Request failed with status ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export const api = {
	// 0. Super Admin Governance
	superAdmin: {
		login: (data: { email: string; password: string }) =>
			request<{ token: string; user: any }>("/api/v1/super-admin/auth/login", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		me: () => request<{ user: any }>("/api/v1/super-admin/auth/me"),
		getStats: () =>
			request<{ totalSchools: number; activeSchools: number; totalStudents: number; totalTeachers: number }>(
				"/api/v1/super-admin/stats"
			),
		getSchools: () => request<{ schools: any[] }>("/api/v1/super-admin/schools"),
		createSchool: (data: any) =>
			request<{ message: string; school: any }>("/api/v1/super-admin/schools", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		updateFeatures: (schoolId: string, features: Record<string, number>) =>
			request<{ message: string; features: any }>("/api/v1/super-admin/schools/" + schoolId + "/features", {
				method: "PUT",
				body: JSON.stringify(features),
			}),
		updateSchool: (schoolId: string, data: any) =>
			request<{ message: string; school: any }>("/api/v1/super-admin/schools/" + schoolId, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		resetAdminPassword: (schoolId: string, newPassword?: string) =>
			request<{ message: string; username: string; password: string }>(
				"/api/v1/super-admin/schools/" + schoolId + "/reset-admin",
				{
					method: "POST",
					body: JSON.stringify({ newPassword }),
				}
			),
	},

	// 0.1 Public School Config Discovery
	school: {
		getPublic: (schoolCode: string) =>
			request<{ school: any; features: any }>("/api/v1/schools/" + schoolCode + "/public"),
	},
	// Generic REST Helpers
	get: <T = any>(endpoint: string) => request<T>(endpoint),
	post: <T = any>(endpoint: string, body?: any) =>
		request<T>(endpoint, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		}),
	put: <T = any>(endpoint: string, body?: any) =>
		request<T>(endpoint, {
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		}),
	delete: <T = any>(endpoint: string) =>
		request<T>(endpoint, {
			method: "DELETE",
		}),

	// 1. Auth
	auth: {
		login: (data: { schoolCode?: string; username: string; password: string }) =>
			request<{ token: string; user: any; school: any; features: any }>("/api/v1/auth/login", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		me: () => request<{ user: any }>("/api/v1/auth/me"),
		resetPassword: (data: { userId: string; newPassword?: string }) =>
			request<{ message: string; username: string; password: string; fullName: string; role: string }>(
				"/api/v1/auth/reset-password",
				{
					method: "POST",
					body: JSON.stringify(data),
				}
			),
	},

	// 2. Health & System
	health: () => request<any>("/api/v1/health"),
	reports: {
		overview: () => request<{ overview: any }>("/api/v1/reports/overview"),
	},
	settings: {
		get: () => request<{ institute: any; settings: any }>("/api/v1/settings"),
		update: (data: any) =>
			request<{ message: string }>("/api/v1/settings", {
				method: "PUT",
				body: JSON.stringify(data),
			}),
	},

	// 3. Students
	students: {
		list: (params?: { batchId?: string; search?: string }) => {
			const query = new URLSearchParams(params as any).toString();
			return request<{ students: any[] }>(`/api/v1/students${query ? `?${query}` : ""}`);
		},
		get: (id: string) => request<{ student: any; guardians: any[]; enrollments: any[] }>(`/api/v1/students/${id}`),
		create: (data: any) =>
			request<{ message: string; student: any; credentials: any }>("/api/v1/students", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/students/${id}`, {
				method: "DELETE",
			}),
		assignBatch: (id: string, data: { batchId?: string; targetExam?: string }) =>
			request<{ message: string }>(`/api/v1/students/${id}/batch`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
	},

	// 4. Teachers
	teachers: {
		list: () => request<{ teachers: any[] }>("/api/v1/teachers"),
		create: (data: any) =>
			request<{ message: string; teacher: any; credentials: any }>("/api/v1/teachers", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/teachers/${id}`, {
				method: "DELETE",
			}),
		assign: (data: any) =>
			request<{ message: string; assignmentId: string }>("/api/v1/teachers/assign", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		removeAssignment: (assignmentId: string) =>
			request<{ message: string }>(`/api/v1/teachers/assign/${assignmentId}`, {
				method: "DELETE",
			}),
		bulkRemoveAssignments: (assignmentIds: string[]) =>
			request<{ message: string }>("/api/v1/teachers/assign/bulk-delete", {
				method: "POST",
				body: JSON.stringify({ assignmentIds }),
			}),
		getAssignments: (id: string) => request<{ assignments: any[] }>(`/api/v1/teachers/${id}/assignments`),
		getAttendance: (id: string) => request<{ teacherId: string; attendance: any[] }>(`/api/v1/teachers/${id}/attendance`),
		markAttendance: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/teachers/${id}/attendance`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		getChaptersOversight: (id: string) =>
			request<{ teacherId: string; curriculumOversight: any[] }>(`/api/v1/teachers/${id}/chapters`),
	},

	// 5. Academic
	academic: {
		classes: () => request<{ classes: any[] }>("/api/v1/academic/classes"),
		createClass: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/academic/classes", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		deleteClass: (id: string) =>
			request<{ message: string }>(`/api/v1/academic/classes/${id}`, {
				method: "DELETE",
			}),
		batches: (classId?: string) =>
			request<{ batches: any[] }>(`/api/v1/academic/batches${classId ? `?classId=${classId}` : ""}`),
		createBatch: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/academic/batches", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		deleteBatch: (id: string) =>
			request<{ message: string }>(`/api/v1/academic/batches/${id}`, {
				method: "DELETE",
			}),
		subjects: () => request<{ subjects: any[] }>("/api/v1/academic/subjects"),
		createSubject: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/academic/subjects", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		deleteSubject: (id: string) =>
			request<{ message: string }>(`/api/v1/academic/subjects/${id}`, {
				method: "DELETE",
			}),
		batchStudents: (batchId: string) => request<{ students: any[] }>(`/api/v1/academic/batches/${batchId}/students`),
		batchTimetables: (batchId: string) => request<{ timetables: any[] }>(`/api/v1/academic/timetables/batch/${batchId}`),
	},

	// 6. Attendance
	attendance: {
		mark: (data: any) =>
			request<{ message: string; sessionId: string }>("/api/v1/attendance/sessions", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		batchSessions: (batchId: string) => request<{ sessions: any[] }>(`/api/v1/attendance/batch/${batchId}`),
		studentSummary: (studentId: string) => request<{ summary: any; records: any[] }>(`/api/v1/attendance/student/${studentId}`),
	},

	// 7. Homework
	homework: {
		publish: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/homework", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		batchHomework: (batchId: string) => request<{ homework: any[] }>(`/api/v1/homework/batch/${batchId}`),
		submit: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/homework/${id}/submit`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		studentSubmissions: (studentId: string) => request<{ submissions: any[] }>(`/api/v1/homework/student/${studentId}`),
	},

	// 8. Remarks
	remarks: {
		create: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/remarks", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		studentRemarks: (studentId: string) => request<{ remarks: any[] }>(`/api/v1/remarks/student/${studentId}`),
	},

	// 9. Notices
	notices: {
		list: () => request<{ notices: any[] }>("/api/v1/notices"),
		publish: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/notices", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/notices/${id}`, {
				method: "DELETE",
			}),
	},

	// 10. Fees & Payments
	fees: {
		structures: () => request<{ feeStructures: any[] }>("/api/v1/fees/structures"),
		createStructure: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/fees/structures", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		updateStructure: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/fees/structures/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		deleteStructure: (id: string) =>
			request<{ message: string }>(`/api/v1/fees/structures/${id}`, {
				method: "DELETE",
			}),
		allObligations: () => request<{ obligations: any[] }>("/api/v1/fees/obligations"),
		createObligation: (data: any) =>
			request<{ message: string; id: string }>("/api/v1/fees/obligations", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		updateObligation: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/fees/obligations/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		deleteObligation: (id: string) =>
			request<{ message: string }>(`/api/v1/fees/obligations/${id}`, {
				method: "DELETE",
			}),
		studentFees: (studentId: string) =>
			request<{ summary: any; obligations: any[]; receipts: any[] }>(`/api/v1/fees/student/${studentId}`),
	},
	payments: {
		createOrder: (obligationId: string) =>
			request<{
				orderId: string;
				razorpayOrderId: string;
				amountInPaise: number;
				amountInRupees: number;
				currency: string;
				razorpayKeyId: string;
				obligationTitle: string;
			}>("/api/v1/payments/create-order", {
				method: "POST",
				body: JSON.stringify({ obligationId }),
			}),
		verify: (data: { orderId: string; razorpayPaymentId: string; razorpaySignature?: string; paymentMethod?: string }) =>
			request<{ message: string; verified: boolean; receipt: any; receiptNumber?: string }>("/api/v1/payments/verify", {
				method: "POST",
				body: JSON.stringify(data),
			}),
	},

	// 11. Complaints
	complaints: {
		list: () => request<{ complaints: any[] }>("/api/v1/complaints"),
		get: (id: string) => request<{ complaint: any; responses: any[] }>(`/api/v1/complaints/${id}`),
		create: (data: any) =>
			request<{ message: string; ticketNumber: string; id: string }>("/api/v1/complaints", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		respond: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/complaints/${id}/respond`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/complaints/${id}`, {
				method: "DELETE",
			}),
	},

	// 12. Syllabus / Portion Tracker
	syllabus: {
		batch: (batchId: string, studentId?: string) =>
			request<{ batchId: string; studentId?: string | null; summary: any; subjects: any[]; chapters: any[] }>(
				`/api/v1/syllabus/batch/${batchId}${studentId ? `?studentId=${studentId}` : ""}`
			),
		student: (studentId: string) =>
			request<{ studentId: string; batchId: string; batchName: string; summary: any; subjects: any[]; chapters: any[] }>(
				`/api/v1/syllabus/student/${studentId}`
			),
		create: (data: any) =>
			request<{ message: string; chapter: any }>("/api/v1/syllabus", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: any) =>
			request<{ message: string; chapter: any }>(`/api/v1/syllabus/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/syllabus/${id}`, {
				method: "DELETE",
			}),
	},

	// 13. Monthly Assessments
	assessments: {
		batch: (batchId: string, params?: { studentId?: string; subjectId?: string }) => {
			const query = new URLSearchParams(params as any).toString();
			return request<{ batchId: string; studentId?: string; assessments: any[] }>(
				`/api/v1/assessments/batch/${batchId}${query ? `?${query}` : ""}`
			);
		},
		get: (id: string) =>
			request<{ assessment: any; marks: any[] }>(`/api/v1/assessments/${id}`),
		student: (studentId: string) =>
			request<{ studentId: string; batchId: string; batchName: string; summary: any; assessments: any[] }>(
				`/api/v1/assessments/student/${studentId}`
			),
		create: (data: any) =>
			request<{ message: string; assessment: any }>("/api/v1/assessments", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		createStudentMark: (data: any) =>
			request<{ message: string; assessmentId: string; studentId: string; marksObtained: number; grade: string }>(
				"/api/v1/assessments/student-mark",
				{
					method: "POST",
					body: JSON.stringify(data),
				}
			),
		submitMarks: (id: string, data: { marks: Array<{ studentId: string; marksObtained: number; grade?: string; remarks?: string }> }) =>
			request<{ message: string; count: number }>(`/api/v1/assessments/${id}/marks`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/assessments/${id}`, {
				method: "DELETE",
			}),
	},

	// 14. Tasks (For Teachers & Students)
	tasks: {
		list: (params?: { assignedToType?: string; assignedToId?: string; status?: string }) => {
			const query = new URLSearchParams(params as any).toString();
			return request<{ tasks: any[] }>(`/api/v1/tasks${query ? `?${query}` : ""}`);
		},
		create: (data: any) =>
			request<{ message: string; task: any }>("/api/v1/tasks", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: any) =>
			request<{ message: string; task: any }>(`/api/v1/tasks/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/tasks/${id}`, {
				method: "DELETE",
			}),
	},

	// 15. Accounting & Financial Intelligence (P&L, Fees, Salaries, Expenditures)
	accounting: {
		overview: (params?: { period?: string; startDate?: string; endDate?: string }) => {
			const query = new URLSearchParams(params as any).toString();
			return request<{
				period: { key: string; startDate: string; endDate: string };
				summary: {
					totalCollectedInRupees: number;
					allTimeCollectedInRupees: number;
					totalPendingInRupees: number;
					totalOverdueInRupees: number;
					monthlyStaffPayrollCommitment: number;
					totalSalariesPaidInPeriod: number;
					totalExpendituresInPeriod: number;
					totalOutflowInPeriod: number;
					netProfitInPeriod: number;
					profitMarginPercent: number;
					isProfitable: boolean;
				};
				expensesByCategory: Record<string, number>;
				activeStaffCount: number;
				recentReceipts: any[];
				recentExpenditures: any[];
				recentSalaryDisbursements: any[];
			}>(`/api/v1/accounting/overview${query ? `?${query}` : ""}`);
		},
		expenditures: () => request<{ expenditures: any[] }>("/api/v1/accounting/expenditures"),
		createExpenditure: (data: {
			title: string;
			category: string;
			amountInRupees: number;
			expenseDate: string;
			paymentMode?: string;
			paidTo?: string;
			receiptRef?: string;
			notes?: string;
		}) =>
			request<{ message: string; id: string }>("/api/v1/accounting/expenditures", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		deleteExpenditure: (id: string) =>
			request<{ message: string }>(`/api/v1/accounting/expenditures/${id}`, {
				method: "DELETE",
			}),
		salaries: () =>
			request<{
				teachers: any[];
				disbursements: any[];
				monthlyPayrollTotal: number;
			}>("/api/v1/accounting/salaries"),
		disburseSalary: (data: {
			teacherId: string;
			month: string;
			amountInRupees: number;
			paymentDate: string;
			paymentMode?: string;
			transactionRef?: string;
			notes?: string;
		}) =>
			request<{ message: string; id: string }>("/api/v1/accounting/salaries/disburse", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		updateTeacherSalary: (teacherId: string, data: { monthlySalaryInRupees: number }) =>
			request<{ message: string }>(`/api/v1/teachers/${teacherId}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
	},

	// 17. Academic Calendar (Holidays, Assessments, Extra Classes & Events)
	calendar: {
		list: (params?: { month?: string; year?: string; category?: string; batchId?: string }) => {
			const query = new URLSearchParams(params as any).toString();
			return request<{
				events: any[];
				stats: {
					totalEvents: number;
					holidaysCount: number;
					assessmentsCount: number;
					extraCount: number;
				};
				upcomingHolidays: any[];
				upcomingAssessments: any[];
				upcomingEvents: any[];
			}>(`/api/v1/calendar${query ? `?${query}` : ""}`);
		},
		create: (data: any) =>
			request<{ message: string; event: any }>("/api/v1/calendar", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: any) =>
			request<{ message: string; event: any }>(`/api/v1/calendar/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/calendar/${id}`, {
				method: "DELETE",
			}),
		seedDefaults: () =>
			request<{ message: string; count: number }>("/api/v1/calendar/seed-defaults", {
				method: "POST",
			}),
	},

	// 18. Timetable / Class Schedule
	timetable: {
		list: (params?: { batchId?: string; teacherId?: string; dayOfWeek?: number }) => {
			const query = params ? new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))).toString() : "";
			return request<{
				timetable: any[];
				weekly: { dayName: string; entries: any[] }[];
				total: number;
			}>(`/api/v1/timetable${query ? `?${query}` : ""}`);
		},
		get: (id: string) => request<{ entry: any }>(`/api/v1/timetable/${id}`),
		create: (data: {
			batchId: string;
			subjectId: string;
			teacherId: string;
			dayOfWeek: number;
			startTime: string;
			endTime: string;
			roomNumber?: string;
		}) =>
			request<{ message: string; id: string }>("/api/v1/timetable", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Partial<{
			batchId: string;
			subjectId: string;
			teacherId: string;
			dayOfWeek: number;
			startTime: string;
			endTime: string;
			roomNumber: string;
		}>) =>
			request<{ message: string }>(`/api/v1/timetable/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/timetable/${id}`, {
				method: "DELETE",
			}),
		bulk: (batchId: string, entries: any[]) =>
			request<{ message: string; count: number }>("/api/v1/timetable/bulk", {
				method: "POST",
				body: JSON.stringify({ batchId, entries }),
			}),
	},

	// 18. AI Learning Ecosystem (Tutor, Governance, Worksheets, Tests, Campaigns)
	ai: {
		tutor: {
			getProfile: () => request<{ profile: any }>("/api/v1/ai/tutor/profile"),
			chat: (data: {
				conversationId?: string;
				question: string;
				subjectId?: string;
				topic?: string;
				imageUrl?: string;
				gradeId?: string;
				board?: "CBSE" | "ICSE" | "NIOS" | "State";
			}) =>
				request<{
					conversationId: string;
					messageId: string;
					response: string;
					model: string;
					tokensUsed: number;
					durationMs: number;
					academicContext: { grade: string; subject: string };
				}>("/api/v1/ai/tutor/chat", {
					method: "POST",
					body: JSON.stringify(data),
				}),
			conversations: () => request<{ conversations: any[] }>("/api/v1/ai/tutor/conversations"),
			getConversation: (id: string) => request<{ conversation: any; messages: any[] }>(`/api/v1/ai/tutor/conversations/${id}`),
			deleteConversation: (id: string) =>
				request<{ message: string }>(`/api/v1/ai/tutor/conversations/${id}`, {
					method: "DELETE",
				}),
			feedback: (messageId: string, isHelpful: boolean) =>
				request<{ message: string }>(`/api/v1/ai/tutor/messages/${messageId}/feedback`, {
					method: "POST",
					body: JSON.stringify({ isHelpful }),
				}),
		},
		admin: {
			getConfig: () => request<{ config: any; directory: any }>("/api/v1/ai/admin/config"),
			updateConfig: (data: any) =>
				request<{ message: string }>("/api/v1/ai/admin/config", {
					method: "PUT",
					body: JSON.stringify(data),
				}),
			getUsageReports: (days?: number) =>
				request<{
					summary: any;
					actionBreakdown: any[];
					modelBreakdown: any[];
					recentLogs: any[];
				}>(`/api/v1/ai/admin/reports/usage${days ? `?days=${days}` : ""}`),
			getAcademicReports: () =>
				request<{
					worksheetsCount: number;
					assignmentsCount: number;
					submissions: { total: number; graded: number; avgPercentage: number };
					tests: { totalAttempts: number; passedAttempts: number; avgPercentage: number };
					recentConversations: any[];
				}>("/api/v1/ai/admin/reports/academic"),
		},
	},

	// 19. AI Worksheets & Teacher Publishing
	worksheets: {
		generate: (data: {
			subjectId: string;
			classId?: string;
			chapter?: string;
			topics?: string[];
			difficulty?: "easy" | "medium" | "hard" | "mixed";
			questionCount?: number;
			questionTypes?: string[];
			includeHints?: boolean;
			includeSolutions?: boolean;
			board?: "CBSE" | "ICSE" | "NIOS" | "State";
			customInstructions?: string;
		}) =>
			request<{ message: string; worksheet: any }>("/api/v1/worksheets/generate", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		list: () => request<{ worksheets: any[] }>("/api/v1/worksheets"),
		get: (id: string) => request<{ worksheet: any }>(`/api/v1/worksheets/${id}`),
		update: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/worksheets/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		regenerateQuestion: (id: string, questionIndex: number) =>
			request<{ message: string; updatedQuestion: any; questions: any[] }>(
				`/api/v1/worksheets/${id}/regenerate-question`,
				{
					method: "POST",
					body: JSON.stringify({ questionIndex }),
				}
			),
		assign: (data: {
			worksheetId: string;
			batchId: string;
			title: string;
			dueDate: string;
			instructions?: string;
		}) =>
			request<{ message: string; assignmentId: string; assignedCount: number }>("/api/v1/worksheets/assign", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		teacherAssignments: () => request<{ assignments: any[] }>("/api/v1/worksheets/assignments/teacher"),
		studentAssignments: () => request<{ assignments: any[] }>("/api/v1/worksheets/assignments/student"),
	},

	// 20. AI Test Series & Tests
	tests: {
		series: (params?: { classId?: string; subjectId?: string }) => {
			const query = params ? "?" + new URLSearchParams(params as any).toString() : "";
			return request<{ testSeries: any[] }>(`/api/v1/tests/series${query}`);
		},
		list: (params?: { testSeriesId?: string; subjectId?: string }) => {
			const query = params ? "?" + new URLSearchParams(params as any).toString() : "";
			return request<{ tests: any[] }>(`/api/v1/tests${query}`);
		},
		generate: (data: {
			title: string;
			subjectId: string;
			classId?: string;
			testSeriesId?: string;
			chapter?: string;
			topics?: string[];
			difficulty?: string;
			questionCount?: number;
			durationMinutes?: number;
			passingMarks?: number;
			negativeMarkingRate?: number;
			isPaid?: boolean;
			priceInRupees?: number;
			board?: "CBSE" | "ICSE" | "NIOS" | "State";
		}) =>
			request<{
				message: string;
				testId: string;
				title: string;
				totalMarks: number;
				durationMinutes: number;
				questionCount: number;
			}>("/api/v1/tests/generate", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		get: (id: string) => request<{ test: any }>(`/api/v1/tests/${id}`),
		start: (id: string) => request<{ message: string; attemptId: string; startTime: number; savedAnswers?: any }>(`/api/v1/tests/${id}/start`, { method: "POST" }),
		saveProgress: (attemptId: string, answersData: any) =>
			request<{ message: string }>(`/api/v1/tests/attempts/${attemptId}/save-progress`, {
				method: "PUT",
				body: JSON.stringify({ answersData }),
			}),
		submit: (attemptId: string, data: { answers: any; durationSeconds?: number }) =>
			request<{
				message: string;
				result: {
					attemptId: string;
					score: number;
					maxMarks: number;
					percentage: number;
					isPassed: boolean;
					correctCount: number;
					incorrectCount: number;
					unattemptedCount: number;
					topicBreakdown: any;
					detailedQuestions: any[];
				};
			}>(`/api/v1/tests/attempts/${attemptId}/submit`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		results: (attemptId: string) => request<{ attempt: any }>(`/api/v1/tests/attempts/${attemptId}/results`),
	},

	// 21. Submissions & Grading
	submissions: {
		submit: (assignmentId: string, data: { answers: any[]; isDraft?: boolean }) =>
			request<{ message: string; submissionId: string; status: string; autoScore: number }>(
				`/api/v1/submissions/assignments/${assignmentId}/submit`,
				{
					method: "POST",
					body: JSON.stringify(data),
				}
			),
		assignmentRoster: (assignmentId: string) =>
			request<{ assignment: any; roster: any[] }>(`/api/v1/submissions/assignments/${assignmentId}`),
		get: (id: string) => request<{ submission: any }>(`/api/v1/submissions/${id}`),
		aiGrade: (id: string) =>
			request<{ message: string; answers: any[] }>(`/api/v1/submissions/${id}/ai-grade`, {
				method: "POST",
			}),
		grade: (id: string, data: { answers: any[]; generalFeedback?: string; returnForCorrection?: boolean }) =>
			request<{ message: string; totalScore: number; percentage: number; status: string }>(
				`/api/v1/submissions/${id}/grade`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				}
			),
	},

	// 22. Seasonal Campaigns & Dynamic SEO
	campaigns: {
		active: (audience?: string) =>
			request<{ campaign: any }>(`/api/v1/campaigns/active${audience ? `?audience=${audience}` : ""}`),
		list: () => request<{ campaigns: any[] }>("/api/v1/campaigns"),
		create: (data: any) =>
			request<{ message: string; campaignId: string }>("/api/v1/campaigns", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: any) =>
			request<{ message: string }>(`/api/v1/campaigns/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ message: string }>(`/api/v1/campaigns/${id}`, {
				method: "DELETE",
			}),
	},
};

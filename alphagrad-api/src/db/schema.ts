import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==========================================
// 1. SUPER ADMIN & MULTI-TENANCY CORE
// ==========================================

export const superAdmins = sqliteTable("super_admins", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	fullName: text("full_name").notNull(),
	role: text("role").notNull().default("super_admin"),
	status: text("status").notNull().default("active"), // 'active', 'suspended'
	lastLoginAt: integer("last_login_at"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_super_admins_email").on(table.email),
]);

export const schools = sqliteTable("schools", {
	id: text("id").primaryKey(), // e.g. 'sch_resonance'
	code: text("code").notNull().unique(), // e.g. 'resonance' -> erp.novaxai.in/resonance/login
	name: text("name").notNull(), // 'Resonance Academy'
	brand: text("brand").notNull().default("AlphaGrad"),
	tagline: text("tagline"),
	address: text("address"),
	city: text("city").default("Bangalore"),
	state: text("state").default("Karnataka"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	logoUrl: text("logo_url"),
	themePrimary: text("theme_primary").default("#2563eb"),
	status: text("status").notNull().default("active"), // 'active', 'suspended', 'demo', 'expired'
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_schools_code").on(table.code),
	index("idx_schools_status").on(table.status),
]);

export const schoolFeatures = sqliteTable("school_features", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().unique().references(() => schools.id, { onDelete: "cascade" }),
	academic: integer("academic").notNull().default(1),
	students: integer("students").notNull().default(1),
	teachers: integer("teachers").notNull().default(1),
	attendance: integer("attendance").notNull().default(1),
	timetable: integer("timetable").notNull().default(1),
	homework: integer("homework").notNull().default(1),
	remarks: integer("remarks").notNull().default(1),
	assessments: integer("assessments").notNull().default(1),
	syllabus: integer("syllabus").notNull().default(1),
	tasks: integer("tasks").notNull().default(1),
	notices: integer("notices").notNull().default(1),
	complaints: integer("complaints").notNull().default(1),
	fees: integer("fees").notNull().default(1),
	calendar: integer("calendar").notNull().default(1),
	accounting: integer("accounting").notNull().default(1),
	campaigns: integer("campaigns").notNull().default(1),
	aiTutor: integer("ai_tutor").notNull().default(1),
	worksheets: integer("worksheets").notNull().default(1),
	tests: integer("tests").notNull().default(1),
	aiAdmin: integer("ai_admin").notNull().default(1),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_school_features_school").on(table.schoolId),
]);

export const schoolSettings = sqliteTable("school_settings", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().unique().references(() => schools.id, { onDelete: "cascade" }),
	usernamePrefix: text("username_prefix").notNull().default("Alpha"),
	usernameCounter: integer("username_counter").notNull().default(1933),
	academicYearStartMonth: integer("academic_year_start_month").notNull().default(4), // April
	feeReminderDays: integer("fee_reminder_days").notNull().default(7),
	allowStudentComplaints: integer("allow_student_complaints").notNull().default(1),
	razorpayKeyId: text("razorpay_key_id"),
	razorpayKeySecret: text("razorpay_key_secret"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_school_settings_school").on(table.schoolId),
]);

// ==========================================
// 2. ROLES & USERS
// ==========================================

export const roles = sqliteTable("roles", {
	id: text("id").primaryKey(), // 'admin', 'teacher', 'student_parent'
	name: text("name").notNull(),
	description: text("description"),
	permissions: text("permissions").notNull().default("[]"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	username: text("username").notNull(), // e.g. 'Alpha1000'
	email: text("email"),
	firebaseUid: text("firebase_uid"),
	roleId: text("role_id").notNull().references(() => roles.id),
	fullName: text("full_name").notNull(),
	phone: text("phone"),
	status: text("status").notNull().default("active"),
	passwordHash: text("password_hash"),
	plainPassword: text("plain_password"),
	mustChangePassword: integer("must_change_password").notNull().default(0),
	lastLoginAt: integer("last_login_at"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_users_school_username").on(table.schoolId, table.username),
	index("idx_users_school").on(table.schoolId),
	index("idx_users_role").on(table.roleId),
	index("idx_users_email").on(table.email),
]);

// ==========================================
// 3. ACADEMIC STRUCTURE
// ==========================================

export const academicSessions = sqliteTable("academic_sessions", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	name: text("name").notNull(), // '2026-2027'
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	isCurrent: integer("is_current").notNull().default(1),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_sessions_school").on(table.schoolId),
]);

export const classes = sqliteTable("classes", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_classes_school_code").on(table.schoolId, table.code),
	index("idx_classes_school").on(table.schoolId),
]);

export const batches = sqliteTable("batches", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
	academicSessionId: text("academic_session_id").notNull().references(() => academicSessions.id),
	name: text("name").notNull(),
	code: text("code"),
	capacity: integer("capacity").default(40),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_batches_school").on(table.schoolId),
	index("idx_batches_class").on(table.classId),
	index("idx_batches_session").on(table.academicSessionId),
]);

export const subjects = sqliteTable("subjects", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_subjects_school_code").on(table.schoolId, table.code),
	index("idx_subjects_school").on(table.schoolId),
]);

// ==========================================
// 4. TEACHERS & STUDENTS
// ==========================================

export const teachers = sqliteTable("teachers", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
	employeeId: text("employee_id").notNull(),
	designation: text("designation").default("Subject Faculty"),
	qualifications: text("qualifications"),
	specialization: text("specialization"),
	monthlySalaryInRupees: integer("monthly_salary_in_rupees").default(0),
	joiningDate: text("joining_date"),
	status: text("status").notNull().default("active"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_teachers_school_emp").on(table.schoolId, table.employeeId),
	index("idx_teachers_school").on(table.schoolId),
	index("idx_teachers_user_id").on(table.userId),
]);

export const students = sqliteTable("students", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
	admissionNumber: text("admission_number").notNull(),
	rollNumber: text("roll_number"),
	dob: text("dob"),
	gender: text("gender"),
	bloodGroup: text("blood_group"),
	address: text("address"),
	emergencyContact: text("emergency_contact"),
	targetExam: text("target_exam").default("Board Exams"),
	status: text("status").notNull().default("active"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_students_school_adm").on(table.schoolId, table.admissionNumber),
	index("idx_students_school").on(table.schoolId),
	index("idx_students_user_id").on(table.userId),
]);

export const guardians = sqliteTable("guardians", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	relation: text("relation").notNull().default("Father"),
	phone: text("phone").notNull(),
	email: text("email"),
	occupation: text("occupation"),
	isPrimaryContact: integer("is_primary_contact").notNull().default(1),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_guardians_school").on(table.schoolId),
	index("idx_guardians_student").on(table.studentId),
]);

export const studentEnrollments = sqliteTable("student_enrollments", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	rollNumber: text("roll_number"),
	enrolledAt: integer("enrolled_at").notNull().default(sql`(unixepoch())`),
	status: text("status").notNull().default("active"),
}, (table) => [
	uniqueIndex("idx_enrollments_unique").on(table.studentId, table.batchId),
	index("idx_enrollments_school").on(table.schoolId),
	index("idx_enrollments_batch").on(table.batchId),
]);

export const teacherAssignments = sqliteTable("teacherAssignments", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
	isClassTeacher: integer("is_class_teacher").notNull().default(0),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_teacher_asgn_unique").on(table.teacherId, table.batchId, table.subjectId),
	index("idx_teacher_asgn_school").on(table.schoolId),
	index("idx_teacher_asgn_batch").on(table.batchId),
]);

// ==========================================
// 5. TIMETABLE & ATTENDANCE
// ==========================================

export const timetables = sqliteTable("timetables", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
	dayOfWeek: integer("day_of_week").notNull(), // 1=Mon ... 7=Sun
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	roomNumber: text("room_number"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_timetables_school").on(table.schoolId),
	index("idx_timetables_batch").on(table.batchId),
	index("idx_timetables_teacher").on(table.teacherId),
]);

export const attendanceSessions = sqliteTable("attendance_sessions", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").references(() => subjects.id),
	teacherId: text("teacher_id").notNull().references(() => teachers.id),
	sessionDate: text("session_date").notNull(), // 'YYYY-MM-DD'
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_att_sessions_school").on(table.schoolId),
	index("idx_att_sessions_batch_date").on(table.batchId, table.sessionDate),
]);

export const attendanceRecords = sqliteTable("attendance_records", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	sessionId: text("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	status: text("status").notNull(), // 'present', 'absent', 'late', 'excused'
	remarks: text("remarks"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_att_records_unique").on(table.sessionId, table.studentId),
	index("idx_att_records_school").on(table.schoolId),
	index("idx_att_records_student").on(table.studentId),
]);

export const teacherAttendance = sqliteTable("teacher_attendance", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
	attendanceDate: text("attendance_date").notNull(),
	status: text("status").notNull().default("present"), // 'present', 'absent', 'on_leave', 'half_day'
	remarks: text("remarks"),
	checkInTime: text("check_in_time"),
	checkOutTime: text("check_out_time"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_teacher_att_unique").on(table.teacherId, table.attendanceDate),
	index("idx_teacher_att_school").on(table.schoolId),
]);

// ==========================================
// 6. HOMEWORK & REMARKS
// ==========================================

export const homework = sqliteTable("homework", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").notNull().references(() => subjects.id),
	teacherId: text("teacher_id").notNull().references(() => teachers.id),
	title: text("title").notNull(),
	description: text("description").notNull(),
	dueDate: text("due_date").notNull(),
	attachmentUrl: text("attachment_url"),
	status: text("status").notNull().default("published"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_homework_school").on(table.schoolId),
	index("idx_homework_batch").on(table.batchId),
	index("idx_homework_teacher").on(table.teacherId),
]);

export const homeworkSubmissions = sqliteTable("homework_submissions", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	homeworkId: text("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	submissionText: text("submission_text"),
	fileUrl: text("file_url"),
	status: text("status").notNull().default("submitted"), // 'submitted', 'evaluated', 'late'
	teacherFeedback: text("teacher_feedback"),
	score: real("score"),
	submittedAt: integer("submitted_at").notNull().default(sql`(unixepoch())`),
	evaluatedAt: integer("evaluated_at"),
}, (table) => [
	uniqueIndex("idx_hw_sub_unique").on(table.homeworkId, table.studentId),
	index("idx_hw_sub_school").on(table.schoolId),
	index("idx_hw_sub_student").on(table.studentId),
]);

export const teacherRemarks = sqliteTable("teacher_remarks", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").notNull().references(() => teachers.id),
	batchId: text("batch_id").notNull().references(() => batches.id),
	subjectId: text("subject_id").references(() => subjects.id),
	category: text("category").notNull().default("academic"),
	remarkText: text("remark_text").notNull(),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_remarks_school").on(table.schoolId),
	index("idx_remarks_student").on(table.studentId),
]);

// ==========================================
// 7. NOTICES & COMPLAINTS
// ==========================================

export const notices = sqliteTable("notices", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content").notNull(),
	targetAudience: text("target_audience").notNull().default("all"), // 'all', 'students', 'teachers', 'parents'
	batchId: text("batch_id").references(() => batches.id),
	attachmentUrl: text("attachment_url"),
	isPinned: integer("is_pinned").notNull().default(0),
	publishedBy: text("published_by").notNull().references(() => users.id),
	publishedAt: integer("published_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_notices_school").on(table.schoolId),
	index("idx_notices_audience").on(table.targetAudience),
]);

export const complaints = sqliteTable("complaints", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	ticketNumber: text("ticket_number").notNull().unique(),
	studentId: text("student_id").notNull().references(() => students.id),
	submittedByUserId: text("submitted_by_user_id").notNull().references(() => users.id),
	category: text("category").notNull(), // 'academic', 'faculty', 'facility', 'fee', 'transport', 'other'
	subjectId: text("subject_id").references(() => subjects.id),
	title: text("title").notNull(),
	description: text("description").notNull(),
	assignedToTeacherId: text("assigned_to_teacher_id").references(() => teachers.id),
	status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved', 'escalated', 'closed'
	priority: text("priority").notNull().default("medium"),
	resolutionNotes: text("resolution_notes"),
	resolvedAt: integer("resolved_at"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_complaints_ticket").on(table.ticketNumber),
	index("idx_complaints_school").on(table.schoolId),
	index("idx_complaints_student").on(table.studentId),
]);

export const complaintResponses = sqliteTable("complaint_responses", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	complaintId: text("complaint_id").notNull().references(() => complaints.id, { onDelete: "cascade" }),
	responderUserId: text("responder_user_id").notNull().references(() => users.id),
	message: text("message").notNull(),
	isInternalNote: integer("is_internal_note").notNull().default(0),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_complaint_resp_school").on(table.schoolId),
	index("idx_complaint_resp_complaint").on(table.complaintId),
]);

// ==========================================
// 8. FEES & PAYMENTS
// ==========================================

export const feeStructures = sqliteTable("fee_structures", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	academicSessionId: text("academic_session_id").notNull().references(() => academicSessions.id),
	classId: text("class_id").notNull().references(() => classes.id),
	name: text("name").notNull(),
	totalAmountInCents: integer("total_amount_in_cents").notNull(), // In Paise (100 = 1 INR)
	description: text("description"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_fee_structures_school").on(table.schoolId),
]);

export const studentFeeObligations = sqliteTable("student_fee_obligations", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	feeStructureId: text("fee_structure_id").notNull().references(() => feeStructures.id),
	academicSessionId: text("academic_session_id").notNull().references(() => academicSessions.id),
	installmentTitle: text("installment_title").notNull(),
	dueDate: text("due_date").notNull(),
	baseAmountInCents: integer("base_amount_in_cents").notNull(),
	concessionAmountInCents: integer("concession_amount_in_cents").notNull().default(0),
	netAmountInCents: integer("net_amount_in_cents").notNull(),
	paidAmountInCents: integer("paid_amount_in_cents").notNull().default(0),
	status: text("status").notNull().default("pending"), // 'pending', 'partially_paid', 'paid', 'overdue'
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_fee_obligations_school").on(table.schoolId),
	index("idx_fee_obligations_student").on(table.studentId),
]);

export const paymentOrders = sqliteTable("payment_orders", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id),
	obligationId: text("obligation_id").notNull().references(() => studentFeeObligations.id),
	razorpayOrderId: text("razorpay_order_id").notNull().unique(),
	amountInCents: integer("amount_in_cents").notNull(),
	currency: text("currency").notNull().default("INR"),
	status: text("status").notNull().default("created"), // 'created', 'paid', 'failed'
	receiptNumber: text("receipt_number"),
	notes: text("notes"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_payment_orders_rzp").on(table.razorpayOrderId),
	index("idx_payment_orders_school").on(table.schoolId),
]);

export const paymentTransactions = sqliteTable("payment_transactions", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	orderId: text("order_id").notNull().references(() => paymentOrders.id),
	studentId: text("student_id").notNull().references(() => students.id),
	obligationId: text("obligation_id").notNull().references(() => studentFeeObligations.id),
	razorpayPaymentId: text("razorpay_payment_id").notNull().unique(),
	razorpaySignature: text("razorpay_signature"),
	amountInCents: integer("amount_in_cents").notNull(),
	feeInCents: integer("fee_in_cents").default(0),
	taxInCents: integer("tax_in_cents").default(0),
	paymentMethod: text("payment_method"),
	status: text("status").notNull(), // 'captured', 'failed', 'refunded'
	errorCode: text("error_code"),
	errorDescription: text("error_description"),
	verifiedAt: integer("verified_at").notNull().default(sql`(unixepoch())`),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_transactions_rzp").on(table.razorpayPaymentId),
	index("idx_transactions_school").on(table.schoolId),
]);

export const receipts = sqliteTable("receipts", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	receiptNumber: text("receipt_number").notNull().unique(),
	transactionId: text("transaction_id").references(() => paymentTransactions.id),
	studentId: text("student_id").notNull().references(() => students.id),
	obligationId: text("obligation_id").notNull().references(() => studentFeeObligations.id),
	amountPaidInCents: integer("amount_paid_in_cents").notNull(),
	paymentMode: text("payment_mode").notNull().default("ONLINE_RAZORPAY"),
	remarks: text("remarks"),
	generatedAt: integer("generated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_receipts_number").on(table.receiptNumber),
	index("idx_receipts_school").on(table.schoolId),
	index("idx_receipts_student").on(table.studentId),
]);

// ==========================================
// 9. SYLLABUS, ASSESSMENTS & TASKS
// ==========================================

export const syllabusChapters = sqliteTable("syllabus_chapters", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").references(() => teachers.id),
	studentId: text("student_id").references(() => students.id, { onDelete: "cascade" }),
	chapterNumber: text("chapter_number").notNull(),
	chapterTitle: text("chapter_title").notNull(),
	status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed'
	progressPercentage: integer("progress_percentage").notNull().default(0),
	targetCompletionDate: text("target_completion_date"),
	completedAt: integer("completed_at"),
	notes: text("notes"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_syllabus_school").on(table.schoolId),
	index("idx_syllabus_batch").on(table.batchId),
]);

export const monthlyAssessments = sqliteTable("monthly_assessments", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").references(() => teachers.id),
	title: text("title").notNull(),
	month: text("month").notNull(),
	assessmentDate: text("assessment_date").notNull(),
	maxMarks: real("max_marks").notNull().default(100),
	passingMarks: real("passing_marks").default(40),
	status: text("status").notNull().default("published"),
	description: text("description"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_assessments_school").on(table.schoolId),
	index("idx_assessments_batch").on(table.batchId),
]);

export const assessmentMarks = sqliteTable("assessment_marks", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	assessmentId: text("assessment_id").notNull().references(() => monthlyAssessments.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	marksObtained: real("marks_obtained").notNull(),
	grade: text("grade"),
	rank: integer("rank"),
	remarks: text("remarks"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_assessment_marks_unique").on(table.assessmentId, table.studentId),
	index("idx_assessment_marks_school").on(table.schoolId),
]);

export const tasks = sqliteTable("tasks", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	assignedToType: text("assigned_to_type").notNull(), // 'teacher', 'student'
	assignedToId: text("assigned_to_id").notNull(),
	assignedByUserId: text("assigned_by_user_id").notNull().references(() => users.id),
	title: text("title").notNull(),
	description: text("description"),
	batchId: text("batch_id").references(() => batches.id),
	subjectId: text("subject_id").references(() => subjects.id),
	dueDate: text("due_date"),
	priority: text("priority").notNull().default("medium"),
	status: text("status").notNull().default("pending"),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_tasks_school").on(table.schoolId),
	index("idx_tasks_assigned").on(table.assignedToType, table.assignedToId),
]);

// ==========================================
// 10. ACCOUNTING & CALENDAR
// ==========================================

export const expenditures = sqliteTable("expenditures", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	category: text("category").notNull(), // 'rent', 'utilities', 'marketing', 'software', 'learning_materials', 'infrastructure', 'maintenance', 'other'
	title: text("title").notNull(),
	amountInRupees: integer("amount_in_rupees").notNull(),
	expenseDate: text("expense_date").notNull(),
	paymentMode: text("payment_mode").notNull().default("BANK_TRANSFER"),
	paidTo: text("paid_to"),
	receiptRef: text("receipt_ref"),
	notes: text("notes"),
	recordedByUserId: text("recorded_by_user_id").references(() => users.id),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_expenditures_school").on(table.schoolId),
	index("idx_expenditures_date").on(table.expenseDate),
]);

export const salaryDisbursements = sqliteTable("salary_disbursements", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
	month: text("month").notNull(), // 'YYYY-MM'
	amountInRupees: integer("amount_in_rupees").notNull(),
	paymentDate: text("payment_date").notNull(),
	paymentMode: text("payment_mode").notNull().default("BANK_TRANSFER"),
	transactionRef: text("transaction_ref"),
	status: text("status").notNull().default("paid"),
	notes: text("notes"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_salary_disburse_school").on(table.schoolId),
	index("idx_salary_disburse_teacher").on(table.teacherId),
]);

export const calendarEvents = sqliteTable("calendar_events", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	category: text("category").notNull().default("holiday"),
	subCategory: text("sub_category"),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	startTime: text("start_time"),
	endTime: text("end_time"),
	isAllDay: integer("is_all_day").notNull().default(1),
	batchId: text("batch_id").references(() => batches.id, { onDelete: "cascade" }),
	targetAudience: text("target_audience").notNull().default("all"),
	color: text("color"),
	location: text("location"),
	createdByUserId: text("created_by_user_id").references(() => users.id),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_calendar_school").on(table.schoolId),
	index("idx_calendar_date").on(table.startDate),
]);

// ==========================================
// 11. AI TUTOR, WORKSHEETS, TESTS & ADMIN COPILOT
// ==========================================

export const aiConfigurations = sqliteTable("ai_configurations", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().unique().references(() => schools.id, { onDelete: "cascade" }),
	isTutorEnabled: integer("is_tutor_enabled").notNull().default(1),
	isWorksheetGenEnabled: integer("is_worksheet_gen_enabled").notNull().default(1),
	isTestGenEnabled: integer("is_test_gen_enabled").notNull().default(1),
	defaultModel: text("default_model").notNull().default("llama-3.3-70b-versatile"),
	allowedModels: text("allowed_models").notNull().default('["llama-3.3-70b-versatile","llama-3.1-8b-instant"]'),
	maxRequestLength: integer("max_request_length").notNull().default(4000),
	dailyLimitPerStudent: integer("daily_limit_per_student").notNull().default(50),
	dailyLimitPerGrade: integer("daily_limit_per_grade").notNull().default(500),
	allowedSubjects: text("allowed_subjects").notNull().default("[]"),
	teachingStyle: text("teaching_style").notNull().default("encouraging_and_structured"),
	difficultyDefaults: text("difficulty_defaults").notNull().default("medium"),
	gradeGuidelines: text("grade_guidelines"),
	systemPromptExtra: text("system_prompt_extra"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_ai_config_school").on(table.schoolId),
]);

export const aiTutorConversations = sqliteTable("ai_tutor_conversations", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").references(() => subjects.id),
	gradeId: text("grade_id").references(() => classes.id),
	topic: text("topic"),
	title: text("title").notNull(),
	status: text("status").notNull().default("active"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_ai_conv_school").on(table.schoolId),
	index("idx_ai_conv_student").on(table.studentId),
]);

export const aiTutorMessages = sqliteTable("ai_tutor_messages", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	conversationId: text("conversation_id").notNull().references(() => aiTutorConversations.id, { onDelete: "cascade" }),
	role: text("role").notNull(), // 'user', 'assistant', 'system'
	content: text("content").notNull(),
	imageUrl: text("image_url"),
	tokensUsed: integer("tokens_used").notNull().default(0),
	responseTimeMs: integer("response_time_ms").notNull().default(0),
	isHelpful: integer("is_helpful"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_ai_msg_school").on(table.schoolId),
	index("idx_ai_msg_conv").on(table.conversationId),
]);

export const aiUsageRecords = sqliteTable("ai_usage_records", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => users.id),
	role: text("role").notNull(),
	studentId: text("student_id").references(() => students.id),
	actionType: text("action_type").notNull(),
	model: text("model").notNull(),
	promptTokens: integer("prompt_tokens").notNull().default(0),
	completionTokens: integer("completion_tokens").notNull().default(0),
	totalTokens: integer("total_tokens").notNull().default(0),
	estimatedCostInUsd: real("estimated_cost_in_usd").notNull().default(0),
	status: text("status").notNull().default("success"),
	errorMessage: text("error_message"),
	ipAddress: text("ip_address"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_ai_usage_school").on(table.schoolId),
	index("idx_ai_usage_user").on(table.userId),
]);

export const worksheets = sqliteTable("worksheets", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
	teacherId: text("teacher_id").references(() => teachers.id),
	studentId: text("student_id").references(() => students.id),
	classId: text("class_id").references(() => classes.id),
	subjectId: text("subject_id").notNull().references(() => subjects.id),
	chapter: text("chapter"),
	topics: text("topics").notNull().default("[]"),
	difficulty: text("difficulty").notNull().default("medium"),
	questionCount: integer("question_count").notNull().default(5),
	totalMarks: integer("total_marks").notNull().default(25),
	estimatedMinutes: integer("estimated_minutes").notNull().default(30),
	instructions: text("instructions"),
	questionsData: text("questions_data").notNull(),
	isTeacherCreated: integer("is_teacher_created").notNull().default(0),
	status: text("status").notNull().default("published"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_worksheets_school").on(table.schoolId),
	index("idx_worksheets_subject").on(table.subjectId),
]);

export const worksheetAssignments = sqliteTable("worksheet_assignments", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	worksheetId: text("worksheet_id").notNull().references(() => worksheets.id, { onDelete: "cascade" }),
	teacherId: text("teacher_id").references(() => teachers.id),
	batchId: text("batch_id").notNull().references(() => batches.id),
	title: text("title").notNull(),
	instructions: text("instructions"),
	dueDate: text("due_date").notNull(),
	status: text("status").notNull().default("active"),
	isSubmissionsAllowed: integer("is_submissions_allowed").notNull().default(1),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_ws_assign_school").on(table.schoolId),
	index("idx_ws_assign_batch").on(table.batchId),
]);

export const worksheetSubmissions = sqliteTable("worksheet_submissions", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	assignmentId: text("assignment_id").references(() => worksheetAssignments.id, { onDelete: "cascade" }),
	worksheetId: text("worksheet_id").notNull().references(() => worksheets.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	answersData: text("answers_data").notNull().default("[]"),
	status: text("status").notNull().default("submitted"),
	totalScore: real("total_score"),
	maxScore: real("max_score").default(25),
	percentage: real("percentage"),
	teacherFeedback: text("teacher_feedback"),
	submittedAt: integer("submitted_at").notNull().default(sql`(unixepoch())`),
	gradedAt: integer("graded_at"),
	gradedByTeacherId: text("graded_by_teacher_id").references(() => teachers.id),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	uniqueIndex("idx_ws_sub_unique").on(table.assignmentId, table.studentId),
	index("idx_ws_sub_school").on(table.schoolId),
]);

export const testSeries = sqliteTable("test_series", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	code: text("code"),
	classId: text("class_id").references(() => classes.id),
	subjectId: text("subject_id").references(() => subjects.id),
	isPaid: integer("is_paid").notNull().default(0),
	priceInPaise: integer("price_in_paise").notNull().default(0),
	batchId: text("batch_id").references(() => batches.id),
	validFrom: text("valid_from"),
	validTo: text("valid_to"),
	status: text("status").notNull().default("active"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_test_series_school").on(table.schoolId),
]);

export const tests = sqliteTable("tests", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	testSeriesId: text("test_series_id").references(() => testSeries.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	classId: text("class_id").references(() => classes.id),
	subjectId: text("subject_id").notNull().references(() => subjects.id),
	chapter: text("chapter"),
	topics: text("topics").notNull().default("[]"),
	difficulty: text("difficulty").notNull().default("medium"),
	durationMinutes: integer("duration_minutes").notNull().default(60),
	totalMarks: real("total_marks").notNull().default(100),
	passingMarks: real("passing_marks").default(40),
	negativeMarkingRate: real("negative_marking_rate").default(0),
	questionsData: text("questions_data").notNull(),
	isPaid: integer("is_paid").notNull().default(0),
	priceInPaise: integer("price_in_paise").default(0),
	status: text("status").notNull().default("published"),
	createdByUserId: text("created_by_user_id").references(() => users.id),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_tests_school").on(table.schoolId),
]);

export const testAttempts = sqliteTable("test_attempts", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	testId: text("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
	studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
	startTime: integer("start_time").notNull().default(sql`(unixepoch())`),
	submitTime: integer("submit_time"),
	durationSeconds: integer("duration_seconds").default(0),
	answersData: text("answers_data").notNull().default("{}"),
	score: real("score").default(0),
	maxMarks: real("max_marks").notNull().default(100),
	percentage: real("percentage").default(0),
	isPassed: integer("is_passed").default(0),
	topicBreakdown: text("topic_breakdown").default("{}"),
	status: text("status").notNull().default("in_progress"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_test_attempt_school").on(table.schoolId),
	index("idx_test_attempt_student").on(table.studentId),
]);

export const campaigns = sqliteTable("campaigns", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	campaignType: text("campaign_type").notNull().default("regular"),
	headline: text("headline").notNull(),
	subheadline: text("subheadline"),
	description: text("description"),
	ctaText: text("cta_text").notNull().default("Enroll Today"),
	ctaUrl: text("cta_url").notNull().default("/contact"),
	secondaryCtaText: text("secondary_cta_text"),
	secondaryCtaUrl: text("secondary_cta_url"),
	badgeText: text("badge_text"),
	bannerImageUrl: text("banner_image_url"),
	targetAudience: text("target_audience").notNull().default("all"),
	targetGrades: text("target_grades").notNull().default("[]"),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	priority: integer("priority").notNull().default(10),
	isActive: integer("is_active").notNull().default(1),
	isDefault: integer("is_default").notNull().default(0),
	seoTitle: text("seo_title"),
	seoDescription: text("seo_description"),
	seoKeywords: text("seo_keywords").notNull().default("[]"),
	createdByUserId: text("created_by_user_id").references(() => users.id),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_campaigns_school").on(table.schoolId),
	index("idx_campaigns_active").on(table.isActive),
]);

// ==========================================
// 12. AUDIT LOGS & NOTIFICATIONS
// ==========================================

export const auditLogs = sqliteTable("audit_logs", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").references(() => schools.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => users.id),
	action: text("action").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id"),
	details: text("details"),
	ipAddress: text("ip_address"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_audit_logs_school").on(table.schoolId),
	index("idx_audit_logs_user").on(table.userId),
]);

export const notifications = sqliteTable("notifications", {
	id: text("id").primaryKey(),
	schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	message: text("message").notNull(),
	type: text("type").notNull().default("info"),
	link: text("link"),
	isRead: integer("is_read").notNull().default(0),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
}, (table) => [
	index("idx_notifications_school").on(table.schoolId),
	index("idx_notifications_user").on(table.userId),
]);

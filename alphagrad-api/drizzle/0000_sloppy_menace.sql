CREATE TABLE `academic_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_current` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_school` ON `academic_sessions` (`school_id`);--> statement-breakpoint
CREATE TABLE `ai_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`is_tutor_enabled` integer DEFAULT 1 NOT NULL,
	`is_worksheet_gen_enabled` integer DEFAULT 1 NOT NULL,
	`is_test_gen_enabled` integer DEFAULT 1 NOT NULL,
	`default_model` text DEFAULT 'llama-3.3-70b-versatile' NOT NULL,
	`allowed_models` text DEFAULT '["llama-3.3-70b-versatile","llama-3.1-8b-instant"]' NOT NULL,
	`max_request_length` integer DEFAULT 4000 NOT NULL,
	`daily_limit_per_student` integer DEFAULT 50 NOT NULL,
	`daily_limit_per_grade` integer DEFAULT 500 NOT NULL,
	`allowed_subjects` text DEFAULT '[]' NOT NULL,
	`teaching_style` text DEFAULT 'encouraging_and_structured' NOT NULL,
	`difficulty_defaults` text DEFAULT 'medium' NOT NULL,
	`grade_guidelines` text,
	`system_prompt_extra` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_configurations_school_id_unique` ON `ai_configurations` (`school_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_config_school` ON `ai_configurations` (`school_id`);--> statement-breakpoint
CREATE TABLE `ai_tutor_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text,
	`grade_id` text,
	`topic` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grade_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_conv_school` ON `ai_tutor_conversations` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_conv_student` ON `ai_tutor_conversations` (`student_id`);--> statement-breakpoint
CREATE TABLE `ai_tutor_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`response_time_ms` integer DEFAULT 0 NOT NULL,
	`is_helpful` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `ai_tutor_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_msg_school` ON `ai_tutor_messages` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_msg_conv` ON `ai_tutor_messages` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `ai_usage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`student_id` text,
	`action_type` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_in_usd` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`error_message` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_usage_school` ON `ai_usage_records` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_user` ON `ai_usage_records` (`user_id`);--> statement-breakpoint
CREATE TABLE `assessment_marks` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`marks_obtained` real NOT NULL,
	`grade` text,
	`rank` integer,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assessment_id`) REFERENCES `monthly_assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assessment_marks_unique` ON `assessment_marks` (`assessment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_assessment_marks_school` ON `assessment_marks` (`school_id`);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_records_unique` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_att_records_school` ON `attendance_records` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_att_records_student` ON `attendance_records` (`student_id`);--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text,
	`teacher_id` text NOT NULL,
	`session_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_sessions_school` ON `attendance_sessions` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_att_sessions_batch_date` ON `attendance_sessions` (`batch_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_school` ON `audit_logs` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`class_id` text NOT NULL,
	`academic_session_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`capacity` integer DEFAULT 40,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_batches_school` ON `batches` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_batches_class` ON `batches` (`class_id`);--> statement-breakpoint
CREATE INDEX `idx_batches_session` ON `batches` (`academic_session_id`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'holiday' NOT NULL,
	`sub_category` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`start_time` text,
	`end_time` text,
	`is_all_day` integer DEFAULT 1 NOT NULL,
	`batch_id` text,
	`target_audience` text DEFAULT 'all' NOT NULL,
	`color` text,
	`location` text,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_school` ON `calendar_events` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_calendar_date` ON `calendar_events` (`start_date`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`title` text NOT NULL,
	`campaign_type` text DEFAULT 'regular' NOT NULL,
	`headline` text NOT NULL,
	`subheadline` text,
	`description` text,
	`cta_text` text DEFAULT 'Enroll Today' NOT NULL,
	`cta_url` text DEFAULT '/contact' NOT NULL,
	`secondary_cta_text` text,
	`secondary_cta_url` text,
	`badge_text` text,
	`banner_image_url` text,
	`target_audience` text DEFAULT 'all' NOT NULL,
	`target_grades` text DEFAULT '[]' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`priority` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`seo_keywords` text DEFAULT '[]' NOT NULL,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_school` ON `campaigns` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_campaigns_active` ON `campaigns` (`is_active`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_classes_school_code` ON `classes` (`school_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_classes_school` ON `classes` (`school_id`);--> statement-breakpoint
CREATE TABLE `complaint_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`complaint_id` text NOT NULL,
	`responder_user_id` text NOT NULL,
	`message` text NOT NULL,
	`is_internal_note` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`responder_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_complaint_resp_school` ON `complaint_responses` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_complaint_resp_complaint` ON `complaint_responses` (`complaint_id`);--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`ticket_number` text NOT NULL,
	`student_id` text NOT NULL,
	`submitted_by_user_id` text NOT NULL,
	`category` text NOT NULL,
	`subject_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assigned_to_teacher_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`resolution_notes` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaints_ticket_number_unique` ON `complaints` (`ticket_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_complaints_ticket` ON `complaints` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `idx_complaints_school` ON `complaints` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_complaints_student` ON `complaints` (`student_id`);--> statement-breakpoint
CREATE TABLE `expenditures` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`amount_in_rupees` integer NOT NULL,
	`expense_date` text NOT NULL,
	`payment_mode` text DEFAULT 'BANK_TRANSFER' NOT NULL,
	`paid_to` text,
	`receipt_ref` text,
	`notes` text,
	`recorded_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenditures_school` ON `expenditures` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_expenditures_date` ON `expenditures` (`expense_date`);--> statement-breakpoint
CREATE TABLE `fee_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_session_id` text NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`total_amount_in_cents` integer NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fee_structures_school` ON `fee_structures` (`school_id`);--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL,
	`relation` text DEFAULT 'Father' NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`occupation` text,
	`is_primary_contact` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_guardians_school` ON `guardians` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_guardians_student` ON `guardians` (`student_id`);--> statement-breakpoint
CREATE TABLE `homework` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`due_date` text NOT NULL,
	`attachment_url` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_homework_school` ON `homework` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_homework_batch` ON `homework` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_homework_teacher` ON `homework` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `homework_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`homework_id` text NOT NULL,
	`student_id` text NOT NULL,
	`submission_text` text,
	`file_url` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`teacher_feedback` text,
	`score` real,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`evaluated_at` integer,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`homework_id`) REFERENCES `homework`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hw_sub_unique` ON `homework_submissions` (`homework_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_sub_school` ON `homework_submissions` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_sub_student` ON `homework_submissions` (`student_id`);--> statement-breakpoint
CREATE TABLE `monthly_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text,
	`title` text NOT NULL,
	`month` text NOT NULL,
	`assessment_date` text NOT NULL,
	`max_marks` real DEFAULT 100 NOT NULL,
	`passing_marks` real DEFAULT 40,
	`status` text DEFAULT 'published' NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assessments_school` ON `monthly_assessments` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_assessments_batch` ON `monthly_assessments` (`batch_id`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`target_audience` text DEFAULT 'all' NOT NULL,
	`batch_id` text,
	`attachment_url` text,
	`is_pinned` integer DEFAULT 0 NOT NULL,
	`published_by` text NOT NULL,
	`published_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notices_school` ON `notices` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_notices_audience` ON `notices` (`target_audience`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`link` text,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_school` ON `notifications` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`obligation_id` text NOT NULL,
	`razorpay_order_id` text NOT NULL,
	`amount_in_cents` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`receipt_number` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obligation_id`) REFERENCES `student_fee_obligations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_orders_razorpay_order_id_unique` ON `payment_orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_orders_rzp` ON `payment_orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_orders_school` ON `payment_orders` (`school_id`);--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`order_id` text NOT NULL,
	`student_id` text NOT NULL,
	`obligation_id` text NOT NULL,
	`razorpay_payment_id` text NOT NULL,
	`razorpay_signature` text,
	`amount_in_cents` integer NOT NULL,
	`fee_in_cents` integer DEFAULT 0,
	`tax_in_cents` integer DEFAULT 0,
	`payment_method` text,
	`status` text NOT NULL,
	`error_code` text,
	`error_description` text,
	`verified_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `payment_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obligation_id`) REFERENCES `student_fee_obligations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactions_razorpay_payment_id_unique` ON `payment_transactions` (`razorpay_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transactions_rzp` ON `payment_transactions` (`razorpay_payment_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_school` ON `payment_transactions` (`school_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`transaction_id` text,
	`student_id` text NOT NULL,
	`obligation_id` text NOT NULL,
	`amount_paid_in_cents` integer NOT NULL,
	`payment_mode` text DEFAULT 'ONLINE_RAZORPAY' NOT NULL,
	`remarks` text,
	`generated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obligation_id`) REFERENCES `student_fee_obligations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_receipt_number_unique` ON `receipts` (`receipt_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_receipts_number` ON `receipts` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `idx_receipts_school` ON `receipts` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_receipts_student` ON `receipts` (`student_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `salary_disbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`month` text NOT NULL,
	`amount_in_rupees` integer NOT NULL,
	`payment_date` text NOT NULL,
	`payment_mode` text DEFAULT 'BANK_TRANSFER' NOT NULL,
	`transaction_ref` text,
	`status` text DEFAULT 'paid' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_salary_disburse_school` ON `salary_disbursements` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_salary_disburse_teacher` ON `salary_disbursements` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `school_features` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic` integer DEFAULT 1 NOT NULL,
	`students` integer DEFAULT 1 NOT NULL,
	`teachers` integer DEFAULT 1 NOT NULL,
	`attendance` integer DEFAULT 1 NOT NULL,
	`timetable` integer DEFAULT 1 NOT NULL,
	`homework` integer DEFAULT 1 NOT NULL,
	`remarks` integer DEFAULT 1 NOT NULL,
	`assessments` integer DEFAULT 1 NOT NULL,
	`syllabus` integer DEFAULT 1 NOT NULL,
	`tasks` integer DEFAULT 1 NOT NULL,
	`notices` integer DEFAULT 1 NOT NULL,
	`complaints` integer DEFAULT 1 NOT NULL,
	`fees` integer DEFAULT 1 NOT NULL,
	`calendar` integer DEFAULT 1 NOT NULL,
	`accounting` integer DEFAULT 1 NOT NULL,
	`campaigns` integer DEFAULT 1 NOT NULL,
	`ai_tutor` integer DEFAULT 1 NOT NULL,
	`worksheets` integer DEFAULT 1 NOT NULL,
	`tests` integer DEFAULT 1 NOT NULL,
	`ai_admin` integer DEFAULT 1 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_features_school_id_unique` ON `school_features` (`school_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_school_features_school` ON `school_features` (`school_id`);--> statement-breakpoint
CREATE TABLE `school_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`username_prefix` text DEFAULT 'Alpha' NOT NULL,
	`username_counter` integer DEFAULT 1933 NOT NULL,
	`academic_year_start_month` integer DEFAULT 4 NOT NULL,
	`fee_reminder_days` integer DEFAULT 7 NOT NULL,
	`allow_student_complaints` integer DEFAULT 1 NOT NULL,
	`razorpay_key_id` text,
	`razorpay_key_secret` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_settings_school_id_unique` ON `school_settings` (`school_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_school_settings_school` ON `school_settings` (`school_id`);--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`brand` text DEFAULT 'AlphaGrad' NOT NULL,
	`tagline` text,
	`address` text,
	`city` text DEFAULT 'Bangalore',
	`state` text DEFAULT 'Karnataka',
	`contact_email` text,
	`contact_phone` text,
	`logo_url` text,
	`theme_primary` text DEFAULT '#2563eb',
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schools_code_unique` ON `schools` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_schools_code` ON `schools` (`code`);--> statement-breakpoint
CREATE INDEX `idx_schools_status` ON `schools` (`status`);--> statement-breakpoint
CREATE TABLE `student_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`roll_number` text,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_enrollments_unique` ON `student_enrollments` (`student_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_school` ON `student_enrollments` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_batch` ON `student_enrollments` (`batch_id`);--> statement-breakpoint
CREATE TABLE `student_fee_obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`fee_structure_id` text NOT NULL,
	`academic_session_id` text NOT NULL,
	`installment_title` text NOT NULL,
	`due_date` text NOT NULL,
	`base_amount_in_cents` integer NOT NULL,
	`concession_amount_in_cents` integer DEFAULT 0 NOT NULL,
	`net_amount_in_cents` integer NOT NULL,
	`paid_amount_in_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fee_obligations_school` ON `student_fee_obligations` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_obligations_student` ON `student_fee_obligations` (`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`admission_number` text NOT NULL,
	`roll_number` text,
	`dob` text,
	`gender` text,
	`blood_group` text,
	`address` text,
	`emergency_contact` text,
	`target_exam` text DEFAULT 'Board Exams',
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_user_id_unique` ON `students` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_students_school_adm` ON `students` (`school_id`,`admission_number`);--> statement-breakpoint
CREATE INDEX `idx_students_school` ON `students` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_students_user_id` ON `students` (`user_id`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subjects_school_code` ON `subjects` (`school_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_subjects_school` ON `subjects` (`school_id`);--> statement-breakpoint
CREATE TABLE `super_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'super_admin' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `super_admins_email_unique` ON `super_admins` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_super_admins_email` ON `super_admins` (`email`);--> statement-breakpoint
CREATE TABLE `syllabus_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text,
	`student_id` text,
	`chapter_number` text NOT NULL,
	`chapter_title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress_percentage` integer DEFAULT 0 NOT NULL,
	`target_completion_date` text,
	`completed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_syllabus_school` ON `syllabus_chapters` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_syllabus_batch` ON `syllabus_chapters` (`batch_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`assigned_to_type` text NOT NULL,
	`assigned_to_id` text NOT NULL,
	`assigned_by_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`batch_id` text,
	`subject_id` text,
	`due_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_school` ON `tasks` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assigned` ON `tasks` (`assigned_to_type`,`assigned_to_id`);--> statement-breakpoint
CREATE TABLE `teacherAssignments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`is_class_teacher` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teacher_asgn_unique` ON `teacherAssignments` (`teacher_id`,`batch_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_teacher_asgn_school` ON `teacherAssignments` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_teacher_asgn_batch` ON `teacherAssignments` (`batch_id`);--> statement-breakpoint
CREATE TABLE `teacher_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`remarks` text,
	`check_in_time` text,
	`check_out_time` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teacher_att_unique` ON `teacher_attendance` (`teacher_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `idx_teacher_att_school` ON `teacher_attendance` (`school_id`);--> statement-breakpoint
CREATE TABLE `teacher_remarks` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text,
	`category` text DEFAULT 'academic' NOT NULL,
	`remark_text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_remarks_school` ON `teacher_remarks` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_remarks_student` ON `teacher_remarks` (`student_id`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`designation` text DEFAULT 'Subject Faculty',
	`qualifications` text,
	`specialization` text,
	`monthly_salary_in_rupees` integer DEFAULT 0,
	`joining_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_user_id_unique` ON `teachers` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teachers_school_emp` ON `teachers` (`school_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_teachers_school` ON `teachers` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_teachers_user_id` ON `teachers` (`user_id`);--> statement-breakpoint
CREATE TABLE `test_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`test_id` text NOT NULL,
	`student_id` text NOT NULL,
	`start_time` integer DEFAULT (unixepoch()) NOT NULL,
	`submit_time` integer,
	`duration_seconds` integer DEFAULT 0,
	`answers_data` text DEFAULT '{}' NOT NULL,
	`score` real DEFAULT 0,
	`max_marks` real DEFAULT 100 NOT NULL,
	`percentage` real DEFAULT 0,
	`is_passed` integer DEFAULT 0,
	`topic_breakdown` text DEFAULT '{}',
	`status` text DEFAULT 'in_progress' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_test_attempt_school` ON `test_attempts` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_test_attempt_student` ON `test_attempts` (`student_id`);--> statement-breakpoint
CREATE TABLE `test_series` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`code` text,
	`class_id` text,
	`subject_id` text,
	`is_paid` integer DEFAULT 0 NOT NULL,
	`price_in_paise` integer DEFAULT 0 NOT NULL,
	`batch_id` text,
	`valid_from` text,
	`valid_to` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_test_series_school` ON `test_series` (`school_id`);--> statement-breakpoint
CREATE TABLE `tests` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`test_series_id` text,
	`title` text NOT NULL,
	`description` text,
	`class_id` text,
	`subject_id` text NOT NULL,
	`chapter` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`total_marks` real DEFAULT 100 NOT NULL,
	`passing_marks` real DEFAULT 40,
	`negative_marking_rate` real DEFAULT 0,
	`questions_data` text NOT NULL,
	`is_paid` integer DEFAULT 0 NOT NULL,
	`price_in_paise` integer DEFAULT 0,
	`status` text DEFAULT 'published' NOT NULL,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_series_id`) REFERENCES `test_series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tests_school` ON `tests` (`school_id`);--> statement-breakpoint
CREATE TABLE `timetables` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`room_number` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_timetables_school` ON `timetables` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_timetables_batch` ON `timetables` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_timetables_teacher` ON `timetables` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`firebase_uid` text,
	`role_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'active' NOT NULL,
	`password_hash` text,
	`plain_password` text,
	`must_change_password` integer DEFAULT 0 NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_school_username` ON `users` (`school_id`,`username`);--> statement-breakpoint
CREATE INDEX `idx_users_school` ON `users` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `worksheet_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`worksheet_id` text NOT NULL,
	`teacher_id` text,
	`batch_id` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_submissions_allowed` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ws_assign_school` ON `worksheet_assignments` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_ws_assign_batch` ON `worksheet_assignments` (`batch_id`);--> statement-breakpoint
CREATE TABLE `worksheet_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`assignment_id` text,
	`worksheet_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answers_data` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`total_score` real,
	`max_score` real DEFAULT 25,
	`percentage` real,
	`teacher_feedback` text,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`graded_at` integer,
	`graded_by_teacher_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignment_id`) REFERENCES `worksheet_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by_teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ws_sub_unique` ON `worksheet_submissions` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_ws_sub_school` ON `worksheet_submissions` (`school_id`);--> statement-breakpoint
CREATE TABLE `worksheets` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`teacher_id` text,
	`student_id` text,
	`class_id` text,
	`subject_id` text NOT NULL,
	`chapter` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`question_count` integer DEFAULT 5 NOT NULL,
	`total_marks` integer DEFAULT 25 NOT NULL,
	`estimated_minutes` integer DEFAULT 30 NOT NULL,
	`instructions` text,
	`questions_data` text NOT NULL,
	`is_teacher_created` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_worksheets_school` ON `worksheets` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_worksheets_subject` ON `worksheets` (`subject_id`);
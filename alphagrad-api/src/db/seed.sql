-- ==========================================
-- ALPHAGRAD MULTI-TENANT ERP INITIAL SEED
-- ==========================================

-- 1. Standard Roles
INSERT OR IGNORE INTO roles (id, name, description, permissions)
VALUES 
    ('super_admin', 'Super Administrator', 'Global AlphaGrad Platform Governance', '["*"]'),
    ('admin', 'School Administrator', 'Institute Governance & Academics', '["manage_school"]'),
    ('teacher', 'Subject Faculty', 'Classroom & Evaluation Access', '["view_students","mark_attendance","give_homework"]'),
    ('student_parent', 'Student / Parent', 'Learning & Fee Portal Access', '["view_portal","pay_fees"]');

-- 2. Super Administrator Account (Email: superadmin@alphagrad.in / Pass: AlphaGrad@Super2026)
INSERT OR REPLACE INTO super_admins (id, email, password_hash, full_name, role, status)
VALUES (
    'sa_001',
    'superadmin@alphagrad.in',
    'pbkdf2:100000:618b34294c3d6bd359611b0c1e6d56a9:8bdc89ea6823637f78676f5f4420a6273789595cf6118afb5eab7e73892953b8',
    'AlphaGrad Chief Super Admin',
    'super_admin',
    'active'
);

-- ==========================================
-- 3. SCHOOL 1: PROVENTUS ACADEMY (ALL FEATURES ENABLED)
-- ==========================================
INSERT OR REPLACE INTO schools (id, code, name, brand, tagline, address, city, state, contact_phone, contact_email, logo_url, theme_primary, status)
VALUES (
    'sch_proventus',
    'proventus',
    'Proventus Academy',
    'AlphaGrad',
    'Transforming Education Through Innovation & Rigor',
    'Kothanur, Bangalore 560077',
    'Bangalore',
    'Karnataka',
    '+91-9108396010',
    'contact@proventusacademy.com',
    '/logo.png',
    '#2563eb',
    'active'
);

-- Proventus Features: 100% Unlocked (Maximum Feature Suite)
INSERT OR REPLACE INTO school_features (
    id, school_id, academic, students, teachers, attendance, timetable, homework, remarks,
    assessments, syllabus, tasks, notices, complaints, fees, calendar, accounting, campaigns,
    ai_tutor, worksheets, tests, ai_admin
) VALUES (
    'feat_sch_proventus',
    'sch_proventus',
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
);

INSERT OR REPLACE INTO school_settings (id, school_id, username_prefix, username_counter, academic_year_start_month, fee_reminder_days, allow_student_complaints)
VALUES ('set_sch_proventus', 'sch_proventus', 'Alpha', 1936, 4, 7, 1);

-- Proventus Academic Session
INSERT OR REPLACE INTO academic_sessions (id, school_id, name, start_date, end_date, is_current)
VALUES ('sess-2026-27', 'sch_proventus', '2026-2027', '2026-04-01', '2027-03-31', 1);

-- Proventus Classes
INSERT OR REPLACE INTO classes (id, school_id, name, code, description)
VALUES 
    ('cls-nios', 'sch_proventus', 'NIOS Open School (9th & 10th)', 'NIOS-9-10', 'NIOS Open Schooling morning program (9:00 AM - 12:30 PM, Mon-Fri)'),
    ('cls-g1-4', 'sch_proventus', 'Grade 1 to 4', 'G1-4', 'CBSE & ICSE Foundation coaching (5:00 PM - 8:00 PM, Mon-Fri)'),
    ('cls-g5-8', 'sch_proventus', 'Grade 5 to 8', 'G5-8', 'CBSE & ICSE Middle school coaching (5:00 PM - 8:00 PM, Mon-Fri)'),
    ('cls-g9-12', 'sch_proventus', 'Grade 9 to 12', 'G9-12', 'CBSE & ICSE Senior school coaching (5:00 PM - 8:00 PM, Mon-Fri)');

-- Proventus Batches
INSERT OR REPLACE INTO batches (id, school_id, class_id, academic_session_id, name, code, capacity)
VALUES
    ('batch-nios', 'sch_proventus', 'cls-nios', 'sess-2026-27', 'NIOS Open School Batch (9am - 12:30pm)', 'NIOS-MORN', 35),
    ('batch-g1-4', 'sch_proventus', 'cls-g1-4', 'sess-2026-27', 'Grade 1-4 Evening Batch (5pm - 8pm)', 'G1-4-EVE', 30),
    ('batch-g5-8', 'sch_proventus', 'cls-g5-8', 'sess-2026-27', 'Grade 5-8 Evening Batch (5pm - 8pm)', 'G5-8-EVE', 35),
    ('batch-g9-12', 'sch_proventus', 'cls-g9-12', 'sess-2026-27', 'Grade 9-12 Evening Batch (5pm - 8pm)', 'G9-12-EVE', 40);

-- Proventus Subjects
INSERT OR REPLACE INTO subjects (id, school_id, name, code, description)
VALUES
    ('sub-mat', 'sch_proventus', 'Mathematics', 'MATH', 'Mathematics (CBSE / ICSE / NIOS)'),
    ('sub-sci', 'sch_proventus', 'General Science', 'SCI', 'Science for Grades 1 to 10'),
    ('sub-phy', 'sch_proventus', 'Physics', 'PHY', 'Physics for Senior Secondary & NIOS'),
    ('sub-che', 'sch_proventus', 'Chemistry', 'CHE', 'Chemistry for Senior Secondary & NIOS'),
    ('sub-bio', 'sch_proventus', 'Biology', 'BIO', 'Biology for Senior Secondary & NIOS'),
    ('sub-eng', 'sch_proventus', 'English Language & Lit', 'ENG', 'English (CBSE / ICSE / NIOS)'),
    ('sub-soc', 'sch_proventus', 'Social Studies', 'SST', 'History, Civics, Geography (CBSE / ICSE / NIOS)'),
    ('sub-com', 'sch_proventus', 'Computer Science & IT', 'CS', 'Computer Science and Applications');

-- Proventus Users
-- 1. School Admin: Alpha1000 / Proventus@2026
INSERT OR REPLACE INTO users (id, school_id, username, email, role_id, full_name, phone, status, password_hash, plain_password, must_change_password)
VALUES (
    'usr_adm_proventus',
    'sch_proventus',
    'Alpha1000',
    'admin@proventusacademy.com',
    'admin',
    'Institute Administrator',
    '+91-9108396010',
    'active',
    'pbkdf2:100000:1af6d5cd097039c6189aee4e4d96571d:536204d17b47c24cab2ff582e6b10f6f7657b2c7036dc350f3fa52408ef47492',
    'Proventus@2026',
    0
);

-- 2. Teacher 1: Prof. Ramanathan (Math) - Alpha1933 / Proventus@2026
INSERT OR REPLACE INTO users (id, school_id, username, email, role_id, full_name, phone, status, password_hash, plain_password, must_change_password)
VALUES (
    'usr-teacher-01',
    'sch_proventus',
    'Alpha1933',
    'ramanathan@proventusacademy.com',
    'teacher',
    'Prof. S. R. Ramanathan',
    '+91-9844019331',
    'active',
    'pbkdf2:100000:1af6d5cd097039c6189aee4e4d96571d:536204d17b47c24cab2ff582e6b10f6f7657b2c7036dc350f3fa52408ef47492',
    'Proventus@2026',
    0
);

INSERT OR REPLACE INTO teachers (id, school_id, user_id, employee_id, designation, specialization, qualifications, status, monthly_salary_in_rupees)
VALUES ('tch-01', 'sch_proventus', 'usr-teacher-01', 'TCH-101', 'Senior Mathematics Faculty', 'Calculus & Algebra', 'M.Sc. Mathematics, B.Ed', 'active', 75000);

INSERT OR REPLACE INTO teacherAssignments (id, school_id, teacher_id, batch_id, subject_id, is_class_teacher)
VALUES ('asgn-01', 'sch_proventus', 'tch-01', 'batch-g9-12', 'sub-mat', 1);

-- 3. Teacher 2: Dr. Ananya Sharma (Physics) - Alpha1934 / Proventus@2026
INSERT OR REPLACE INTO users (id, school_id, username, email, role_id, full_name, phone, status, password_hash, plain_password, must_change_password)
VALUES (
    'usr-teacher-02',
    'sch_proventus',
    'Alpha1934',
    'ananya.sharma@proventusacademy.com',
    'teacher',
    'Dr. Ananya Sharma',
    '+91-9844019332',
    'active',
    'pbkdf2:100000:1af6d5cd097039c6189aee4e4d96571d:536204d17b47c24cab2ff582e6b10f6f7657b2c7036dc350f3fa52408ef47492',
    'Proventus@2026',
    0
);

INSERT OR REPLACE INTO teachers (id, school_id, user_id, employee_id, designation, specialization, qualifications, status, monthly_salary_in_rupees)
VALUES ('tch-02', 'sch_proventus', 'usr-teacher-02', 'TCH-102', 'Physics Faculty', 'Electrodynamics & Mechanics', 'Ph.D. Applied Physics', 'active', 72000);

INSERT OR REPLACE INTO teacherAssignments (id, school_id, teacher_id, batch_id, subject_id, is_class_teacher)
VALUES ('asgn-02', 'sch_proventus', 'tch-02', 'batch-g9-12', 'sub-phy', 0);

-- 4. Student: Aarav Sharma - Alpha1935 / Proventus@2026
INSERT OR REPLACE INTO users (id, school_id, username, email, role_id, full_name, phone, status, password_hash, plain_password, must_change_password)
VALUES (
    'usr-student-01',
    'sch_proventus',
    'Alpha1935',
    'aarav.sharma@example.com',
    'student_parent',
    'Aarav Sharma',
    '+91-9845019335',
    'active',
    'pbkdf2:100000:1af6d5cd097039c6189aee4e4d96571d:536204d17b47c24cab2ff582e6b10f6f7657b2c7036dc350f3fa52408ef47492',
    'Proventus@2026',
    0
);

INSERT OR REPLACE INTO students (id, school_id, user_id, admission_number, roll_number, target_exam, status)
VALUES ('stu-01', 'sch_proventus', 'usr-student-01', 'PA-2026-001', '101', 'JEE Advanced', 'active');

INSERT OR REPLACE INTO guardians (id, school_id, student_id, name, relation, email, phone, is_primary_contact)
VALUES ('grd-01', 'sch_proventus', 'stu-01', 'Rajesh Sharma', 'Father', 'rajesh.sharma@example.com', '+91-9845019335', 1);

INSERT OR REPLACE INTO student_enrollments (id, school_id, student_id, batch_id, roll_number, status)
VALUES ('enr-01', 'sch_proventus', 'stu-01', 'batch-g9-12', '101', 'active');

-- Fee Structure & Obligation
INSERT OR REPLACE INTO fee_structures (id, school_id, academic_session_id, class_id, name, total_amount_in_cents, description)
VALUES ('fee-g9-12', 'sch_proventus', 'sess-2026-27', 'cls-g9-12', 'Grade 9 to 12 Coaching Package', 12000000, 'Comprehensive CBSE / ICSE senior coaching package');

INSERT OR REPLACE INTO student_fee_obligations (id, school_id, student_id, fee_structure_id, academic_session_id, installment_title, due_date, base_amount_in_cents, concession_amount_in_cents, net_amount_in_cents, paid_amount_in_cents, status)
VALUES ('obl-01', 'sch_proventus', 'stu-01', 'fee-g9-12', 'sess-2026-27', 'Term 1 Tuition & Learning Material', '2026-11-15', 4000000, 0, 4000000, 0, 'pending');

-- Sample Homework
INSERT OR REPLACE INTO homework (id, school_id, batch_id, subject_id, teacher_id, title, description, due_date, status)
VALUES ('hw-01', 'sch_proventus', 'batch-g9-12', 'sub-mat', 'tch-01', 'Calculus Chapter 2: Limits & Continuity', 'Complete exercise problems 1 through 20 from Chapter 2. Show all proof steps.', '2026-10-25', 'published');

-- Sample Notice
INSERT OR REPLACE INTO notices (id, school_id, title, content, target_audience, is_pinned, published_by)
VALUES ('not-01', 'sch_proventus', 'Welcome to Proventus Academy ERP Portal', 'Welcome students, parents, and faculty to our unified ERP platform. Timetables, fee records, and syllabus tracking are now live.', 'all', 1, 'usr_adm_proventus');

-- ==========================================
-- 4. SCHOOL 2: ZENITH INTERNATIONAL (MODULAR SUBSET TEST)
-- ==========================================
INSERT OR REPLACE INTO schools (id, code, name, brand, tagline, address, city, state, contact_phone, contact_email, logo_url, theme_primary, status)
VALUES (
    'sch_zenith',
    'zenith',
    'Zenith International School',
    'AlphaGrad',
    'Empowering Minds, Inspiring Leaders',
    'Indiranagar, Bangalore 560038',
    'Bangalore',
    'Karnataka',
    '+91-9880012345',
    'admin@zenithschool.in',
    '/logo.png',
    '#059669',
    'active'
);

-- Zenith Features: Core Only (AI & Accounting Disabled to test feature gates)
INSERT OR REPLACE INTO school_features (
    id, school_id, academic, students, teachers, attendance, timetable, homework, remarks,
    assessments, syllabus, tasks, notices, complaints, fees, calendar, accounting, campaigns,
    ai_tutor, worksheets, tests, ai_admin
) VALUES (
    'feat_sch_zenith',
    'sch_zenith',
    1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0
);

INSERT OR REPLACE INTO school_settings (id, school_id, username_prefix, username_counter, academic_year_start_month, fee_reminder_days, allow_student_complaints)
VALUES ('set_sch_zenith', 'sch_zenith', 'ZIS', 1001, 4, 7, 1);

INSERT OR REPLACE INTO academic_sessions (id, school_id, name, start_date, end_date, is_current)
VALUES ('sess-zenith-2026', 'sch_zenith', '2026-2027', '2026-04-01', '2027-03-31', 1);

-- Zenith Admin: Zenith1000 / Zenith@2026
INSERT OR REPLACE INTO users (id, school_id, username, email, role_id, full_name, phone, status, password_hash, plain_password, must_change_password)
VALUES (
    'usr_adm_zenith',
    'sch_zenith',
    'Zenith1000',
    'admin@zenithschool.in',
    'admin',
    'Zenith Headmaster',
    '+91-9880012345',
    'active',
    'pbkdf2:100000:f5603d1b122e4b254495714961a3b726:38d54dd16f9f6c4344b159937bf7d3270dacf0e566720699cf86153add3c2d82',
    'Zenith@2026',
    0
);

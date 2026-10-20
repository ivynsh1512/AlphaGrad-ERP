-- ==========================================
-- ALPHAGRAD MULTI-TENANT ERP INITIAL SEED
-- ==========================================

-- 1. Standard Global Roles
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

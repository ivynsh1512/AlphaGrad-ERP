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

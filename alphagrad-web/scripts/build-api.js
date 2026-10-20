const fs = require('fs');

const srcPath = 'c:/Users/divya/OneDrive/Desktop/proventus-academy/proventus-web/src/lib/api.ts';
let src = fs.readFileSync(srcPath, 'utf8');

// 1. Replace API_BASE
src = src.replace(
  'export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://proventus-api.divyansh-shukla.workers.dev";',
  'export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://alphagrad-erp-api.divyansh-shukla.workers.dev";'
);

// 2. Replace getAuthHeader
const oldAuth = 'function getAuthHeader(): Record<string, string> {\n\tif (typeof window === "undefined") return {};\n\tconst token = localStorage.getItem("proventus_token");\n\treturn token ? { Authorization: `Bearer ${token}` } : {};\n}';

const newAuth = [
  'function getAuthHeader(): Record<string, string> {',
  '\tif (typeof window === "undefined") return {};',
  '\tconst isSuperAdmin = window.location.pathname.startsWith("/super-admin");',
  '\tconst token = isSuperAdmin',
  '\t\t? localStorage.getItem("alphagrad_super_token")',
  '\t\t: (localStorage.getItem("alphagrad_token") || localStorage.getItem("proventus_token"));',
  '',
  '\tconst parts = window.location.pathname.split("/").filter(Boolean);',
  '\tconst schoolCode = localStorage.getItem("alphagrad_school_code") || (parts[0] && parts[0] !== "super-admin" ? parts[0] : null);',
  '',
  '\tconst headers: Record<string, string> = {};',
  '\tif (token) headers["Authorization"] = `Bearer ${token}`;',
  '\tif (schoolCode) headers["x-school-code"] = schoolCode;',
  '\treturn headers;',
  '}'
].join('\n');

src = src.replace(oldAuth, newAuth);

// 3. Replace auth.login signature
src = src.replace(
  'login: (data: { username: string; password: string }) =>',
  'login: (data: { schoolCode?: string; username: string; password: string }) =>'
);

// 4. Inject superAdmin and school discovery methods into export const api = {
const injection = [
  'export const api = {',
  '\t// 0. Super Admin Governance',
  '\tsuperAdmin: {',
  '\t\tlogin: (data: { email: string; password: string }) =>',
  '\t\t\trequest<{ token: string; user: any }>("/api/v1/super-admin/auth/login", {',
  '\t\t\t\tmethod: "POST",',
  '\t\t\t\tbody: JSON.stringify(data),',
  '\t\t\t}),',
  '\t\tme: () => request<{ user: any }>("/api/v1/super-admin/auth/me"),',
  '\t\tgetStats: () =>',
  '\t\t\trequest<{ totalSchools: number; activeSchools: number; totalStudents: number; totalTeachers: number }>(',
  '\t\t\t\t"/api/v1/super-admin/stats"',
  '\t\t\t),',
  '\t\tgetSchools: () => request<{ schools: any[] }>("/api/v1/super-admin/schools"),',
  '\t\tcreateSchool: (data: any) =>',
  '\t\t\trequest<{ message: string; school: any }>("/api/v1/super-admin/schools", {',
  '\t\t\t\tmethod: "POST",',
  '\t\t\t\tbody: JSON.stringify(data),',
  '\t\t\t}),',
  '\t\tupdateFeatures: (schoolId: string, features: Record<string, number>) =>',
  '\t\t\trequest<{ message: string; features: any }>("/api/v1/super-admin/schools/" + schoolId + "/features", {',
  '\t\t\t\tmethod: "PUT",',
  '\t\t\t\tbody: JSON.stringify(features),',
  '\t\t\t}),',
  '\t\tupdateSchool: (schoolId: string, data: any) =>',
  '\t\t\trequest<{ message: string; school: any }>("/api/v1/super-admin/schools/" + schoolId, {',
  '\t\t\t\tmethod: "PATCH",',
  '\t\t\t\tbody: JSON.stringify(data),',
  '\t\t\t}),',
  '\t\tresetAdminPassword: (schoolId: string, newPassword?: string) =>',
  '\t\t\trequest<{ message: string; username: string; password: string }>(',
  '\t\t\t\t"/api/v1/super-admin/schools/" + schoolId + "/reset-admin",',
  '\t\t\t\t{',
  '\t\t\t\t\tmethod: "POST",',
  '\t\t\t\t\tbody: JSON.stringify({ newPassword }),',
  '\t\t\t\t}',
  '\t\t\t),',
  '\t},',
  '',
  '\t// 0.1 Public School Config Discovery',
  '\tschool: {',
  '\t\tgetPublic: (schoolCode: string) =>',
  '\t\t\trequest<{ school: any; features: any }>("/api/v1/schools/" + schoolCode + "/public"),',
  '\t},'
].join('\n');

src = src.replace('export const api = {', injection);

const destPath = 'c:/Users/divya/OneDrive/Desktop/AlphaGrad-ERP/alphagrad-web/src/lib/api.ts';
fs.writeFileSync(destPath, src, 'utf8');
console.log('Successfully written', destPath);

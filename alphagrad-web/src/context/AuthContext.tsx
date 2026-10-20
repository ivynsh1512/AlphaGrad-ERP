"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

export interface User {
	id: string;
	username: string;
	fullName: string;
	role: "admin" | "teacher" | "student_parent";
	email?: string;
	phone?: string;
	schoolId: string;
	schoolCode: string;
	studentId?: string;
	teacherId?: string;
	mustChangePassword?: boolean;
}

export interface School {
	id: string;
	code: string;
	name: string;
	brand?: string;
	tagline?: string;
	logoUrl?: string;
	themePrimary?: string;
	address?: string;
	city?: string;
	state?: string;
	contactPhone?: string;
	contactEmail?: string;
	status?: string;
}

export interface SuperAdmin {
	id: string;
	email: string;
	fullName: string;
	role: "super_admin";
	isSuperAdmin: boolean;
}

interface AuthContextType {
	user: User | null;
	school: School | null;
	features: Record<string, number> | null;
	superAdmin: SuperAdmin | null;
	loading: boolean;
	login: (schoolCode: string, username: string, password: string) => Promise<User>;
	superLogin: (email: string, password: string) => Promise<SuperAdmin>;
	logout: () => void;
	superLogout: () => void;
	hasFeature: (key: string) => boolean;
	setSchoolContext: (school: School, features?: Record<string, number>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [school, setSchool] = useState<School | null>(null);
	const [features, setFeatures] = useState<Record<string, number> | null>(null);
	const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		// Restore school user session
		const savedToken = localStorage.getItem("alphagrad_token");
		const savedUser = localStorage.getItem("alphagrad_user");
		const savedSchool = localStorage.getItem("alphagrad_school");
		const savedFeatures = localStorage.getItem("alphagrad_features");

		if (savedToken && savedUser) {
			try {
				setUser(JSON.parse(savedUser));
				if (savedSchool) setSchool(JSON.parse(savedSchool));
				if (savedFeatures) setFeatures(JSON.parse(savedFeatures));
			} catch {
				localStorage.removeItem("alphagrad_token");
				localStorage.removeItem("alphagrad_user");
			}
		}

		// Restore super admin session
		const savedSuperToken = localStorage.getItem("alphagrad_super_token");
		const savedSuperUser = localStorage.getItem("alphagrad_super_user");
		if (savedSuperToken && savedSuperUser) {
			try {
				setSuperAdmin(JSON.parse(savedSuperUser));
			} catch {
				localStorage.removeItem("alphagrad_super_token");
				localStorage.removeItem("alphagrad_super_user");
			}
		}

		setLoading(false);
	}, []);

	const login = async (schoolCode: string, username: string, password: string): Promise<User> => {
		const res = await api.auth.login({ schoolCode, username, password });

		localStorage.setItem("alphagrad_token", res.token);
		localStorage.setItem("alphagrad_user", JSON.stringify(res.user));
		localStorage.setItem("alphagrad_school", JSON.stringify(res.school));
		localStorage.setItem("alphagrad_school_code", res.school.code);
		if (res.features) {
			localStorage.setItem("alphagrad_features", JSON.stringify(res.features));
			setFeatures(res.features);
		}

		setUser(res.user);
		setSchool(res.school);

		// Redirect according to user role
		if (res.user.role === "admin") {
			router.push(`/${res.school.code}/admin`);
		} else if (res.user.role === "teacher") {
			router.push(`/${res.school.code}/teacher`);
		} else if (res.user.role === "student_parent") {
			router.push(`/${res.school.code}/portal`);
		}

		return res.user;
	};

	const superLogin = async (email: string, password: string): Promise<SuperAdmin> => {
		const res = await api.superAdmin.login({ email, password });

		localStorage.setItem("alphagrad_super_token", res.token);
		localStorage.setItem("alphagrad_super_user", JSON.stringify(res.user));

		setSuperAdmin(res.user);
		router.push("/super-admin");

		return res.user;
	};

	const logout = () => {
		const currentCode = school?.code || localStorage.getItem("alphagrad_school_code");
		setUser(null);
		setFeatures(null);
		localStorage.removeItem("alphagrad_token");
		localStorage.removeItem("alphagrad_user");
		if (currentCode) {
			router.push(`/${currentCode}/login`);
		} else {
			router.push("/");
		}
	};

	const superLogout = () => {
		setSuperAdmin(null);
		localStorage.removeItem("alphagrad_super_token");
		localStorage.removeItem("alphagrad_super_user");
		router.push("/super-admin/login");
	};

	const hasFeature = (key: string): boolean => {
		if (!features) return true; // Default allow until loaded
		return features[key] === 1;
	};

	const setSchoolContext = (sch: School, feat?: Record<string, number>) => {
		setSchool(sch);
		localStorage.setItem("alphagrad_school", JSON.stringify(sch));
		localStorage.setItem("alphagrad_school_code", sch.code);
		if (feat) {
			setFeatures(feat);
			localStorage.setItem("alphagrad_features", JSON.stringify(feat));
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				school,
				features,
				superAdmin,
				loading,
				login,
				superLogin,
				logout,
				superLogout,
				hasFeature,
				setSchoolContext,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

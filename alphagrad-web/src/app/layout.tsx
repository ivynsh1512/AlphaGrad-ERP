import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
	title: "AlphaGrad Multi-Tenant Institute ERP",
	description: "Autonomous Coaching & Institute ERP Platform powering next-generation institutions.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, ArrowRight, Menu, X, MessageCircle } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/nios", label: "NIOS Admissions", highlight: true },
  { href: "/programs", label: "Programs" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/98 shadow-sm border-b border-slate-200/80"
          : "bg-white border-b border-slate-100"
      }`}
      style={{ backdropFilter: scrolled ? "blur(12px)" : "none" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between gap-4">

        {/* Logo & Identity */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-slate-200 shadow-xs group-hover:shadow-md transition-shadow shrink-0 bg-white flex items-center justify-center p-0.5">
            <img
              src="/logo.png"
              alt="Proventus Academy"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-none">
            <div className="text-base sm:text-[17px] font-bold text-slate-900 tracking-tight">
              Proventus Academy
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block tracking-wide">
              Kothanur, Bangalore · Est. 2023
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-slate-600 shrink-0">
          {navLinks.map((link) =>
            link.highlight ? (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:9108396010"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium">91083 96010</span>
          </a>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-colors shadow-sm"
          >
            <span>Portal Login</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:block" />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  link.highlight
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{link.label}</span>
                {link.highlight && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Open
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-2">
            <a
              href="tel:9108396010"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              Call Us
            </a>
            <a
              href="https://wa.me/919108396010"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Sign In to Student Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

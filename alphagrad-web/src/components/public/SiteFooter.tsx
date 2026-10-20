"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Phone, Clock } from "lucide-react";

const programs = [
  { href: "/nios", label: "NIOS Admissions (9th & 10th)", highlight: true },
  { href: "/programs#grade-1-4", label: "Grade 1–4 (CBSE & ICSE)" },
  { href: "/programs#grade-5-8", label: "Grade 5–8 (CBSE & ICSE)" },
  { href: "/programs#grade-9-12", label: "Grade 9–12 (Board Prep)" },
];

const explore = [
  { href: "/about", label: "About Proventus Academy" },
  { href: "/blog", label: "Educational Blog & Guides" },
  { href: "/contact", label: "Campus Location & Map" },
  { href: "/login", label: "Student & Parent Portal" },
];

const authorities = [
  { href: "https://www.nios.ac.in", label: "National Institute of Open Schooling" },
  { href: "https://www.cbse.gov.in", label: "Central Board of Secondary Education" },
  { href: "https://www.cisce.org", label: "CISCE Board — ICSE / ISC" },
  { href: "https://ncert.nic.in", label: "NCERT National Textbooks" },
];

export function SiteFooter() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400">
      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">

          {/* Institute identity — spans 4 cols */}
          <div className="lg:col-span-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-white flex items-center justify-center p-0.5 shrink-0">
                <img src="/logo.png" alt="Proventus Academy" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Proventus Academy</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Estd. 2023 · Kothanur, Bangalore</div>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Empowering students in Bangalore through deep conceptual understanding, psychological balance, and academic excellence.
            </p>

            <p className="text-xs text-indigo-400 font-medium italic">
              "Educate. Equilibrate. Elevate."
            </p>

            <div className="space-y-2 pt-1 text-xs text-slate-500">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                <span>Kothanur, Bangalore 560077, Karnataka, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <a href="tel:9108396010" className="hover:text-white transition-colors">+91 91083 96010</a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Mon–Fri · 9:00 AM – 8:00 PM</span>
              </div>
            </div>
          </div>

          {/* Spacer on large screens */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Programs — 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Programs</h4>
            <ul className="space-y-2.5">
              {programs.map(({ href, label, highlight }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm transition-colors ${
                      highlight ? "text-amber-400 hover:text-amber-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {highlight && <span className="mr-1">★</span>}
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore — 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Explore</h4>
            <ul className="space-y-2.5">
              {explore.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Educational Authorities — 3 cols */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Official Bodies</h4>
            <ul className="space-y-2.5">
              {authorities.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {label}
                    <ExternalLink className="w-3 h-3 text-slate-600 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5">
            <span>© 2026 Proventus Academy, Bangalore. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span>
              Built & powered by{" "}
              <a
                href="https://alphagrad.novaxai.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors underline underline-offset-2"
              >
                AlphaGrad ERP
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <span>·</span>
            <a
              href="https://maps.google.com/maps?q=13.067057428891749,77.63853958245936"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              GPS Location
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

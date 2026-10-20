"use client";

import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileText,
  Copy,
  Check
} from "lucide-react";

interface InvoiceData {
  receiptNumber: string;
  studentName: string;
  studentUsername: string;
  admissionNumber?: string;
  batchName?: string;
  amountPaidInRupees: number;
  paymentMode: string;
  installmentTitle: string;
  structureName: string;
  paymentDate: string;
  transactionRef?: string;
  notes?: string;
}

interface ParentInvoiceModalProps {
  invoice: InvoiceData;
  onClose: () => void;
}

// Helper: Convert number to Indian currency words
function numberToWords(num: number): string {
  if (!num || isNaN(num)) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 === 0 ? "" : " and " + inWords(n % 100));
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const rounded = Math.round(num);
  return inWords(rounded) + " Only";
}

// Convert public image URL to base64 data URI for offline standalone rendering
async function urlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export function ParentInvoiceModal({ invoice, onClose }: ParentInvoiceModalProps) {
  const { school } = useAuth();
  const schoolName = school?.name || "School Institute";
  const schoolTagline = school?.tagline || "Excellence in Education";
  const schoolLogo = school?.logoUrl || "/logo.png";
  const schoolAddress = school?.address || "Main Campus";
  const schoolCity = school?.city ? `${school?.city}, ${school?.state || "India"}` : "India";
  const schoolPhone = school?.contactPhone || "+91 91083 96010";
  const schoolEmail = school?.contactEmail || "contact@alphagrad.in";

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `${schoolName} Official Tax Receipt #${invoice.receiptNumber}\nStudent: ${invoice.studentName} (${invoice.studentUsername})\nAmount Paid: ₹${invoice.amountPaidInRupees.toLocaleString("en-IN")}\nDate: ${invoice.paymentDate}\nStatus: Verified`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const amountInWords = numberToWords(invoice.amountPaidInRupees);

  const handleDownloadHtml = async () => {
    setDownloading(true);
    try {
      // Get base64 versions of logos so the downloaded file is 100% self-contained and offline
      const [logoDataUri, shelfoneDataUri] = await Promise.all([
        urlToBase64("/logo.png"),
        urlToBase64("/shelfone.jpg")
      ]);

      const formattedAmount = invoice.amountPaidInRupees.toLocaleString("en-IN");

      // Generate complete standalone self-contained HTML with beautiful inline CSS
      const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice ${invoice.receiptNumber} - ${schoolName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 32px 16px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .top-actions {
      background: #0f172a;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffffff;
    }
    .top-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #cbd5e1;
    }
    .btn-print {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 7px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover {
      background: #4338ca;
    }
    .invoice-body {
      padding: 40px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 24px;
      margin-bottom: 26px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .inst-left {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .inst-logo {
      width: 72px !important;
      height: 72px !important;
      max-width: 72px !important;
      max-height: 72px !important;
      object-fit: contain;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 4px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      flex-shrink: 0;
    }
    .inst-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .inst-tagline {
      font-size: 11px;
      font-weight: 800;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 3px;
    }
    .inst-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.45;
    }
    .receipt-meta {
      text-align: right;
      flex-shrink: 0;
    }
    .badge-verified {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid #86efac;
      margin-bottom: 6px;
    }
    .receipt-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .receipt-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      font-size: 12px;
    }
    .info-box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
    }
    .info-box-title.student { color: #4338ca; }
    .info-box-title.channel { color: #047857; }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #64748b;
    }
    .info-value {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 22px;
      font-size: 12px;
    }
    .ledger-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    .ledger-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .ledger-table tr:last-child td {
      border-bottom: none;
    }
    .td-num {
      width: 40px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #94a3b8;
    }
    .item-title {
      font-weight: 700;
      color: #0f172a;
    }
    .item-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .subtotal-row {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .total-row {
      background: #ecfdf5;
      border-top: 2px solid #10b981 !important;
      font-weight: 900;
      color: #065f46;
      font-size: 15px;
    }
    .words-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 22px;
    }
    .words-label {
      color: #64748b;
      font-size: 11px;
    }
    .words-value {
      font-weight: 800;
      color: #1e1b4b;
      font-size: 13px;
    }
    .attest-grid {
      display: grid;
      grid-template-columns: 1fr 190px;
      gap: 20px;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .attest-note {
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .attest-title {
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .stamp-box {
      border: 2px dashed #818cf8;
      background: #eef2ff;
      border-radius: 14px;
      padding: 12px 10px;
      text-align: center;
    }
    .stamp-inst {
      font-size: 9px;
      font-weight: 900;
      color: #312e81;
      letter-spacing: 0.5px;
    }
    .stamp-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid #6366f1;
      background: #ffffff;
      margin: 6px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 900;
      color: #4338ca;
    }
    .stamp-dept {
      font-size: 9px;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
    }
    .stamp-city {
      font-size: 8px;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .footer-bar {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }
    .shelfone-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 9999px;
      padding: 5px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .shelfone-logo {
      width: 28px !important;
      height: 28px !important;
      max-width: 28px !important;
      max-height: 28px !important;
      object-fit: contain;
      border-radius: 6px;
      vertical-align: middle;
    }
    .shelfone-brand {
      font-weight: 900;
      color: #0f172a;
      font-size: 12px;
      letter-spacing: -0.3px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; border-radius: 0; max-width: 100%; }
      .top-actions { display: none !important; }
      .invoice-body { padding: 0; }
      @page { size: A4; margin: 10mm; }
    }
    @media (max-width: 640px) {
      .header-table { flex-direction: column; }
      .receipt-meta { text-align: left; }
      .info-grid { grid-template-columns: 1fr; }
      .attest-grid { grid-template-columns: 1fr; }
      .footer-bar { flex-direction: column; gap: 12px; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Top Action Bar -->
    <div class="top-actions">
      <div class="top-title">Official Tax Invoice & E-Receipt</div>
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <!-- Main Invoice Document -->
    <div class="invoice-body">
      
      <!-- Letterhead -->
      <div class="header-table">
        <div class="inst-left">
          <img src="${logoDataUri}" alt="${schoolName} Logo" class="inst-logo" width="72" height="72" />
          <div>
            <div class="inst-title">${schoolName.toUpperCase()}</div>
            <div class="inst-tagline">${schoolTagline}</div>
            <div class="inst-meta">
              Campus: ${schoolAddress}, ${schoolCity}<br>
              Helpline: ${schoolPhone} • Email: ${schoolEmail}<br>
              Official Academic Session 2026–27
            </div>
          </div>
        </div>

        <div class="receipt-meta">
          <div class="badge-verified">PAID & VERIFIED</div>
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Tax Invoice / Official E-Receipt</div>
          <div class="receipt-num">${invoice.receiptNumber}</div>
          <div class="receipt-date">Issue Date: <strong>${invoice.paymentDate}</strong></div>
        </div>
      </div>

      <!-- Student & Payment Profile Grid -->
      <div class="info-grid">
        <div class="info-box">
          <div class="info-box-title student">Student & Enrollment Profile</div>
          <div class="info-row">
            <span class="info-label">Student Name:</span>
            <span class="info-value">${invoice.studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Student ID / Roll No:</span>
            <span class="info-value" style="font-family: ui-monospace, monospace;">${invoice.studentUsername}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cohort / Batch:</span>
            <span class="info-value">${invoice.batchName || `${schoolName} Academic Batch`}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Academic Year:</span>
            <span class="info-value">2026 – 2027</span>
          </div>
        </div>

        <div class="info-box">
          <div class="info-box-title channel">Payment Channel & Audit Trail</div>
          <div class="info-row">
            <span class="info-label">Installment Title:</span>
            <span class="info-value">${invoice.installmentTitle}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Gateway:</span>
            <span class="info-value">Razorpay POS Engine</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Channel:</span>
            <span class="info-value" style="font-family: ui-monospace, monospace; text-transform: uppercase;">${invoice.paymentMode}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Transaction Status:</span>
            <span class="info-value" style="color: #047857;">Settled & Captured ✓</span>
          </div>
        </div>
      </div>

      <!-- Itemized Ledger Table -->
      <table class="ledger-table">
        <thead>
          <tr>
            <th class="td-num">#</th>
            <th>Particulars / Service Description</th>
            <th style="width: 100px;">SAC Code</th>
            <th style="text-align: right; width: 130px;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="td-num">01</td>
            <td>
              <div class="item-title">Classroom Tuition & Faculty Instruction</div>
              <div class="item-sub">${invoice.installmentTitle} · ${invoice.structureName}</div>
            </td>
            <td style="font-family: ui-monospace, monospace; color: #64748b;">999293</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">₹${formattedAmount}</td>
          </tr>
          <tr>
            <td class="td-num">02</td>
            <td>
              <div class="item-title" style="color: #475569;">Laboratory Practical Mentorship & TMA Evaluation</div>
              <div class="item-sub">Included with course curriculum</div>
            </td>
            <td style="font-family: ui-monospace, monospace; color: #94a3b8;">999293</td>
            <td style="text-align: right; font-weight: 600; color: #64748b;">₹0.00</td>
          </tr>
          <tr>
            <td class="td-num">03</td>
            <td>
              <div class="item-title" style="color: #475569;">${schoolName} Student & Parent Portal & Chapter Portion Tracker</div>
              <div class="item-sub">Student and parent mobile app & 24/7 portion progress access</div>
            </td>
            <td style="font-family: ui-monospace, monospace; color: #94a3b8;">999293</td>
            <td style="text-align: right; font-weight: 600; color: #64748b;">₹0.00</td>
          </tr>
          <tr class="subtotal-row">
            <td colspan="3" style="text-align: right; padding-right: 16px;">Subtotal:</td>
            <td style="text-align: right; font-weight: 800; color: #1e293b;">₹${formattedAmount}</td>
          </tr>
          <tr class="subtotal-row">
            <td colspan="3" style="text-align: right; padding-right: 16px;">Educational Services GST (Nil Exemption u/s 12AA):</td>
            <td style="text-align: right; font-weight: 800; color: #1e293b;">₹0.00</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right; padding-right: 16px; font-weight: 900; color: #065f46;">Total Amount Received:</td>
            <td style="text-align: right; font-weight: 900; color: #065f46; font-size: 16px;">₹${formattedAmount}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div class="words-box">
        <span class="words-label">Amount Received in Words:</span>
        <span class="words-value">Rupees ${amountInWords}</span>
      </div>

      <!-- Statutory Attestation & Stamp -->
      <div class="attest-grid">
        <div class="attest-note">
          <div class="attest-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Digitally Authenticated E-Document</span>
          </div>
          This is an official system-generated invoice valid under the Information Technology Act, 2000. It is suitable for parent employer tuition allowance reimbursement and tax deductions.
          <div style="font-family: ui-monospace, monospace; font-size: 10px; color: #94a3b8; margin-top: 4px;">
            Verification Hash: SHA256:${invoice.receiptNumber}-${Math.abs(invoice.amountPaidInRupees * 73).toString(16)}
          </div>
        </div>

        <div style="text-align: right;">
          <div class="stamp-box">
            <div class="stamp-inst">${schoolName.toUpperCase()}</div>
            <div class="stamp-badge">VERIFIED</div>
            <div class="stamp-dept">ACCOUNTS & AUDIT</div>
            <div class="stamp-city">${schoolCity.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <!-- Bottom Attribution Bar: MUST show ShelfOne POS Logo & attribution, NO AlphaGrad -->
      <div class="footer-bar">
        <div>
          <strong>${schoolName}</strong> • Accounts & Finance Office
        </div>

        <div class="shelfone-badge">
          <span style="font-size: 10px; color: #64748b; font-weight: 600;">Powered By</span>
          <img src="${shelfoneDataUri}" alt="ShelfOne POS" class="shelfone-logo" width="28" height="28" />
          <span class="shelfone-brand">ShelfOne POS</span>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([standaloneHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice.receiptNumber}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md p-3 sm:p-6 flex justify-center items-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Card with max height and inner scroll to prevent viewport overflow */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Top Control Bar — Pinned & Sticky */}
        <div className="shrink-0 bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-sm no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                Official Tax Invoice & E-Receipt
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                #{invoice.receiptNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition active:scale-95 disabled:opacity-50"
              title="Download Standalone Offline HTML Receipt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{downloading ? "Preparing..." : "Download"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95"
              title="Copy receipt details"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition ml-1 active:scale-95"
              aria-label="Close"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-6 sm:p-10 text-slate-800 bg-white flex-1" ref={printableRef} id="printable-invoice">
          
          {/* Print-specific style definitions */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              body * { visibility: hidden !important; }
              #printable-invoice, #printable-invoice * { visibility: visible !important; }
              #printable-invoice {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 4mm !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print { display: none !important; }
            }
          `}} />

          {/* Institute Letterhead */}
          <div className="border-b-2 border-indigo-600 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              
              {/* Left Branding with Dynamic School Logo */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 overflow-hidden bg-white p-1.5 shrink-0 shadow-xs flex items-center justify-center">
                  <img
                    src={schoolLogo}
                    alt={`${schoolName} Logo`}
                    width={72}
                    height={72}
                    style={{ width: "72px", height: "72px", objectFit: "contain" }}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {schoolName.toUpperCase()}
                  </h1>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
                    {schoolTagline}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                    Campus: {schoolAddress}, {schoolCity}<br />
                    Helpline: {schoolPhone} • Email: {schoolEmail}<br />
                    Official Academic Session 2026–27
                  </p>
                </div>
              </div>

              {/* Right Receipt Header & Stamp */}
              <div className="text-left sm:text-right space-y-1.5 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PAID & VERIFIED</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tax Invoice / Official E-Receipt
                </div>
                <div className="font-mono text-base font-black text-slate-900 tracking-tight">
                  {invoice.receiptNumber}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Issue Date: <strong className="text-slate-800">{invoice.paymentDate}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Student & Billing Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Student Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                Student & Enrollment Profile
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{invoice.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student ID / Roll No:</span>
                <span className="font-mono font-bold text-slate-800">{invoice.studentUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cohort / Batch:</span>
                <span className="font-semibold text-slate-800">{invoice.batchName || `${schoolName} Academic Batch`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Year:</span>
                <span className="font-semibold text-slate-800">2026 – 2027</span>
              </div>
            </div>

            {/* Payment & Channel Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Payment Channel & Audit Trail
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Installment Title:</span>
                <span className="font-bold text-slate-900">{invoice.installmentTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-semibold text-slate-800">Razorpay POS Engine</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-mono font-bold text-slate-800 uppercase">{invoice.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Status:</span>
                <span className="font-bold text-emerald-700">Settled & Captured ✓</span>
              </div>
            </div>
          </div>

          {/* Itemized Fee Ledger Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Particulars / Service Description</th>
                  <th className="py-3 px-4">SAC Code</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-4 font-mono text-slate-400">01</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      Classroom Tuition & Faculty Instruction
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {invoice.installmentTitle} · {invoice.structureName}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">999293</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    ₹{invoice.amountPaidInRupees.toLocaleString("en-IN")}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-mono text-slate-400">02</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">
                      Laboratory Practical Mentorship & TMA Evaluation
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Included with course curriculum
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">999293</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-500">
                    ₹0.00
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-mono text-slate-400">03</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">
                      {schoolName} Student & Parent Portal & Chapter Portion Tracker
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Student and parent mobile app & 24/7 portion progress access
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">999293</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-500">
                    ₹0.00
                  </td>
                </tr>

                {/* Subtotal & Taxes */}
                <tr className="bg-slate-50/60">
                  <td colSpan={3} className="py-2.5 px-4 text-right font-semibold text-slate-600">
                    Subtotal:
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                    ₹{invoice.amountPaidInRupees.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td colSpan={3} className="py-2.5 px-4 text-right font-semibold text-slate-600">
                    Educational Services GST (Nil Exemption u/s 12AA):
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                    ₹0.00
                  </td>
                </tr>

                {/* Grand Total */}
                <tr className="bg-emerald-50/80 border-t-2 border-emerald-500">
                  <td colSpan={3} className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                    Total Amount Received:
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-800 text-base">
                    ₹{invoice.amountPaidInRupees.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-slate-500">Amount Received in Words:</span>
            <span className="font-bold text-indigo-950 font-serif text-[13px]">
              Rupees {amountInWords}
            </span>
          </div>

          {/* Verification Seal & Statutory Attestation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pt-2 pb-6 border-b border-slate-200">
            {/* Left: Security notice */}
            <div className="space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Digitally Authenticated E-Document</span>
              </div>
              <p className="leading-relaxed">
                This is an official system-generated invoice valid under the Information Technology Act, 2000. It is suitable for parent employer tuition allowance reimbursement and tax deductions.
              </p>
              <p className="font-mono text-[10px] text-slate-400">
                Verification Hash: SHA256:{invoice.receiptNumber}-{Math.abs(invoice.amountPaidInRupees * 73).toString(16)}
              </p>
            </div>

            {/* Right: Official Stamp Box */}
            <div className="flex justify-start sm:justify-end">
              <div className="w-48 p-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 text-center space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-900">
                  {schoolName.toUpperCase()}
                </div>
                <div className="w-9 h-9 rounded-full border border-indigo-400 bg-white mx-auto flex items-center justify-center text-[10px] font-black text-indigo-700 shadow-inner">
                  VERIFIED
                </div>
                <div className="text-[9px] font-bold text-emerald-700 uppercase">
                  ACCOUNTS & AUDIT
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {schoolCity.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Branding Bar: MUST show ShelfOne POS Logo & attribution, NO AlphaGrad */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-600">{schoolName} • Accounts Office</span>
            </div>

            {/* Official ShelfOne POS Attribution with Logo */}
            <div className="flex items-center gap-2.5 py-1.5 px-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Powered By</span>
              <img
                src="/shelfone.jpg"
                alt="ShelfOne POS"
                width={32}
                height={32}
                style={{ width: "32px", height: "32px", objectFit: "contain" }}
                className="h-8 w-8 object-contain rounded-lg border border-slate-200 p-0.5 bg-white shrink-0"
              />
              <strong className="text-xs font-black text-slate-900 tracking-tight">
                ShelfOne POS
              </strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

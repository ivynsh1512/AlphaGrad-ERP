"use client";

import React, { useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathMarkdownProps {
	content: string;
	className?: string;
}

export function MathMarkdown({ content, className = "" }: MathMarkdownProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const renderMathAndMarkdown = (text: string): string => {
		if (!text) return "";

		const displayMathList: string[] = [];
		const inlineMathList: string[] = [];
		const codeBlockList: string[] = [];
		const inlineCodeList: string[] = [];

		// 1. Protect code blocks ```lang ... ```
		let s = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, (m, lang, code) => {
			const idx = codeBlockList.length;
			codeBlockList.push(
				`<pre class="my-2.5 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto shadow-inner"><code>${code
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")}</code></pre>`
			);
			return `@@CODEBLOCK_${idx}@@`;
		});

		// Protect inline code `...`
		s = s.replace(/`([^`\n]+)`/g, (m, code) => {
			const idx = inlineCodeList.length;
			inlineCodeList.push(
				`<code class="bg-slate-100 text-indigo-700 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-200/80">${code
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")}</code>`
			);
			return `@@INLINECODE_${idx}@@`;
		});

		// 2. Display math: \begin{...}...\end{...}, $$...$$, \[...\]
		s = s.replace(/\\begin\{(equation|align|gather|matrix|pmatrix|bmatrix)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (m) => {
			const idx = displayMathList.length;
			let html = "";
			try {
				html = katex.renderToString(m.trim(), { displayMode: true, throwOnError: false });
			} catch {
				html = `<div class="font-mono text-center p-2 bg-slate-100 rounded text-xs">${m}</div>`;
			}
			displayMathList.push(
				`<div class="my-3 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl overflow-x-auto text-center shadow-xs">${html}</div>`
			);
			return `@@DISPLAYMATH_${idx}@@`;
		});

		s = s.replace(/\$\$([\s\S]*?)\$\$/g, (m, tex) => {
			const idx = displayMathList.length;
			let html = "";
			try {
				html = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
			} catch {
				html = `<div class="font-mono text-center p-2 bg-slate-100 rounded text-xs">${tex}</div>`;
			}
			displayMathList.push(
				`<div class="my-3 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl overflow-x-auto text-center shadow-xs">${html}</div>`
			);
			return `@@DISPLAYMATH_${idx}@@`;
		});

		s = s.replace(/\\\[([\s\S]*?)\\\]/g, (m, tex) => {
			const idx = displayMathList.length;
			let html = "";
			try {
				html = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
			} catch {
				html = `<div class="font-mono text-center p-2 bg-slate-100 rounded text-xs">${tex}</div>`;
			}
			displayMathList.push(
				`<div class="my-3 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl overflow-x-auto text-center shadow-xs">${html}</div>`
			);
			return `@@DISPLAYMATH_${idx}@@`;
		});

		// 3. Inline math: \(...\) or $...$
		s = s.replace(/\\\(([\s\S]*?)\\\)/g, (m, tex) => {
			const idx = inlineMathList.length;
			let html = "";
			try {
				html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
			} catch {
				html = `<span class="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-xs">${tex}</span>`;
			}
			inlineMathList.push(html);
			return `@@INLINEMATH_${idx}@@`;
		});

		s = s.replace(/\$([^\$\n]+?)\$/g, (m, tex) => {
			const idx = inlineMathList.length;
			let html = "";
			try {
				html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
			} catch {
				html = `<span class="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-xs">${tex}</span>`;
			}
			inlineMathList.push(html);
			return `@@INLINEMATH_${idx}@@`;
		});

		// 4. Horizontal rules
		s = s.replace(/^ *([-*_]){3,} *$/gm, '<hr class="my-3.5 border-slate-200" />');

		// 5. Headings
		s = s.replace(/^#### (.*$)/gm, '<h4 class="text-xs font-bold text-slate-900 mt-2.5 mb-1">$1</h4>');
		s = s.replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5">$1</h3>');
		s = s.replace(/^## (.*$)/gm, '<h2 class="text-base font-bold text-slate-900 mt-3 mb-1.5 border-b border-slate-100 pb-1">$1</h2>');
		s = s.replace(/^# (.*$)/gm, '<h1 class="text-lg font-black text-slate-900 mt-4 mb-2">$1</h1>');

		// 6. Section Callouts (common LLM headings like Final answer, Step-by-step, Concept, Explanation)
		s = s.replace(
			/^(\*{0,2})(Final answer:?|Final Answer:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 my-1.5 shadow-2xs">Final Answer ✓</div>'
		);
		s = s.replace(
			/^(\*{0,2})(Step-by-step:?|Step-by-step solution:?|Step-by-Step:?|Step-by-step working:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 my-1.5 shadow-2xs">Step-by-Step Solution</div>'
		);
		s = s.replace(
			/^(\*{0,2})(Concept:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 my-1.5 shadow-2xs">Concept</div>'
		);
		s = s.replace(
			/^(\*{0,2})(Explanation:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 my-1.5 shadow-2xs">Explanation</div>'
		);
		s = s.replace(
			/^(\*{0,2})(Remember:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 my-1.5 shadow-2xs">Remember 💡</div>'
		);
		s = s.replace(
			/^(\*{0,2})(Practice question:?|Practice Question:?)(\*{0,2})$/gim,
			'<div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 my-1.5 shadow-2xs">Practice Question 🎯</div>'
		);

		// Also handle inline bold callouts
		s = s.replace(
			/<strong[^>]*>Final answer:?<\/strong>/gi,
			'<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 mr-1.5">Final Answer ✓</span>'
		);
		s = s.replace(
			/<strong[^>]*>Step-by-step(?: solution)?:?<\/strong>/gi,
			'<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 mr-1.5">Step-by-Step</span>'
		);
		s = s.replace(
			/<strong[^>]*>Concept:?<\/strong>/gi,
			'<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 mr-1.5">Concept</span>'
		);
		s = s.replace(
			/<strong[^>]*>Explanation:?<\/strong>/gi,
			'<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 mr-1.5">Explanation</span>'
		);
		s = s.replace(
			/<strong[^>]*>Remember:?<\/strong>/gi,
			'<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 mr-1.5">Remember 💡</span>'
		);

		// 7. Bold and Italics
		s = s.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
		s = s.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');

		// 8. Numbered steps and bullets
		s = s.replace(
			/^\s*(\d+)\.\s+(.*)$/gm,
			'<div class="flex items-start gap-2.5 my-1.5"><span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] shrink-0 mt-0.5">$1</span><span class="flex-1 leading-relaxed text-slate-800">$2</span></div>'
		);
		s = s.replace(
			/^\s*[-*]\s+(.*)$/gm,
			'<div class="flex items-start gap-2 my-1 ml-2"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2"></span><span class="flex-1 leading-relaxed text-slate-800">$1</span></div>'
		);

		// 9. Blockquotes
		s = s.replace(
			/^\s*>\s*(.*)$/gm,
			'<blockquote class="border-l-3 border-indigo-400 pl-3 py-1 my-2 text-slate-600 italic bg-indigo-50/40 rounded-r text-xs sm:text-sm">$1</blockquote>'
		);

		// 10. Paragraphs & Line Breaks
		s = s.replace(/\n\n+/g, '<div class="h-2.5"></div>');
		s = s.replace(/\n/g, "<br />");

		// Restore placeholders
		s = s.replace(/@@DISPLAYMATH_(\d+)@@/g, (_, i) => displayMathList[+i] || "");
		s = s.replace(/@@INLINEMATH_(\d+)@@/g, (_, i) => inlineMathList[+i] || "");
		s = s.replace(/@@CODEBLOCK_(\d+)@@/g, (_, i) => codeBlockList[+i] || "");
		s = s.replace(/@@INLINECODE_(\d+)@@/g, (_, i) => inlineCodeList[+i] || "");

		return s;
	};

	return (
		<div
			ref={containerRef}
			className={`prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-800 ${className}`}
			dangerouslySetInnerHTML={{ __html: renderMathAndMarkdown(content) }}
		/>
	);
}

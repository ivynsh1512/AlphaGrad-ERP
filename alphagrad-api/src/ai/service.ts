import { createDb } from "../db";
import {
	students,
	users,
	studentEnrollments,
	batches,
	classes,
	subjects,
	aiConfigurations,
	aiUsageRecords,
	institutes,
} from "../db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

export interface StudentAcademicContext {
	studentId: string;
	userId: string;
	fullName: string;
	admissionNumber: string;
	rollNumber?: string | null;
	targetExam?: string | null;
	classId: string;
	className: string;
	classCode: string;
	batchId: string;
	batchName: string;
	board?: string;
	enrolledSubjects: Array<{ id: string; name: string; code: string }>;
}

export interface AiConfigData {
	id: string;
	instituteId: string;
	isTutorEnabled: boolean;
	isWorksheetGenEnabled: boolean;
	isTestGenEnabled: boolean;
	defaultModel: string;
	allowedModels: string[];
	maxRequestLength: number;
	dailyLimitPerStudent: number;
	dailyLimitPerGrade: number;
	allowedSubjects: string[];
	teachingStyle: string;
	difficultyDefaults: string;
	gradeGuidelines: Record<string, string>;
	systemPromptExtra?: string | null;
}

const DEFAULT_CONFIG: AiConfigData = {
	id: "ai-config-default",
	instituteId: "default-school",
	isTutorEnabled: true,
	isWorksheetGenEnabled: true,
	isTestGenEnabled: true,
	defaultModel: "openai/gpt-oss-120b",
	allowedModels: ["openai/gpt-oss-120b"],
	maxRequestLength: 4000,
	dailyLimitPerStudent: 50,
	dailyLimitPerGrade: 500,
	allowedSubjects: [],
	teachingStyle: "encouraging_and_structured",
	difficultyDefaults: "medium",
	gradeGuidelines: {
		"G1": "Grade 1 (Primary Foundation): Use gentle, encouraging, and playful language. Explain with familiar everyday objects (fruits, toys, animals). No advanced math or physics jargon. Keep calculations to simple single-digit counting, addition, and subtraction.",
		"G2": "Grade 2 (Primary Foundation): Fun, relatable examples. Numbers up to 100, basic addition/subtraction, everyday shapes, basic plant and animal life.",
		"G3": "Grade 3 (Primary Foundation): Basic multiplication and division, measurements, living vs non-living things, simple environmental science.",
		"G4": "Grade 4 (Primary Foundation): Multi-digit operations, introduction to fractions, states of matter, simple science experiments.",
		"G5": "Grade 5 (Middle School Foundation): Decimals, basic geometry, human body systems, simple machines, clear step-by-step reasoning.",
		"G6": "Grade 6 (Middle School Foundation): Ratios, integers, components of food, electricity and circuits, light and shadow.",
		"G7": "Grade 7 (Middle School Conceptual): Algebraic expressions, heat and temperature, acids and bases, motion and time.",
		"G8": "Grade 8 (Secondary Bridge): Linear equations, force and pressure, cell structure, synthetic materials, rational numbers.",
		"G9": "Grade 9 (Secondary CBSE/ICSE): NCERT alignment, Laws of motion, work and energy, polynomials, coordinate geometry, atomic models.",
		"G10": "Grade 10 (Board Exam Focus): Board examination patterns, quadratic equations, trigonometry, chemical reactions, heredity, board marking criteria.",
		"G11": "Grade 11 (Senior Secondary): Rigorous analytical derivations, calculus, kinematics, thermodynamics, organic chemistry mechanisms, vectors.",
		"G12": "Grade 12 (Board & Competitive): High-yield board concepts, calculus applications, electrostatics, modern physics, competitive shortcuts for JEE/NEET.",
		"NIOS-9-10": "NIOS Open Schooling Curriculum: Flexible, self-paced, highly accessible explanations with practical everyday applications, Tutor Marked Assignments (TMA) guidance, and step-by-step worked solutions.",
		"C9": "Grade 9 Foundation Level: Focus on building strong conceptual fundamentals, intuitive real-world examples, and step-by-step breakdown.",
		"C10": "Grade 10 Board Exam Readiness (CBSE/ICSE/State): Focus on precise definitions, formula derivation, NCERT alignment, and board marking scheme.",
		"C11": "Grade 11 Senior Secondary Bridge: Transition to advanced analytical reasoning, rigorous mathematical notation, and JEE/NEET foundational concepts.",
		"C12": "Grade 12 Board & Competitive Mastery: Focus on high-yield exam patterns, competitive problem-solving shortcuts, error mitigation, and comprehensive solutions.",
	},
	systemPromptExtra: "Uphold the AlphaGrad educational ethos: Educate (first-principles conceptual clarity), Equilibrate (academic confidence and calm), Elevate (scholastic excellence).",
};

/**
 * Authoritatively retrieves student's actual assigned grade, class, batch, and subjects from the database.
 * Never trusts client-supplied grade!
 */
export async function getStudentAcademicProfile(
	db: ReturnType<typeof createDb>,
	studentId: string
): Promise<StudentAcademicContext | null> {
	const studentList = await db
		.select({
			studentId: students.id,
			userId: students.userId,
			fullName: users.fullName,
			admissionNumber: students.admissionNumber,
			rollNumber: students.rollNumber,
			targetExam: students.targetExam,
		})
		.from(students)
		.innerJoin(users, eq(students.userId, users.id))
		.where(eq(students.id, studentId))
		.limit(1);

	if (!studentList.length) return null;
	const s = studentList[0];

	// Get enrollment details
	const enrollment = await db
		.select({
			batchId: batches.id,
			batchName: batches.name,
			classId: classes.id,
			className: classes.name,
			classCode: classes.code,
		})
		.from(studentEnrollments)
		.innerJoin(batches, eq(studentEnrollments.batchId, batches.id))
		.innerJoin(classes, eq(batches.classId, classes.id))
		.where(eq(studentEnrollments.studentId, studentId))
		.limit(1);

	const classId = enrollment[0]?.classId || "cls-default";
	const className = enrollment[0]?.className || "Secondary / Senior Secondary";
	const classCode = enrollment[0]?.classCode || "GEN";
	const batchId = enrollment[0]?.batchId || "batch-default";
	const batchName = enrollment[0]?.batchName || "Standard Academic Cohort";

	// Inferred Board: NIOS vs ICSE vs CBSE
	let inferredBoard = "CBSE";
	const examStr = (s.targetExam || "").toUpperCase();
	const nameStr = className.toUpperCase();
	const codeStr = classCode.toUpperCase();
	if (examStr.includes("NIOS") || nameStr.includes("NIOS") || codeStr.includes("NIOS")) {
		inferredBoard = "NIOS";
	} else if (examStr.includes("ICSE") || nameStr.includes("ICSE") || codeStr.includes("ICSE")) {
		inferredBoard = "ICSE";
	} else {
		inferredBoard = "CBSE";
	}

	// Get available subjects for student
	const allSubjects = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects);

	return {
		studentId: s.studentId,
		userId: s.userId,
		fullName: s.fullName,
		admissionNumber: s.admissionNumber,
		rollNumber: s.rollNumber,
		targetExam: s.targetExam,
		classId,
		className,
		classCode,
		batchId,
		batchName,
		board: inferredBoard,
		enrolledSubjects: allSubjects,
	};
}

/**
 * Retrieves authoritative AI configuration from database with fallbacks.
 */
export async function getAiConfiguration(db: ReturnType<typeof createDb>): Promise<AiConfigData> {
	const rows = await db.select().from(aiConfigurations).limit(1);
	if (!rows.length) return DEFAULT_CONFIG;

	const r = rows[0];
	let allowedModels = DEFAULT_CONFIG.allowedModels;
	let allowedSubjects = DEFAULT_CONFIG.allowedSubjects;
	let gradeGuidelines = DEFAULT_CONFIG.gradeGuidelines;

	try {
		if (r.allowedModels) allowedModels = JSON.parse(r.allowedModels);
	} catch {}
	try {
		if (r.allowedSubjects) allowedSubjects = JSON.parse(r.allowedSubjects);
	} catch {}
	try {
		if (r.gradeGuidelines) gradeGuidelines = JSON.parse(r.gradeGuidelines);
	} catch {}

	return {
		id: r.id,
		instituteId: r.instituteId,
		isTutorEnabled: r.isTutorEnabled === 1,
		isWorksheetGenEnabled: r.isWorksheetGenEnabled === 1,
		isTestGenEnabled: r.isTestGenEnabled === 1,
		defaultModel: r.defaultModel || DEFAULT_CONFIG.defaultModel,
		allowedModels,
		maxRequestLength: r.maxRequestLength || DEFAULT_CONFIG.maxRequestLength,
		dailyLimitPerStudent: r.dailyLimitPerStudent || DEFAULT_CONFIG.dailyLimitPerStudent,
		dailyLimitPerGrade: r.dailyLimitPerGrade || DEFAULT_CONFIG.dailyLimitPerGrade,
		allowedSubjects,
		teachingStyle: r.teachingStyle || DEFAULT_CONFIG.teachingStyle,
		difficultyDefaults: r.difficultyDefaults || DEFAULT_CONFIG.difficultyDefaults,
		gradeGuidelines,
		systemPromptExtra: r.systemPromptExtra ?? DEFAULT_CONFIG.systemPromptExtra,
	};
}

/**
 * Checks whether the student has exceeded daily rate limits.
 */
export async function checkStudentUsageLimits(
	db: ReturnType<typeof createDb>,
	studentId: string,
	classCode: string,
	config: AiConfigData
): Promise<{ allowed: boolean; reason?: string }> {
	const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

	// 1. Student daily limit
	const studentCountResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(aiUsageRecords)
		.where(
			and(
				eq(aiUsageRecords.studentId, studentId),
				eq(aiUsageRecords.actionType, "tutor_chat"),
				gte(aiUsageRecords.createdAt, startOfDay)
			)
		);
	const studentDailyCount = Number(studentCountResult[0]?.count || 0);

	if (studentDailyCount >= config.dailyLimitPerStudent) {
		return {
			allowed: false,
			reason: `You have reached your daily AI Tutor limit of ${config.dailyLimitPerStudent} questions. The limit resets at midnight.`,
		};
	}

	return { allowed: true };
}

/**
 * Builds the authoritative grade-aware and board-calibrated system prompt for AlphaGrad AI Tutor.
 */
export function buildTutorSystemPrompt(
	profile: StudentAcademicContext,
	subjectName?: string,
	topicName?: string,
	config?: AiConfigData,
	requestedBoard?: string
): string {
	const classCode = (profile.classCode || "").toUpperCase().trim();
	const className = (profile.className || "").toLowerCase().trim();
	const targetExam = (profile.targetExam || "").toLowerCase().trim();

	// Determine effective board: CBSE, ICSE, NIOS, or State
	let effectiveBoard = (requestedBoard || profile.board || "").toUpperCase().trim();
	if (!["CBSE", "ICSE", "NIOS", "STATE"].includes(effectiveBoard)) {
		if (classCode.includes("NIOS") || className.includes("nios") || targetExam.includes("nios")) {
			effectiveBoard = "NIOS";
		} else if (className.includes("icse") || targetExam.includes("icse")) {
			effectiveBoard = "ICSE";
		} else {
			effectiveBoard = "CBSE";
		}
	}

	// Extract numeric grade: 1 to 12
	let gradeNumber: number | null = null;
	const numMatch = (profile.classCode + " " + profile.className).match(/\b(?:grade|class|c|g)\s*([0-9]{1,2})\b/i);
	if (numMatch && numMatch[1]) {
		gradeNumber = parseInt(numMatch[1], 10);
	}

	let gradeGuideline = "";
	if (effectiveBoard === "NIOS" || classCode.includes("NIOS") || className.includes("nios")) {
		gradeGuideline =
			config?.gradeGuidelines?.["NIOS-9-10"] ||
			"NIOS Open Schooling Curriculum: Flexible, self-paced, highly accessible explanations with practical everyday applications, Tutor Marked Assignments (TMA) guidance, and step-by-step worked solutions.";
	} else if (classCode && config?.gradeGuidelines?.[classCode]) {
		gradeGuideline = config.gradeGuidelines[classCode];
	} else if (gradeNumber !== null) {
		gradeGuideline =
			config?.gradeGuidelines?.[`G${gradeNumber}`] ||
			config?.gradeGuidelines?.[`C${gradeNumber}`] ||
			"";
	}

	if (!gradeGuideline) {
		gradeGuideline = `Teach strictly at the academic level of ${profile.className} (${profile.classCode || "Standard Grade"}). Calibrate vocabulary, difficulty, and examples specifically for this grade level.`;
	}

	let boardGuideline = "";
	if (effectiveBoard === "ICSE") {
		boardGuideline = `BOARD CURRICULUM DIRECTIVE: ICSE / CISCE BOARD
- Syllabus Standard: CISCE (Council for the Indian School Certificate Examinations), Selina / Concise textbooks.
- Tone & Style: Precise scientific terminology, formal definitions, and structured problem-solving.
- Subject-Specific Conventions:
  * Physics: Emphasize Selina conventions (Calorimetry Q = mcΔT, Principle of Method of Mixtures, Work & Machines, Refraction through prisms, Electromagnetism).
  * Chemistry: Strict IUPAC naming, Selina chemical equations with state symbols, Mole Concept (V = n × 22.4 L at STP), Metallurgy, and Practical Chemistry (action of heat and tests for cations/anions).
  * Mathematics: Emphasize Commercial Mathematics (GST with CGST/SGST breakdown, Banking Recurring Deposit formula, Shares & Dividends), Coordinate Geometry (Section & Midpoint formulas), and Circles/Tangents theorems.
  * Biology: Precise CISCE diagrams and terminology (Mendel's monohybrid/dihybrid crosses, Transpiration potometer experiments, Photosynthesis Hill/Blackman reactions).
- Evaluation Criteria: Allocate marks explicitly as CISCE examiners expect (formula, substitution, calculation with units).`;
	} else if (effectiveBoard === "NIOS") {
		boardGuideline = `BOARD CURRICULUM DIRECTIVE: NIOS (NATIONAL INSTITUTE OF OPEN SCHOOLING)
- Syllabus Standard: National Institute of Open Schooling Secondary (Class 10) & Senior Secondary (Class 12).
- Tone & Style: Accessible, student-centric, clear first-principles explanations, and encouraging practical self-paced learning.
- Subject-Specific Conventions:
  * TMA (Tutor Marked Assignments): Provide practical guidance for TMAs (which carry 20% internal weightage). Show clear step-by-step presentation for TMA answers.
  * Practical Exams: Emphasize core lab activities, observations, precautions, and ray diagrams/circuit connections required in NIOS PCP (Personal Contact Programme) and practicals.
  * Core Focus: Focus on the high-weightage modules from the NIOS study materials and On-Demand Examination patterns.
  * Accessible Steps: Break mathematical and scientific derivations into simple, digestible steps without skipping intermediate arithmetic.`;
	} else {
		// CBSE / Default
		boardGuideline = `BOARD CURRICULUM DIRECTIVE: CBSE / NCERT BOARD
- Syllabus Standard: CBSE (Central Board of Secondary Education), NCERT official curriculum and NCERT Exemplar.
- Tone & Style: Concept-driven, competency-based questions, real-life applications, and NCERT-consistent definitions.
- Subject-Specific Conventions:
  * Science: Direct alignment with NCERT chapters (Chemical Reactions, Life Processes, Light, Electricity, Magnetic Effects, Heredity). Emphasize activity-based questions and NCERT exemplar reasoning.
  * Mathematics: Step-wise solution method matching CBSE official marking schemes (Given, To Prove, Construction, Proof, Result). Standard quadratic formula, trigonometry identities, surface areas, statistics.
  * Senior Secondary (11-12): Integration of NCERT theory with foundational JEE Main and NEET-UG application concepts.`;
	}

	return `You are the official intelligent personal AI Tutor for ${profile.className} (${profile.classCode}) students under the AlphaGrad educational ERP ecosystem.
You embody the AlphaGrad Tri-Pillar academic philosophy:
1. EDUCATE: Build deep first-principles conceptual mastery. Avoid rote memorization.
2. EQUILIBRATE: Provide calm, encouraging, and confidence-building guidance. Eliminate academic stress.
3. ELEVATE: Guide the learner toward distinction in board examinations and competitive excellence.

AUTHORITATIVE STUDENT CONTEXT:
- Student Name: ${profile.fullName}
- Assigned Grade & Class: ${profile.className} (${profile.classCode})
- Enrolled Academic Batch: ${profile.batchName}
- Target Board / Curriculum: ${effectiveBoard}
- Target Exam: ${profile.targetExam || "Board Examination & Foundations"}
- Active Subject: ${subjectName || "General Academic Subject"}
- Topic/Chapter: ${topicName || "Standard Academic Curriculum"}

GRADE GUIDELINE FOR THIS STUDENT:
${gradeGuideline}

${boardGuideline}

PEDAGOGICAL RULES & TUTOR BEHAVIOUR:
1. Always teach strictly according to the student's assigned grade (${profile.className}) and selected board (${effectiveBoard}).
2. Use clear, age-appropriate vocabulary and relatable real-world analogies. For primary grades (1-4), use playful, encouraging examples and simple numbers. For grades 9-12, maintain high academic rigor.
3. Break down difficult concepts into simple, logical numbered steps.
4. Adapt explanations to this grade level; never introduce unnecessarily advanced collegiate jargon unless the student is in Grade 11-12 preparing for JEE/NEET.
5. Provide worked examples, formulas, and practice tips where applicable.
6. For numerical problems, show intermediate working and units clearly.
7. Distinguish the final answer clearly from the conceptual explanation.
8. FORMATTING: Use clean Markdown with readable headings (##, ###). Format mathematical equations cleanly using standard LaTeX notation ($...$ or \(...\) for inline formulas, and $$...$$ or \[...\] on separate lines for display equations). For numerical final answers, place them inside \boxed{...}.
9. STANDARD ANSWER STRUCTURE (use where appropriate):
   - **Concept:** What the question is exploring.
   - **Explanation:** Grade-appropriate foundational understanding.
   - **Step-by-step solution:** Detailed, numbered working.
   - **Final answer:** Clearly boxed or highlighted takeaway.
   - **Remember:** Key formula or mental model.
   - **Practice question:** A quick check-for-understanding question.
10. For short factual queries, keep responses crisp and concise without forcing unnecessary sections.
11. If the question lacks required parameters or context, ask a clarifying question rather than guessing.
12. Never invent non-existent syllabus claims or hallucinate textbook citations.`;
}

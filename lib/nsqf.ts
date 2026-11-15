// Official NSQF level descriptors (the framework revised in 2023: levels 1-8, with half levels
// such as 4.5). The text is the "Brief Outline/Description" row of the NCVET level-descriptor
// table published on the National Qualifications Register, lightly de-hyphenated. The table
// groups half levels with the level above ("Level 3.5 to 4"), so each whole level here carries
// its group's label.
export const NSQF_DESCRIPTORS_SOURCE = "https://nqr.gov.in/level-descriptors"

export type NsqfDomain = { headline: string; detail: string }

export type NsqfDescriptor = {
  level: number
  /** The group the official table uses for this level, e.g. "Level 3.5 to 4". */
  band: string
  /** Typical minimum education to enter a qualification at this level with no experience (official table). */
  entry: string
  knowledge: NsqfDomain
  skills: NsqfDomain
  /** Aptitude, mind-set, soft skills, employment readiness & entrepreneurship. */
  readiness: NsqfDomain
  /** Broad learning outcomes. */
  outcomes: NsqfDomain
  responsibility: NsqfDomain
}

const DESCRIPTORS: Record<number, NsqfDescriptor> = {
  1: {
    level: 1,
    band: "Level 1",
    entry: "No formal education",
    knowledge: {
      headline: "Elementary knowledge",
      detail: "Elementary knowledge in work demonstrable by recognition or recall for understanding the context of work.",
    },
    skills: {
      headline: "Role confined skills",
      detail:
        "Narrow range of basic skills while carrying out directed activities and processes that are repetitive & predictable in nature requiring no previous practice.",
    },
    readiness: {
      headline: "Basic employment readiness",
      detail:
        "Very narrow/basic employability skills, including communication skills & basic understanding of financial and digital literacy, digital payments and Aadhaar.",
    },
    outcomes: {
      headline: "Routine/repetitive tasks",
      detail: "Perform routine & repetitive tasks under full instructions and close supervision.",
    },
    responsibility: {
      headline: "Helper",
      detail: "Works as helper/ground level worker, always works under continuous instruction and close supervision.",
    },
  },
  2: {
    level: 2,
    band: "Level 2",
    entry: "No formal education",
    knowledge: {
      headline: "Fundamental knowledge",
      detail:
        "Basic working/operational knowledge in the area of work with understanding of basic materials, tools, applications in a limited context.",
    },
    skills: {
      headline: "Limited finite skills",
      detail: "Performs structured tasks in a limited range of functional roles. Uses known solutions to familiar problems.",
    },
    readiness: {
      headline: "Employment readiness",
      detail:
        "Receive and transmit written and oral messages/communication clearly. Have broader but basic employability skills including basic self-employment/entrepreneurial mind-set for mini businesses.",
    },
    outcomes: {
      headline: "Carry out the predefined tasks",
      detail:
        "The candidate may carry out a job requiring limited range of routine and predictable activities. Understands basic safety and quality norms.",
    },
    responsibility: {
      headline: "Assistant",
      detail: "Limited responsibility for delivery and quality of work as an Assistant.",
    },
  },
  3: {
    level: 3,
    band: "Level 2.5 to 3",
    entry: "Grade 10 pass",
    knowledge: {
      headline: "Range of knowledge",
      detail:
        "Knowledge involving a defined range of standard procedures, uses limited discretion and judgement over a range of known responses to familiar problems.",
    },
    skills: {
      headline: "Range of technical skills",
      detail: "Required skills for identification of the problem and issues within the range of familiar contexts.",
    },
    readiness: {
      headline: "Team readiness & entrepreneurial readiness",
      detail: "Team worker, with broad employability skills who displays motivation and positive attitude for work.",
    },
    outcomes: {
      headline: "Carry out range of tasks and may provide range of solutions",
      detail:
        "The candidate carries out a job in familiar, predictable, routine situations of clear choice, can focus on range of application of standard procedures or operations in production/services. Must be able to identify/anticipate the problems and possible range of solutions.",
    },
    responsibility: {
      headline: "Accountable/responsible: Jr. Technician & Technician",
      detail:
        "Takes responsibility for delivery and quality of own work and tangible output. Can assist in the planning of the routine and predictable tasks within a specific field.",
    },
  },
  4: {
    level: 4,
    band: "Level 3.5 to 4",
    entry: "Grade 12 pass, or 2nd year of a diploma after Grade 10",
    knowledge: {
      headline: "Specialized knowledge",
      detail:
        "Specialized knowledge or/and proficient with diverse procedural knowledge, operational understanding, time and quality management, data interpretation, and financial feasibility analysis.",
    },
    skills: {
      headline: "Specialized skills",
      detail:
        "Professionally skilled with advanced knowledge, capable of successfully implementing techniques and delivering work with precision.",
    },
    readiness: {
      headline: "Team readiness, self-entrepreneurship readiness",
      detail:
        "Highly skilled and versatile professional with proficiency in employability skills including communication, leadership, entrepreneurship, and digital and financial literacy.",
    },
    outcomes: {
      headline: "Specialized/complex jobs/tasks",
      detail:
        "Versatile candidate adept at executing specialized tasks with minimal supervision, applying technical skills and problem-solving with clarity.",
    },
    responsibility: {
      headline: "Self and team responsibility: Sr. Technician or Master Technician",
      detail: "Individually accountable, collectively responsible; capable and confident in non-standard and non-routine tasks.",
    },
  },
  5: {
    level: 5,
    band: "Level 4.5 to 5",
    entry: "2nd year of a UG degree, or of a diploma after Grade 12",
    knowledge: {
      headline: "Multidisciplinary and specialized knowledge",
      detail: "Possesses broad and deep knowledge and skills to solve problems in specialized fields.",
    },
    skills: {
      headline: "Range of skills along with specialized domain skills",
      detail:
        "Excellent cognitive skills and technical prowess utilized to perform complex tasks with ease, project management expertise, and adept at data analysis for informed decision-making.",
    },
    readiness: {
      headline: "Entrepreneurial mindset, self-management",
      detail:
        "A versatile professional with excellent communication, digital and financial literacy, ethical values, self-management and may have entrepreneurial mindset.",
    },
    outcomes: {
      headline: "Judgement/decision making: specialized",
      detail: "A skilled professional with technical expertise, adept at solving complex problems and improving output.",
    },
    responsibility: {
      headline: "Team leader: junior technical supervisor, technical supervisor or junior/deputy manager",
      detail:
        "Highly skilled technical supervisor responsible for achieving tangible outcomes, managing change, building teams, and mentoring the workforce.",
    },
  },
  6: {
    level: 6,
    band: "Level 5.5 to 6",
    entry: "A 4-year UG degree, or starting a PG after a 3-year UG degree",
    knowledge: {
      headline: "Advanced multidisciplinary and specialized knowledge",
      detail:
        "Proficient in interdisciplinary knowledge including tech with specialized expertise in related fields; knowledgeable in emerging trends, change management, and problem-solving.",
    },
    skills: {
      headline: "Advanced technical and managerial skills",
      detail:
        "Proficiently skilled in advanced cognitive abilities, project management, techno-commercial aspects, and future adaptability, with social intelligence.",
    },
    readiness: {
      headline: "Leadership, effective resource management",
      detail:
        "Dynamic leader with exceptional organizational, communication and mentoring skills, capable of driving innovation for optimal group performance.",
    },
    outcomes: {
      headline: "Judgement in complex problems",
      detail:
        "Applies advanced technical skills, monitors critical parameters, evaluates and improves processes, and solves complex problems with evidence-based judgement.",
    },
    responsibility: {
      headline: "Vertical/business unit management: Manager or Senior Manager",
      detail:
        "Accountable leader effectively manages independent units/projects, delegates, supervises and drives change with full responsibility & team building.",
    },
  },
  7: {
    level: 7,
    band: "Level 6.5 to 7",
    entry: "In a PG after a 4-year UG degree, or pursuing a PhD",
    knowledge: {
      headline: "Advanced knowledge with critical understanding of emerging developments",
      detail:
        "A capable expert with extensive knowledge, critical thinking, and application of technology to specialized fields while pursuing continuous self-development.",
    },
    skills: {
      headline: "Highly specialized skills, transdisciplinary skills, leadership skills",
      detail:
        "Highly skilled and innovative professional with expertise in complex problem-solving, change management, leadership, and project management.",
    },
    readiness: {
      headline: "Cross cultural competency, transformational leadership",
      detail:
        "Highly skilled professional with cross-cultural competency, strategic ideation, time management, and leadership abilities for excellence.",
    },
    outcomes: {
      headline: "Apply acquired advanced technical skills, technical appraisal and reviews",
      detail:
        "Proficiently analyzes and creatively resolves practical problems, utilizing statistical tools while showing leadership and technical mastery in decision-making for achieving goals.",
    },
    responsibility: {
      headline: "Business management (like CEO/CXO, etc.)",
      detail:
        "Visionary leader accountable for organizational growth, complex problem-solving, staff development, and data-driven decisions.",
    },
  },
  8: {
    level: 8,
    band: "Level 8",
    entry: "A PhD in the relevant field",
    knowledge: {
      headline: "Mastery of knowledge/innovation driven/comprehensive knowledge",
      detail:
        "Mastery of knowledge, critical innovation, and specialized problem-solving skills to generate evidence-based solutions for complex problems.",
    },
    skills: {
      headline: "Most advanced technical and managerial skills",
      detail:
        "Highly specialized professional with superior project management, cognitive, technical, transdisciplinary, and leadership skills. Redefining practices with a cross-cultural mindset.",
    },
    readiness: {
      headline: "Significant authority, transformational leadership, social intelligence",
      detail:
        "Possess highly specialized, creative, and transformative skills with values for global citizenship and excellence.",
    },
    outcomes: {
      headline: "Lead large transformational projects",
      detail:
        "High-performing leader with adaptive thinking, analytical skills, and innovative mindset to drive large-scale transformation and manage resources effectively.",
    },
    responsibility: {
      headline: "Business vision (Chairperson/Board Member/CMD)",
      detail:
        "Strategic thinker and innovator, accountable for organizational growth and development, making data-driven decisions.",
    },
  },
}

/** Every level of the framework, 1 to 8. */
export const NSQF_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

// Levels the app assigns to learners and roadmaps. The qualification catalogue
// (data/qualifications.json) and the placement test cover this band, so every assigned
// level is clamped to it.
export const NSQF_MIN_LEVEL = 3
export const NSQF_MAX_LEVEL = 6

export function clampNsqfLevel(level: number): number {
  const n = Number.isFinite(level) ? Math.round(level) : NSQF_MIN_LEVEL
  return Math.max(NSQF_MIN_LEVEL, Math.min(NSQF_MAX_LEVEL, n))
}

/** The official descriptor for a level. Half levels use the whole level above (4.5 → 5). */
export function getNsqfDescriptor(level: number): NsqfDescriptor {
  const n = Number.isFinite(level) ? Math.ceil(level) : NSQF_MIN_LEVEL
  return DESCRIPTORS[Math.max(1, Math.min(8, n))]
}

/** One line per domain, for prompts. */
export function describeNsqfLevel(level: number): string {
  const d = getNsqfDescriptor(level)
  return [
    `NSQF level ${d.level} (${d.band}), official descriptors:`,
    `- Knowledge: ${d.knowledge.headline}. ${d.knowledge.detail}`,
    `- Skills: ${d.skills.headline}. ${d.skills.detail}`,
    `- Readiness: ${d.readiness.headline}. ${d.readiness.detail}`,
    `- Outcomes: ${d.outcomes.headline}. ${d.outcomes.detail}`,
    `- Responsibility: ${d.responsibility.headline}. ${d.responsibility.detail}`,
  ].join("\n")
}

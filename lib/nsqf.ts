export type NsqfMapping = {
  level: number
  descriptors: {
    knowledge: string
    skills: string
    responsibility: string
  }
  exampleJobRoles: string[]
  requiredQualifications: string[]
  exampleCourses: string[]
}

const MAPPINGS: Record<number, NsqfMapping> = {
  1: {
    level: 1,
    descriptors: {
      knowledge: "Basic general knowledge, limited in range.",
      skills: "Simple tasks under direct supervision.",
      responsibility: "Works with close support and limited autonomy.",
    },
    exampleJobRoles: ["Helper", "Office Assistant (Trainee)"],
    requiredQualifications: ["Basic literacy/numeracy"],
    exampleCourses: ["Foundational Digital Literacy", "Workplace Safety Basics"],
  },
  2: {
    level: 2,
    descriptors: {
      knowledge: "Basic factual knowledge in a field of work.",
      skills: "Routine tasks using simple tools and methods.",
      responsibility: "Works under supervision with limited judgment.",
    },
    exampleJobRoles: ["Junior Retail Associate", "Plant Helper"],
    requiredQualifications: ["Class 8–10 or equivalent"],
    exampleCourses: ["Basics of Retail Operations", "Shopfloor Tools Introduction"],
  },
  3: {
    level: 3,
    descriptors: {
      knowledge: "Knowledge of facts, principles, processes in a field.",
      skills: "Carry out routine jobs with some autonomy.",
      responsibility: "Responsible for own work within defined context.",
    },
    exampleJobRoles: ["Data Entry Operator", "Field Sales Trainee"],
    requiredQualifications: ["Class 10–12 or equivalent"],
    exampleCourses: ["Spreadsheet Fundamentals", "Customer Interaction Basics"],
  },
  4: {
    level: 4,
    descriptors: {
      knowledge: "Factual and theoretical knowledge in broad contexts.",
      skills: "Solve routine problems and adapt procedures.",
      responsibility: "Self-management; limited guidance for others.",
    },
    exampleJobRoles: ["Technician", "Support Engineer (L1)"],
    requiredQualifications: ["Class 12 + Certificate/Diploma"],
    exampleCourses: ["Technical Support Foundations", "Networking Essentials"],
  },
  5: {
    level: 5,
    descriptors: {
      knowledge: "Comprehensive, specialized knowledge in a field.",
      skills: "Exercise judgment; adapt methods to non-routine problems.",
      responsibility: "Manage own work and sometimes others.",
    },
    exampleJobRoles: ["Assistant Engineer", "Team Lead (Entry)"],
    requiredQualifications: ["Diploma/Advanced Certificate"],
    exampleCourses: ["Systems Administration Basics", "Quality Assurance Methods"],
  },
  6: {
    level: 6,
    descriptors: {
      knowledge: "Advanced knowledge requiring critical understanding.",
      skills: "Create solutions for complex problems; independent work.",
      responsibility: "Substantial autonomy; may supervise teams.",
    },
    exampleJobRoles: ["Junior Engineer", "Operations Supervisor"],
    requiredQualifications: ["Undergraduate Degree or Advanced Diploma"],
    exampleCourses: ["Applied Project Management", "Advanced Data Analysis"],
  },
}

// Levels the app assigns to learners and roadmaps. The reference data in data/*.json
// and the AI roadmap schema only cover this band, so every assigned level is clamped to it.
export const NSQF_MIN_LEVEL = 3
export const NSQF_MAX_LEVEL = 6

export function clampNsqfLevel(level: number): number {
  const n = Number.isFinite(level) ? Math.round(level) : NSQF_MIN_LEVEL
  return Math.max(NSQF_MIN_LEVEL, Math.min(NSQF_MAX_LEVEL, n))
}

export function getNsqfMapping(level: number): NsqfMapping {
  const safe = Math.max(1, Math.min(6, Math.round(level)))
  return MAPPINGS[safe]
}

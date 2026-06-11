// ─────────────────────────────────────────────────────────────────
// AI Readiness Assessment — Content & Scoring Configuration
//
// This is the single place to edit assessment questions, scoring
// weights, and the recurring free-class schedule. Nothing in the
// rest of the assessment flow needs to change when you edit this file.
// ─────────────────────────────────────────────────────────────────

export type AssessmentRole = "individual" | "enterprise";

/** Step 1 — "Which of the following apply to you?" (multi-select). */
export const FOUNDATION_CHECKPOINTS: string[] = [
  "I use AI tools (like ChatGPT or Claude) in my daily work",
  "I know how to write effective prompts to get the results I want",
  "I have used AI to automate at least one repetitive task",
  "I can explain the differences between major AI tools (ChatGPT, Claude, Gemini)",
  "I use AI for writing, editing, or summarising documents",
  "I have used AI to analyse data or spreadsheets",
  "I keep up with AI news and new tool releases",
  "I understand the basics of how AI language models work",
  "I always check AI outputs for accuracy before using them",
  "I have a clear plan for building my AI skills this year",
];

/** Points awarded per checked item in Step 1. */
export const FOUNDATION_POINTS_PER_ITEM = 4; // 10 items x 4 = 40 max

export interface ChoiceOption {
  label: string;
  pts: number;
}

export interface ChoiceQuestion {
  index: number;
  badge: string;
  title: string;
  options: ChoiceOption[];
}

/** Step 2 — single-choice scored questions (Questions 11-15). */
export const CHOICE_QUESTIONS: ChoiceQuestion[] = [
  {
    index: 11,
    badge: "Question 11",
    title: "How often do you use AI tools in a typical week?",
    options: [
      { label: "Never", pts: 0 },
      { label: "Once or twice a week", pts: 3 },
      { label: "A few times a week", pts: 5 },
      { label: "Daily", pts: 7 },
      { label: "Many times a day", pts: 10 },
    ],
  },
  {
    index: 12,
    badge: "Question 12",
    title: "How confident are you at writing prompts that get great results?",
    options: [
      { label: "Not confident at all", pts: 0 },
      { label: "I can write basic prompts", pts: 3 },
      { label: "Moderately confident", pts: 5 },
      { label: "Very confident", pts: 7 },
      { label: "Expert — I refine and iterate prompts", pts: 10 },
    ],
  },
  {
    index: 13,
    badge: "Question 13",
    title: "How much time does AI currently save you in an average week?",
    options: [
      { label: "None", pts: 0 },
      { label: "Less than 1 hour", pts: 3 },
      { label: "1-3 hours", pts: 5 },
      { label: "3-5 hours", pts: 7 },
      { label: "5+ hours", pts: 10 },
    ],
  },
  {
    index: 14,
    badge: "Question 14",
    title: "How comfortable are you using AI for important work tasks?",
    options: [
      { label: "I don't trust AI with real work", pts: 0 },
      { label: "Only for low-stakes tasks", pts: 3 },
      { label: "Comfortable with supervision", pts: 5 },
      { label: "Comfortable for most tasks", pts: 7 },
      { label: "AI is core to how I work", pts: 10 },
    ],
  },
  {
    index: 15,
    badge: "Question 15",
    title: "How would you rate your overall AI knowledge today?",
    options: [
      { label: "Complete beginner", pts: 0 },
      { label: "I know the basics", pts: 3 },
      { label: "Intermediate user", pts: 5 },
      { label: "Advanced user", pts: 7 },
      { label: "I could teach others", pts: 10 },
    ],
  },
];

export type ScoreCategory = "needs-attention" | "on-track" | "high-performer";

export interface ScoreBand {
  category: ScoreCategory;
  label: string;
  /** Inclusive lower bound of this band, on a 0-100 scale. */
  min: number;
  /** Exclusive upper bound of this band, on a 0-100 scale (100 = inclusive). */
  max: number;
  insights: [string, string, string];
}

/** Edit thresholds, labels, and the 3 insights shown for each score band here. */
export const SCORE_BANDS: ScoreBand[] = [
  {
    category: "needs-attention",
    label: "Needs Attention",
    min: 0,
    max: 40,
    insights: [
      "Your current workflow is heavily exposed to legacy processing failures and prompt drift anomalies.",
      "Beginners see the biggest immediate operational wins from mastering just 2-3 core model tasks first.",
      "A few hours of structured sandbox training will immediately put you ahead of the broader market.",
    ],
  },
  {
    category: "on-track",
    label: "On Track",
    min: 40,
    max: 70,
    insights: [
      "You have established intermediate literacy but lack validation schemas for production outputs.",
      "Scaling your delivery requires shifting away from manual proofreading toward automatic JSON parsers.",
      "Secure local sandboxes (like Ollama) are recommended to maintain total corporate IP protection.",
    ],
  },
  {
    category: "high-performer",
    label: "High Performer",
    min: 70,
    max: 100,
    insights: [
      "Excellent foundational competence. Your systems are primed for fully deterministic automated agents.",
      "Next stage optimization requires centralizing disparate ERP endpoints directly under secure APIs.",
      "We recommend establishing continuous system audit trails for advanced compliance verification.",
    ],
  },
];

/**
 * Recurring free class schedule.
 * Edit this block to change the day, time, timezone, or join link
 * shown on the results screen and sent in the invite email.
 */
export const CLASS_SCHEDULE = {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: 6,
  startHour: 9,
  startMinute: 0,
  endHour: 11,
  endMinute: 0,
  /** IANA timezone used for offset calculation (handles EST/EDT). */
  timezone: "America/New_York",
  timezoneLabel: "ET",
  title: "Free AI Class — AI Empowerment Group",
  description:
    "A live, beginner-friendly session covering practical AI skills you can start using right away.",
  location: "Zoom",
  joinLink: "https://zoom.us/s/9832093373#success",
};

export const FOUNDATION_MAX_POINTS = FOUNDATION_CHECKPOINTS.length * FOUNDATION_POINTS_PER_ITEM;
export const CHOICE_MAX_POINTS = CHOICE_QUESTIONS.reduce(
  (max, q) => max + Math.max(...q.options.map((o) => o.pts)),
  0,
);
export const TOTAL_RAW_MAX_POINTS = FOUNDATION_MAX_POINTS + CHOICE_MAX_POINTS;

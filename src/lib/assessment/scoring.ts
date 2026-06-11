// ─────────────────────────────────────────────────────────────────
// Assessment scoring — pure functions, no DOM/Firebase dependencies.
// Edit src/config/assessment.ts to change questions/weights, not this file.
// ─────────────────────────────────────────────────────────────────

import {
  CHOICE_QUESTIONS,
  FOUNDATION_POINTS_PER_ITEM,
  SCORE_BANDS,
  TOTAL_RAW_MAX_POINTS,
  type ScoreBand,
} from "../../config/assessment";

export interface ScoringInput {
  /** Indices (0-based) of checked Step 1 checkpoints. */
  checkedIndexes: number[];
  /** Map of question index (11-15) -> selected option index. */
  choiceAnswers: Record<number, number>;
}

export interface ScoringResult {
  /** Final score scaled to 0-100. */
  score: number;
  band: ScoreBand;
}

/** Calculates the 0-100 score and matching band/insights. */
export function calculateScore({ checkedIndexes, choiceAnswers }: ScoringInput): ScoringResult {
  const checklistScore = checkedIndexes.length * FOUNDATION_POINTS_PER_ITEM;

  let choiceScore = 0;
  for (const q of CHOICE_QUESTIONS) {
    const ansIdx = choiceAnswers[q.index];
    if (ansIdx !== undefined) {
      choiceScore += q.options[ansIdx]?.pts ?? 0;
    }
  }

  const score = Math.round(((checklistScore + choiceScore) / TOTAL_RAW_MAX_POINTS) * 100);
  const band = SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BANDS[0];

  return { score, band };
}

/** Maps a 0-100 score to the gauge needle angle (-90deg to +90deg). */
export function scoreToNeedleAngle(score: number): number {
  return -90 + (score / 100) * 180;
}

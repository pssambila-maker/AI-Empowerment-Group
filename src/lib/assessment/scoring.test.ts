import { describe, it, expect } from "vitest";
import { calculateScore, scoreToNeedleAngle } from "./scoring";
import { CHOICE_QUESTIONS } from "../../config/assessment";

describe("calculateScore", () => {
  it("scores 0 when nothing is answered", () => {
    const { score, band } = calculateScore({ checkedIndexes: [], choiceAnswers: {} });
    expect(score).toBe(0);
    expect(band.category).toBe("needs-attention");
  });

  it("scores 100 when every checklist item is checked and every choice question picks the top option", () => {
    const allChecked = Array.from({ length: 10 }, (_, i) => i);
    const topChoiceAnswers = Object.fromEntries(
      CHOICE_QUESTIONS.map((q) => [q.index, q.options.length - 1]),
    );
    const { score, band } = calculateScore({ checkedIndexes: allChecked, choiceAnswers: topChoiceAnswers });
    expect(score).toBe(100);
    expect(band.category).toBe("high-performer");
  });

  it("only counts points for questions that were actually answered", () => {
    // Answer only the first choice question, at its 3rd option (index 2).
    const firstQuestion = CHOICE_QUESTIONS[0];
    const { score } = calculateScore({
      checkedIndexes: [],
      choiceAnswers: { [firstQuestion.index]: 2 },
    });
    const expectedPts = firstQuestion.options[2].pts;
    const totalMax =
      10 * 4 + CHOICE_QUESTIONS.reduce((max, q) => max + Math.max(...q.options.map((o) => o.pts)), 0);
    expect(score).toBe(Math.round((expectedPts / totalMax) * 100));
  });

  it("resolves the exact band boundary (score 40) to the first matching band in array order", () => {
    // Documents actual current behavior: bands use an inclusive `<=` check on
    // both ends, so a boundary score matches two bands' ranges; .find() takes
    // whichever is listed first (needs-attention, since it's declared before
    // on-track). If SCORE_BANDS' ordering or comparison ever changes, this
    // test should be updated deliberately, not silently pass with a different meaning.
    const checkedForBoundary: number[] = [];
    // Reconstruct inputs that land exactly on score 40 by checking foundation
    // items only (4 pts each) until the total points cross the 40% mark.
    for (let i = 0; i < 10; i++) {
      checkedForBoundary.push(i);
      const { score } = calculateScore({ checkedIndexes: checkedForBoundary, choiceAnswers: {} });
      if (score === 40) break;
    }
    const { score, band } = calculateScore({ checkedIndexes: checkedForBoundary, choiceAnswers: {} });
    expect(score).toBe(40);
    expect(band.category).toBe("needs-attention");
  });

  it("never produces a score outside 0-100", () => {
    const allChecked = Array.from({ length: 10 }, (_, i) => i);
    const topChoiceAnswers = Object.fromEntries(
      CHOICE_QUESTIONS.map((q) => [q.index, q.options.length - 1]),
    );
    const { score: maxScore } = calculateScore({ checkedIndexes: allChecked, choiceAnswers: topChoiceAnswers });
    const { score: minScore } = calculateScore({ checkedIndexes: [], choiceAnswers: {} });
    expect(maxScore).toBeLessThanOrEqual(100);
    expect(minScore).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreToNeedleAngle", () => {
  it("maps 0 to -90 degrees, 50 to 0 degrees, and 100 to +90 degrees", () => {
    expect(scoreToNeedleAngle(0)).toBe(-90);
    expect(scoreToNeedleAngle(50)).toBe(0);
    expect(scoreToNeedleAngle(100)).toBe(90);
  });
});

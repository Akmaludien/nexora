import type { InterviewQuestion, BlueprintAnalysis } from "./blueprint";

/**
 * Adaptive interview state machine.
 *
 * Phase 1 goal: drive the wizard interview dynamically instead of a fixed
 * linear list. The engine decides which questions still need answers based on
 * the analysis + answers so far, and can skip questions whose answers are
 * implied by earlier ones.
 *
 * ponytail: currently selection-based (recommended option). Later phases can
 * upgrade to free-form "missing information" probing (SpecKit-style) without
 * changing the public surface below.
 */
export interface InterviewState {
  /** questions presented so far, in order */
  asked: string[];
  /** remaining question ids, in recommended order */
  pending: string[];
  /** answers keyed by question id (option id or custom text) */
  answers: Record<string, string>;
  /** whether the interview is complete */
  complete: boolean;
  /** progress 0..1 */
  progress: number;
}

export interface InterviewConfig {
  /** max questions to ask before forcing completion (YAGNI guard) */
  maxQuestions?: number;
}

const DEFAULT_MAX = 12;

/**
 * Order questions by category relevance for the analysis, and build the
 * initial interview state. Questions whose recommended answer is implied by
 * the analysis (e.g. compliance for internal tools) are pushed to the end or
 * skipped when maxQuestions is exceeded.
 */
export function createInterview(
  analysis: BlueprintAnalysis,
  questions: InterviewQuestion[],
  config: InterviewConfig = {},
): InterviewState {
  const max = config.maxQuestions ?? DEFAULT_MAX;

  // Rank: business/data/auth first, compliance/integrations last.
  const rank: Record<string, number> = {
    business: 0,
    data: 1,
    auth: 2,
    architecture: 3,
    integrations: 4,
    compliance: 5,
  };
  const ordered = [...questions].sort(
    (a, b) => (rank[a.category] ?? 9) - (rank[b.category] ?? 9),
  );

  const ids = ordered.map((q) => q.id);
  // Truncate to max but always keep at least one.
  const pending = ids.slice(0, Math.max(1, max));
  const complete = pending.length === 0;

  return {
    asked: [],
    pending,
    answers: {},
    complete,
    progress: complete ? 1 : 0,
  };
}

/**
 * Answer the next question and advance the interview. Returns a new state.
 * If the question id is unknown or already answered, the state is returned
 * unchanged (idempotent).
 */
export function answerQuestion(
  state: InterviewState,
  questionId: string,
  value: string,
): InterviewState {
  if (state.complete) return state;
  if (!state.pending.includes(questionId)) return state;

  const answers = { ...state.answers, [questionId]: value };
  const asked = [...state.asked, questionId];
  const pending = state.pending.filter((id) => id !== questionId);
  const complete = pending.length === 0;
  const total = state.asked.length + state.pending.length;
  const answeredCount = Object.keys(answers).length;

  return {
    asked,
    pending,
    answers,
    complete,
    progress: total > 0 ? Math.min(1, answeredCount / total) : 1,
  };
}

/**
 * Skip the current question (mark as answered with the recommended option if
 * available, otherwise with an empty string). Useful for "quick fill" UX.
 */
export function skipQuestion(
  state: InterviewState,
  questionId: string,
  questions: InterviewQuestion[],
): InterviewState {
  if (!state.pending.includes(questionId)) return state;
  const q = questions.find((item) => item.id === questionId);
  const recommended = q?.options.find((o) => o.recommended)?.id ?? q?.options[0]?.id ?? "";
  return answerQuestion(state, questionId, recommended);
}

/** Answers are ready when every pending question has been answered. */
export function isInterviewReady(state: InterviewState): boolean {
  return state.complete;
}

/**
 * Build the answers record that generation consumes. Any question still
 * unanswered gets its recommended option (safe default), so downstream
 * generation never sees a missing key.
 */
export function resolveAnswers(
  state: InterviewState,
  questions: InterviewQuestion[],
): Record<string, string> {
  const out = { ...state.answers };
  for (const q of questions) {
    if (out[q.id] === undefined) {
      out[q.id] = q.options.find((o) => o.recommended)?.id ?? q.options[0]?.id ?? "";
    }
  }
  return out;
}

import { describe, it, expect } from "vitest";
import {
  createInterview,
  answerQuestion,
  skipQuestion,
  isInterviewReady,
  resolveAnswers,
} from "./interview";
import type { InterviewQuestion, BlueprintAnalysis } from "./blueprint";

const analysis: BlueprintAnalysis = {
  projectName: "Test",
  domain: "ecommerce",
  targetScale: "startup",
  complexity: "MEDIUM",
  roles: ["owner"],
  coreModules: ["catalog"],
  suggestedDocTypes: [],
  summary: "",
};

const questions: InterviewQuestion[] = [
  {
    id: "auth-strategy",
    category: "auth",
    question: "Auth?",
    context: "",
    options: [
      { id: "jwt", label: "JWT", description: "Token-based", recommended: true },
      { id: "session", label: "Session", description: "Cookie session" },
    ],
  },
  {
    id: "data-persistence",
    category: "data",
    question: "Data?",
    context: "",
    options: [
      { id: "postgres", label: "Postgres", description: "Relational", recommended: true },
      { id: "mysql", label: "MySQL", description: "Relational" },
    ],
  },
  {
    id: "compliance-security",
    category: "compliance",
    question: "Compliance?",
    context: "",
    options: [
      { id: "none", label: "None", description: "No compliance", recommended: true },
      { id: "gdpr", label: "GDPR", description: "EU privacy" },
    ],
  },
];

describe("interview state machine", () => {
  it("orders categories (data/auth before compliance)", () => {
    const s = createInterview(analysis, questions);
    expect(s.pending[0]).toBe("data-persistence");
    expect(s.pending[1]).toBe("auth-strategy");
    expect(s.pending[2]).toBe("compliance-security");
    expect(s.complete).toBe(false);
    expect(s.progress).toBe(0);
  });

  it("answers advance state and complete at the end", () => {
    let s = createInterview(analysis, questions);
    s = answerQuestion(s, "data-persistence", "postgres");
    expect(s.asked).toEqual(["data-persistence"]);
    expect(s.complete).toBe(false);
    s = answerQuestion(s, "auth-strategy", "jwt");
    s = answerQuestion(s, "compliance-security", "none");
    expect(s.complete).toBe(true);
    expect(isInterviewReady(s)).toBe(true);
    expect(s.progress).toBe(1);
  });

  it("ignores unknown or duplicate answers (idempotent)", () => {
    let s = createInterview(analysis, questions);
    s = answerQuestion(s, "nope", "x");
    expect(s.asked).toEqual([]);
    s = answerQuestion(s, "data-persistence", "postgres");
    s = answerQuestion(s, "data-persistence", "mysql");
    expect(s.answers["data-persistence"]).toBe("postgres");
  });

  it("skipQuestion applies recommended option", () => {
    let s = createInterview(analysis, questions);
    s = skipQuestion(s, "compliance-security", questions);
    expect(s.answers["compliance-security"]).toBe("none");
  });

  it("resolveAnswers fills unanswered with recommended", () => {
    let s = createInterview(analysis, questions);
    s = answerQuestion(s, "data-persistence", "postgres");
    const out = resolveAnswers(s, questions);
    expect(out["data-persistence"]).toBe("postgres");
    expect(out["auth-strategy"]).toBe("jwt");
    expect(out["compliance-security"]).toBe("none");
  });

  it("maxQuestions truncates the interview", () => {
    const s = createInterview(analysis, questions, { maxQuestions: 2 });
    expect(s.pending.length).toBe(2);
    expect(s.pending).not.toContain("compliance-security");
  });
});

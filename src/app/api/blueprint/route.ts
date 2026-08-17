import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  analyzeConcept,
  getAdaptiveInterviewQuestions,
  getRecommendedTechStack,
  generateBlueprintDocuments,
} from "@/lib/blueprint";
import { createProjectFromBlueprint } from "@/lib/project-repository";
import { createInterview, answerQuestion, resolveAnswers } from "@/lib/interview";
import type { Complexity } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "analyze") {
      const idea = String(body.idea || "").trim();
      if (!idea) return NextResponse.json({ error: "Idea prompt is required" }, { status: 400 });
      const language = (body.language === "EN" ? "EN" : "ID") as "ID" | "EN";
      const scale = (body.scale || "startup") as "mvp" | "startup" | "enterprise";
      const analysis = await analyzeConcept(idea, language, scale);
      return NextResponse.json({ ok: true, analysis });
    }

    if (action === "questions") {
      const analysis = body.analysis;
      if (!analysis) return NextResponse.json({ error: "Analysis data is required" }, { status: 400 });
      const language = (body.language === "EN" ? "EN" : "ID") as "ID" | "EN";
      const questions = getAdaptiveInterviewQuestions(analysis, language);
      return NextResponse.json({ ok: true, questions });
    }

    if (action === "interview") {
      const { analysis, answers, language } = body;
      if (!analysis) return NextResponse.json({ error: "Analysis data is required" }, { status: 400 });
      const lang = (language === "EN" ? "EN" : "ID") as "ID" | "EN";
      const questions = getAdaptiveInterviewQuestions(analysis, lang);
      // Client sends { answers: { qid: value } }; server drives the state.
      const base = createInterview(analysis, questions);
      let state = base;
      for (const [qid, value] of Object.entries(answers || {})) {
        state = answerQuestion(state, qid, String(value));
      }
      const ready = resolveAnswers(state, questions);
      return NextResponse.json({ ok: true, questions, state, answers: ready });
    }

    if (action === "stack") {
      const { analysis, answers, language } = body;
      if (!analysis) return NextResponse.json({ error: "Analysis data is required" }, { status: 400 });
      const lang = (language === "EN" ? "EN" : "ID") as "ID" | "EN";
      const stack = getRecommendedTechStack(analysis, answers || {}, lang);
      return NextResponse.json({ ok: true, stack });
    }

    if (action === "generate") {
      const { projectName, description, complexity, techStack, answers, language } = body;
      if (!projectName) return NextResponse.json({ error: "Project name is required" }, { status: 400 });
      const lang = (language === "EN" ? "EN" : "ID") as "ID" | "EN";
      const blueprint = generateBlueprintDocuments({
        projectName,
        description: description || "",
        complexity: (complexity || "MEDIUM") as Complexity,
        techStack: techStack || getRecommendedTechStack({ projectName, domain: "General", targetScale: "startup", complexity: "MEDIUM", roles: [], coreModules: [], suggestedDocTypes: [], summary: "" }, {}, lang),
        answers: answers || {},
        language: lang,
      });
      return NextResponse.json({ ok: true, blueprint });
    }

    if (action === "create-project") {
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json({ error: "Authentication required to create a project" }, { status: 401 });
      }

      const { name, description, complexity, documents, relationships } = body;
      if (!name || !documents || !Array.isArray(documents)) {
        return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
      }

      const result = await createProjectFromBlueprint(session.userId, {
        name,
        description: description || "",
        complexity: (complexity || "MEDIUM") as Complexity,
        documents,
        relationships: relationships || [],
      });

      return NextResponse.json({ ok: true, projectKey: result.key, projectId: result.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

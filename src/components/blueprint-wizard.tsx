"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Layers,
  Cpu,
  Database,
  Shield,
  Palette,
  FileCode,
  Flame,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type {
  BlueprintAnalysis,
  InterviewQuestion,
  TechStack,
  GeneratedBlueprint,
  GeneratedDocument,
} from "@/lib/blueprint";

interface Props {
  initialLanguage?: "ID" | "EN";
}

export function BlueprintWizard({ initialLanguage = "ID" }: Props) {
  const router = useRouter();

  // Wizard Flow State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [language, setLanguage] = useState<"ID" | "EN">(initialLanguage);
  const [idea, setIdea] = useState("");
  const [scale, setScale] = useState<"mvp" | "startup" | "enterprise">("startup");

  // Step 1: Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BlueprintAnalysis | null>(null);

  // Step 2: Adaptive Interview
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Step 3: Tech Stack
  const [techStack, setTechStack] = useState<TechStack | null>(null);
  const [customizingItem, setCustomizingItem] = useState<string | null>(null);

  // Step 4: Live Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<GeneratedBlueprint | null>(null);
  const [docStatuses, setDocStatuses] = useState<Record<string, "QUEUED" | "PROCESSING" | "READY">>({});
  const [generationProgress, setGenerationProgress] = useState(0);
  const [countdown, setCountdown] = useState(6);
  const [createdProjectKey, setCreatedProjectKey] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const isID = language === "ID";

  // Step 1: Run AI Architect Analysis
  async function handleAnalyze() {
    if (!idea.trim()) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "analyze", idea, language, scale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAnalysis(data.analysis);

      // Fetch questions
      const qRes = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "questions", analysis: data.analysis, language }),
      });
      const qData = await qRes.json();
      if (qRes.ok && qData.questions) {
        setQuestions(qData.questions);
        // Pre-fill with recommended defaults
        const defaults: Record<string, string> = {};
        for (const q of qData.questions) {
          const rec = q.options.find((o: { recommended?: boolean }) => o.recommended) || q.options[0];
          if (rec) defaults[q.id] = rec.id;
        }
        setAnswers(defaults);
      }

      // Fetch recommended tech stack — adaptive to interview answers
      const sRes = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "stack",
          analysis: data.analysis,
          answers: qData.ok ? qData.questions ? Object.fromEntries(
            qData.questions.map((q: InterviewQuestion) => [
              q.id,
              q.options.find((o) => o.recommended)?.id ?? q.options[0]?.id ?? "",
            ])
          ) : {} : {},
          language,
        }),
      });
      const sData = await sRes.json();
      if (sRes.ok && sData.stack) {
        setTechStack(sData.stack);
      }

      setStep(2);
      setCurrentQuestionIdx(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing concept");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Quick fill all remaining questions
  function handleQuickFill() {
    if (!questions.length) return;
    const filled = { ...answers };
    for (const q of questions) {
      if (!filled[q.id]) {
        const rec = q.options.find((o) => o.recommended) || q.options[0];
        if (rec) filled[q.id] = rec.id;
      }
    }
    setAnswers(filled);
    setStep(3);
  }

  // Step 4: Live Generation Simulation and DB save
  async function handleStartGeneration() {
    if (!analysis || !techStack) return;

    // Auth check before spending generation — create-project requires a session.
    try {
      const authRes = await fetch("/api/auth/session", { method: "GET" });
      if (!authRes.ok) {
        router.push("/login?next=/blueprint");
        return;
      }
    } catch {
      router.push("/login?next=/blueprint");
      return;
    }

    setStep(4);
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setCountdown(6);

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          projectName: analysis.projectName,
          description: idea,
          complexity: analysis.complexity,
          techStack,
          answers,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const blueprint: GeneratedBlueprint = data.blueprint;
      setGeneratedBlueprint(blueprint);

      // Initialize all docs as QUEUED
      const initialStatuses: Record<string, "QUEUED" | "PROCESSING" | "READY"> = {};
      for (const doc of blueprint.documents) {
        initialStatuses[doc.key] = "QUEUED";
      }
      setDocStatuses(initialStatuses);

      // Animate documents step-by-step
      const totalDocs = blueprint.documents.length;
      for (let i = 0; i < totalDocs; i++) {
        const currentDoc = blueprint.documents[i];

        // Set to processing
        setDocStatuses((prev) => ({ ...prev, [currentDoc.key]: "PROCESSING" }));
        await new Promise((r) => setTimeout(r, 600));

        // Set to ready
        setDocStatuses((prev) => ({ ...prev, [currentDoc.key]: "READY" }));
        setGenerationProgress(Math.round(((i + 1) / totalDocs) * 100));
        setCountdown((c) => Math.max(c - 1, 0));
      }

      // Persist to database
      const saveRes = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create-project",
          name: blueprint.name,
          description: blueprint.description,
          complexity: blueprint.complexity,
          documents: blueprint.documents,
          relationships: blueprint.relationships,
        }),
      });
      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.projectKey) {
        setCreatedProjectKey(saveData.projectKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed during live generation");
    } finally {
      setIsGenerating(false);
    }
  }

  const currentQ = questions[currentQuestionIdx];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      {/* Wizard Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent, #6366f1)", fontWeight: 600, fontSize: 13 }}>
            <Sparkles size={16} />
            <span>NEXORA AI ARCHITECT</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>
            {isID ? "Blueprint Wizard End-to-End" : "End-to-End Blueprint Wizard"}
          </h1>
        </div>

        {/* Language toggle */}
        <div style={{ display: "flex", background: "var(--surface, #1e2029)", padding: 4, borderRadius: 8, border: "1px solid var(--border, #2d3139)" }}>
          <button
            type="button"
            className={`btn ${language === "ID" ? "btn-primary" : "btn-quiet"}`}
            style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={() => setLanguage("ID")}
          >
            🇮🇩 ID
          </button>
          <button
            type="button"
            className={`btn ${language === "EN" ? "btn-primary" : "btn-quiet"}`}
            style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={() => setLanguage("EN")}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>

      {/* Progress Steps Indicator */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 32 }}>
        {[
          { num: 1, title: isID ? "1. AI Architect" : "1. AI Architect" },
          { num: 2, title: isID ? "2. Wawancara Adaptif" : "2. Adaptive Interview" },
          { num: 3, title: isID ? "3. Tech Stack" : "3. Tech Stack" },
          { num: 4, title: isID ? "4. Generasi Live" : "4. Live Generation" },
        ].map((s) => (
          <div
            key={s.num}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${step === s.num ? "var(--accent, #6366f1)" : step > s.num ? "var(--success, #10b981)" : "var(--border, #2d3139)"}`,
              background: step === s.num ? "rgba(99, 102, 241, 0.1)" : "var(--surface, #181a20)",
              color: step === s.num ? "var(--accent, #818cf8)" : step > s.num ? "var(--success, #34d399)" : "var(--subtle, #9ca3af)",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {step > s.num ? <CheckCircle2 size={14} /> : <span>{s.num}.</span>}
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title.split(". ")[1]}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--danger, #ef4444)", color: "var(--danger, #fca5a5)", borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* STEP 1: AI Architect Concept Analysis */}
      {step === 1 && (
        <div className="sheet" style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border, #2d3139)", background: "var(--surface, #181a20)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Bot size={20} color="var(--accent, #6366f1)" />
            {isID ? "Deskripsikan Ide / Solusi Anda" : "Describe Your Product Concept"}
          </h2>
          <p style={{ color: "var(--subtle, #9ca3af)", fontSize: 14, marginBottom: 16 }}>
            {isID
              ? "AI Architect akan mendeteksi domain, persona pengguna, kompleksitas arsitektur, dan menyusun spesifikasi dokumen otomatis."
              : "AI Architect analyzes your problem domain, user roles, system complexity, and configures an optimal architectural spec set."}
          </p>

          <textarea
            aria-label="Idea concept input"
            rows={5}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={
              isID
                ? "Contoh: Buat platform e-commerce B2B grosir dengan manajemen multi-toko, integrasi pembayaran Midtrans QRIS/VA, sistem penagihan invoice otomatis, dan dashboard analitik penjualan real-time."
                : "e.g. A multi-tenant B2B wholesale platform with store management, Midtrans payment gateway integration, automated invoice reconciliation, and real-time sales telemetry."
            }
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border, #374151)",
              background: "var(--bg, #0f1117)",
              color: "var(--ink, #f3f4f6)",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: 16,
            }}
          />

          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--subtle, #9ca3af)", display: "block", marginBottom: 6 }}>
                {isID ? "Skala Proyek" : "Target Scale"}
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "mvp", label: "MVP (4 docs)" },
                  { id: "startup", label: "Startup (8 docs)" },
                  { id: "enterprise", label: "Enterprise (15+ docs)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn ${scale === s.id ? "btn-primary" : "btn-quiet"}`}
                    style={{ fontSize: 12 }}
                    onClick={() => setScale(s.id as "mvp" | "startup" | "enterprise")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isAnalyzing || !idea.trim()}
              onClick={handleAnalyze}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{isID ? "Menganalisis Arsitektur..." : "Analyzing Architecture..."}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{isID ? "Analisis dengan AI Architect" : "Analyze with AI Architect"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Adaptive AI Interview */}
      {step === 2 && currentQ && (
        <div className="sheet" style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border, #2d3139)", background: "var(--surface, #181a20)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent, #818cf8)", textTransform: "uppercase", letterSpacing: 1 }}>
              {isID ? `Pertanyaan ${currentQuestionIdx + 1} dari ${questions.length}` : `Question ${currentQuestionIdx + 1} of ${questions.length}`}
            </div>
            <button
              type="button"
              className="btn btn-quiet"
              style={{ fontSize: 12 }}
              onClick={handleQuickFill}
            >
              <Flame size={14} color="var(--warning, #f59e0b)" />
              <span>{isID ? "Isi Otomatis Rekomendasi (Cepat)" : "Auto-Fill Recommended"}</span>
            </button>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{currentQ.question}</h2>
          <p style={{ color: "var(--subtle, #9ca3af)", fontSize: 13, marginBottom: 20 }}>{currentQ.context}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setAnswers({ ...answers, [currentQ.id]: opt.id })}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? "var(--accent, #6366f1)" : "var(--border, #2d3139)"}`,
                    background: isSelected ? "rgba(99, 102, 241, 0.12)" : "var(--bg, #0f1117)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: isSelected ? "var(--ink, #fff)" : "var(--ink, #e5e7eb)" }}>
                      {opt.label}
                    </span>
                    {opt.recommended && (
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(16, 185, 129, 0.2)", color: "var(--success, #34d399)", borderRadius: 12, fontWeight: 600 }}>
                        {isID ? "Rekomendasi" : "Recommended"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--subtle, #9ca3af)" }}>{opt.description}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                if (currentQuestionIdx > 0) setCurrentQuestionIdx(currentQuestionIdx - 1);
                else setStep(1);
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowLeft size={16} />
              <span>{isID ? "Kembali" : "Back"}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (currentQuestionIdx < questions.length - 1) {
                  setCurrentQuestionIdx(currentQuestionIdx + 1);
                } else {
                  setStep(3);
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>{currentQuestionIdx === questions.length - 1 ? (isID ? "Tinjau Tech Stack" : "Review Tech Stack") : (isID ? "Lanjut" : "Next")}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Tech Stack Recommendation & Customization */}
      {step === 3 && techStack && (
        <div className="sheet" style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border, #2d3139)", background: "var(--surface, #181a20)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {isID ? "Rekomendasi Tech Stack Terstruktur" : "Structured Tech Stack Recommendation"}
              </h2>
              <p style={{ color: "var(--subtle, #9ca3af)", fontSize: 13, margin: "4px 0 0" }}>
                {isID
                  ? "Diselaraskan dengan arsitektur, database, dan kebutuhan AI coding agent."
                  : "Synthesized for clean architecture, database constraints, and AI coding agent execution."}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartGeneration}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Sparkles size={16} />
              <span>{isID ? "Terima & Mulai Generasi Dokumen" : "Accept & Generate Docs"}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { cat: "Frontend", item: techStack.frontend, icon: Layers },
              { cat: "Backend", item: techStack.backend, icon: Cpu },
              { cat: "Database", item: techStack.database, icon: Database },
              { cat: "Auth", item: techStack.auth, icon: Shield },
              { cat: "Styling", item: techStack.styling, icon: Palette },
              { cat: "Testing", item: techStack.testing, icon: FileCode },
              { cat: "Deployment", item: techStack.deployment, icon: Flame },
            ].map(({ cat, item, icon: Icon }) => (
              <div
                key={cat}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid var(--border, #2d3139)",
                  background: "var(--bg, #0f1117)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--accent, #818cf8)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                  <Icon size={16} />
                  <span>{cat}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink, #fff)", marginBottom: 4 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--subtle, #9ca3af)", lineHeight: 1.4 }}>
                  {item.rationale}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setStep(2)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowLeft size={16} />
              <span>{isID ? "Ubah Jawaban Wawancara" : "Modify Interview"}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartGeneration}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px" }}
            >
              <Sparkles size={16} />
              <span>{isID ? "Mulai Generasi Dokumen Live" : "Start Live Generation"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Live Generation Status */}
      {step === 4 && (
        <div className="sheet" style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border, #2d3139)", background: "var(--surface, #181a20)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {isGenerating
                  ? (isID ? "Sedang Menghasilkan Dokumen Arsitektur..." : "Generating Architectural Documents...")
                  : (isID ? "Generasi Dokumen Selesai!" : "Document Generation Complete!")}
              </h2>
              <p style={{ color: "var(--subtle, #9ca3af)", fontSize: 13, margin: "4px 0 0" }}>
                {isGenerating
                  ? (isID ? `Perkiraan sisa waktu: ~${countdown} detik` : `Estimated remaining time: ~${countdown}s`)
                  : (isID ? "Seluruh spesifikasi siap diimplementasikan dan disimpan dalam basis data." : "All specifications are validated and persisted into the database.")}
              </p>
            </div>

            {createdProjectKey && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push(`/projects/${createdProjectKey}/blueprint`)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}
              >
                <span>{isID ? "Buka di Workspace 3-Panel" : "Open 3-Panel Workspace"}</span>
                <ExternalLink size={16} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: 8, background: "var(--border, #2d3139)", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
            <div
              style={{
                width: `${generationProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent, #6366f1), var(--success, #10b981))",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Document Queue Status List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {generatedBlueprint?.documents.map((doc) => {
              const status = docStatuses[doc.key] || "QUEUED";
              return (
                <div
                  key={doc.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #2d3139)",
                    background: "var(--bg, #0f1117)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="mono" style={{ fontSize: 12, padding: "2px 6px", background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                      {doc.key}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink, #fff)" }}>{doc.title}</div>
                      {status === "READY" && (
                        <div style={{ fontSize: 12, color: "var(--subtle, #9ca3af)" }}>
                          {doc.stats.sections} sections · {doc.stats.endpoints} endpoints · {doc.stats.models} models · {doc.stats.words} words
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {status === "QUEUED" && (
                      <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--subtle, #9ca3af)" }}>
                        <Clock size={14} />
                        <span>{isID ? "Antre" : "Queued"}</span>
                      </span>
                    )}
                    {status === "PROCESSING" && (
                      <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--accent, #818cf8)", fontWeight: 600 }}>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{isID ? "Memproses..." : "Processing..."}</span>
                      </span>
                    )}
                    {status === "READY" && (
                      <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--success, #34d399)", fontWeight: 600 }}>
                        <Check size={16} />
                        <span>{isID ? "Siap" : "Ready"}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

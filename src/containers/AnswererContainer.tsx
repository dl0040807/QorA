"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SpinDrum, { type SpinItem } from "@/components/SpinDrum";
import type { AnswererLightProfile } from "@/lib/supabase/types";
import { supabase } from "@/lib/supabase/client";

type Step = "preference" | "matching" | "pick" | "compose" | "submitting" | "done";

interface RankedConcern {
  concern_id: string;
  score: number;
  reason: string;
  content: string;
  category: string;
  answer_count: number;
}

const AGE_GROUPS = ["10s", "20s", "30s", "40s", "50s+"];

interface AnswererContainerProps {
  /** Pre-selected concern when arriving from a shared link */
  prefillConcernId?: string;
  prefillContent?: string;
  prefillCategory?: string;
}

/* ── Shared layout shell ─────────────────────────────────────────── */
function Shell({
  children,
  onBack,
  backLabel = "← Back",
}: {
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {onBack ? (
          <button
            onClick={onBack}
            style={{
              fontSize: "12px",
              color: "var(--ink-4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.04em",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            {backLabel}
          </button>
        ) : (
          <Link
            href="/"
            style={{
              fontSize: "12px",
              color: "var(--ink-4)",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            ← Q or A
          </Link>
        )}
      </nav>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "40px 24px 48px",
          maxWidth: "560px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Eyebrow label ───────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "11px",
        letterSpacing: "0.16em",
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--ink-4)",
        marginBottom: "16px",
      }}
    >
      {children}
    </p>
  );
}

/* ── Section headline ────────────────────────────────────────────── */
function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: "clamp(36px, 8vw, 56px)",
        fontWeight: 900,
        lineHeight: 1.0,
        letterSpacing: "-0.03em",
        color: "var(--ink)",
        marginBottom: "32px",
      }}
    >
      {children}
    </h1>
  );
}

/* ── Primary button ──────────────────────────────────────────────── */
function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        borderRadius: "4px",
        background: "var(--ink)",
        color: "var(--accent-fg)",
        border: "none",
        padding: "16px",
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        fontFamily: "inherit",
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

/* ── Concern card ────────────────────────────────────────────────── */
function ConcernCard({
  category,
  content,
  footer,
  onClick,
}: {
  category?: string;
  content: string;
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && onClick ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s",
      }}
    >
      {category && (
        <p
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink-4)",
            marginBottom: "8px",
          }}
        >
          {category}
        </p>
      )}
      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.7,
          color: "var(--ink-2)",
        }}
      >
        {content}
      </p>
      {footer && (
        <div style={{ marginTop: "10px" }}>{footer}</div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AnswererContainer({
  prefillConcernId,
  prefillContent,
  prefillCategory,
}: AnswererContainerProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(prefillConcernId ? "compose" : "preference");
  const [preference, setPreference] = useState("");
  const [rankings, setRankings] = useState<RankedConcern[]>([]);
  const [selectedConcern, setSelectedConcern] = useState<RankedConcern | null>(
    prefillConcernId
      ? {
          concern_id: prefillConcernId,
          score: 100,
          reason: "",
          content: prefillContent ?? "",
          category: prefillCategory ?? "",
          answer_count: 0,
        }
      : null,
  );
  const [profile, setProfile] = useState<AnswererLightProfile>({});
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");
  const [answererSessionId, setAnswerSessionId] = useState("");
  const [submittedAnswerId, setSubmittedAnswerId] = useState("");

  // Edit answer state
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editAnswerText, setEditAnswerText] = useState("");
  const [editAnswerSaving, setEditAnswerSaving] = useState(false);
  const [editAnswerError, setEditAnswerError] = useState("");
  const [savedAnswerText, setSavedAnswerText] = useState("");

  // Capture/create anonymous session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      let session = data.session;
      if (!session) {
        const { data: newData } = await supabase.auth.signInAnonymously();
        session = newData.session;
      }
      if (session?.user?.id) setAnswerSessionId(session.user.id);
    });
  }, []);

  // ── Spin / random ────────────────────────────────────────────────
  const [spinItems, setSpinItems] = useState<SpinItem[]>([]);
  const [drumVisible, setDrumVisible] = useState(false);
  const [spinLoading, setSpinLoading] = useState(false);
  const spinTriggerRef = useRef<(() => void) | null>(null);

  async function handleSpinClick() {
    setError("");
    setSpinLoading(true);
    try {
      const res = await fetch("/api/answers/random");
      const json = await res.json();
      if (!res.ok || !json.concerns?.length) {
        setError("No concerns available right now. Try again later!");
        setSpinLoading(false);
        return;
      }
      const items = (json.concerns as { id: string; content: string; category: string }[]).map((c) => ({
        id: c.id,
        label: c.content.slice(0, 60) + (c.content.length > 60 ? "…" : ""),
        content: c.content,
        category: c.category,
      }));
      setSpinItems(items);
      setDrumVisible(true);
      setSpinLoading(false);
      // Trigger the spin after the drum mounts — 120ms gives the useEffect time to wire up the ref
      setTimeout(() => spinTriggerRef.current?.(), 120);
    } catch {
      setError("Network error. Please try again.");
      setSpinLoading(false);
    }
  }

  function handleSpinSettle(item: SpinItem) {
    // Small delay so the user can see the drum settle before navigating
    setTimeout(() => {
      setDrumVisible(false);
      setSelectedConcern({
        concern_id: item.id,
        score: 100,
        reason: "Random pick",
        content: item.content,
        category: item.category,
        answer_count: 0,
      });
      setStep("compose");
    }, 600);
  }

  async function handleMatch() {
    setError("");
    if (!preference.trim()) {
      setError("Please describe what kind of concern you want to answer.");
      return;
    }
    setStep("matching");
    try {
      const res = await fetch("/api/answers/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferenceText: preference }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Matching failed.");
        setStep("preference");
        return;
      }
      setRankings(json.rankings ?? []);
      setStep("pick");
    } catch {
      setError("Network error.");
      setStep("preference");
    }
  }

  async function handleSubmitAnswer() {
    setError("");
    if (!selectedConcern) return;
    if (!answerText.trim()) {
      setError("Please enter your answer.");
      return;
    }
    setStep("submitting");
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concern_id: selectedConcern.concern_id,
          answer_text: answerText.trim(),
          answerer_light_profile: profile,
          answerer_session_id: answererSessionId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Submission failed.");
        setStep("compose");
        return;
      }
      setSubmittedAnswerId(json.id ?? "");
      setSavedAnswerText(answerText.trim());
      setStep("done");
    } catch {
      setError("Network error.");
      setStep("compose");
    }
  }

  /* ── Done ─────────────────────────────────────────────────────── */
  if (step === "done") {
    return (
      <Shell>
        <Eyebrow>Answer submitted</Eyebrow>
        <Headline>
          Thank you,
          <br />
          sincerely 🙌
        </Headline>
        <p
          style={{
            fontSize: "15px",
            color: "var(--ink-3)",
            lineHeight: 1.65,
            marginBottom: "28px",
          }}
        >
          Your words could make a real
          <br />
          difference to someone.
        </p>

        {/* Edit submitted answer */}
        {submittedAnswerId && answererSessionId && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "16px 20px",
              marginBottom: "28px",
            }}
          >
            {editingAnswer ? (
              <div>
                <textarea
                  value={editAnswerText}
                  onChange={(e) => setEditAnswerText(e.target.value)}
                  maxLength={1000}
                  rows={5}
                  style={{
                    width: "100%",
                    resize: "none",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "12px",
                    fontSize: "14px",
                    color: "var(--ink)",
                    lineHeight: 1.65,
                    outline: "none",
                    fontFamily: "inherit",
                    marginBottom: "6px",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <p style={{ fontSize: "11px", color: "var(--ink-4)", textAlign: "right", marginBottom: "10px", fontVariantNumeric: "tabular-nums" }}>
                  {editAnswerText.length}/1000
                </p>
                {editAnswerError && (
                  <p style={{ fontSize: "13px", color: "var(--destructive)", marginBottom: "8px" }}>{editAnswerError}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={async () => {
                      setEditAnswerError("");
                      const trimmed = editAnswerText.trim();
                      if (!trimmed) { setEditAnswerError("Please enter your answer."); return; }
                      setEditAnswerSaving(true);
                      try {
                        const res = await fetch(`/api/answers/${submittedAnswerId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ answer_text: trimmed, answererSessionId: answererSessionId }),
                        });
                        const json = await res.json();
                        if (!res.ok) { setEditAnswerError(json.error ?? "Save failed."); return; }
                        setSavedAnswerText(json.answer.answer_text);
                        setEditingAnswer(false);
                      } catch {
                        setEditAnswerError("Network error. Please try again.");
                      } finally {
                        setEditAnswerSaving(false);
                      }
                    }}
                    disabled={editAnswerSaving || !editAnswerText.trim()}
                    style={{
                      flex: 1,
                      borderRadius: "4px",
                      background: "var(--ink)",
                      color: "var(--accent-fg)",
                      border: "none",
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: editAnswerSaving || !editAnswerText.trim() ? "not-allowed" : "pointer",
                      opacity: editAnswerSaving || !editAnswerText.trim() ? 0.45 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {editAnswerSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingAnswer(false); setEditAnswerError(""); }}
                    style={{
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--ink-3)",
                      border: "1px solid var(--border)",
                      padding: "10px 16px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "11px", letterSpacing: "0.12em", fontWeight: 600, textTransform: "uppercase", color: "var(--ink-4)", marginBottom: "8px" }}>
                  Your answer
                </p>
                <p style={{ fontSize: "14px", lineHeight: 1.65, color: "var(--ink-2)", marginBottom: "12px" }}>
                  {savedAnswerText}
                </p>
                <button
                  onClick={() => { setEditAnswerText(savedAnswerText); setEditingAnswer(true); setEditAnswerError(""); }}
                  style={{
                    fontSize: "12px",
                    color: "var(--ink-4)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  Edit answer
                </button>
              </div>
            )}
          </div>
        )}

        <PrimaryBtn onClick={() => router.push("/")}>Back to home</PrimaryBtn>
      </Shell>
    );
  }

  /* ── Compose ─────────────────────────────────────────────────── */
  if (step === "compose" || step === "submitting") {
    const concern = selectedConcern;
    if (!concern) return null;
    return (
      <Shell
        onBack={() => {
          if (!prefillConcernId) setStep("pick");
          else window.history.back();
        }}
      >
        <Eyebrow>Write your answer</Eyebrow>

        {/* The concern */}
        <ConcernCard
          category={concern.category}
          content={concern.content}
        />

        {/* Profile section */}
        <div
          style={{
            marginTop: "28px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--ink-4)",
              marginBottom: "14px",
            }}
          >
            A bit about you (all optional)
          </p>

          {/* Age chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag}
                onClick={() =>
                  setProfile((p) => ({ ...p, age_group: p.age_group === ag ? undefined : ag }))
                }
                style={{
                  borderRadius: "2px",
                  border: `1px solid ${profile.age_group === ag ? "var(--ink)" : "var(--border)"}`,
                  background: profile.age_group === ag ? "var(--ink)" : "transparent",
                  color: profile.age_group === ag ? "var(--accent-fg)" : "var(--ink-3)",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.1s",
                }}
              >
                {ag}
              </button>
            ))}
          </div>

          {/* Occupation + MBTI */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={profile.occupation ?? ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, occupation: e.target.value || undefined }))
              }
              placeholder="Occupation (optional)"
              style={{
                flex: 1,
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                padding: "11px 14px",
                fontSize: "13px",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <input
              value={profile.mbti ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  mbti: e.target.value.toUpperCase() || undefined,
                }))
              }
              placeholder="MBTI"
              maxLength={4}
              style={{
                width: "88px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                padding: "11px 14px",
                fontSize: "13px",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* Answer textarea */}
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={1000}
          rows={6}
          placeholder="Write your honest thoughts freely…"
          style={{
            width: "100%",
            resize: "none",
            borderRadius: "4px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "16px",
            fontSize: "15px",
            color: "var(--ink)",
            lineHeight: 1.65,
            outline: "none",
            fontFamily: "inherit",
            marginBottom: "6px",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <p
          style={{
            textAlign: "right",
            fontSize: "11px",
            color: "var(--ink-4)",
            marginBottom: "20px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {answerText.length}/1000
        </p>

        {error && (
          <p
            style={{
              marginBottom: "12px",
              fontSize: "13px",
              color: "var(--destructive)",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        <PrimaryBtn
          onClick={handleSubmitAnswer}
          disabled={step === "submitting" || !answerText.trim()}
        >
          {step === "submitting" ? "Submitting…" : "Submit answer anonymously"}
        </PrimaryBtn>
      </Shell>
    );
  }

  /* ── Pick ─────────────────────────────────────────────────────── */
  if (step === "pick") {
    return (
      <Shell onBack={() => setStep("preference")}>
        <Eyebrow>Concerns</Eyebrow>
        <h1
          style={{
            fontSize: "clamp(32px, 7vw, 48px)",
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            marginBottom: "28px",
          }}
        >
          Here are some
          <br />
          concerns for you
        </h1>

        {rankings.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--ink-4)", lineHeight: 1.6 }}>
              No concerns are up right now.
              <br />
              Check back later!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rankings.map((r) => (
              <ConcernCard
                key={r.concern_id}
                category={r.category}
                content={r.content.slice(0, 140) + (r.content.length > 140 ? "…" : "")}
                footer={
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-4)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {r.reason} · {r.answer_count} {r.answer_count === 1 ? "answer" : "answers"}
                  </p>
                }
                onClick={() => {
                  setSelectedConcern(r);
                  setStep("compose");
                }}
              />
            ))}
          </div>
        )}
      </Shell>
    );
  }

  /* ── Matching loader ─────────────────────────────────────────── */
  if (step === "matching") {
    return (
      <Shell>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            paddingTop: "80px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.16em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--ink-4)",
            }}
          >
            AI matching…
          </p>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
            }}
          >
            Looking for you
          </p>
        </div>
      </Shell>
    );
  }

  /* ── Preference input ────────────────────────────────────────── */
  return (
    <Shell>
      <Eyebrow>Answer a concern</Eyebrow>
      <Headline>
        What kind of concern
        <br />
        do you want to help with?
      </Headline>

      <p
        style={{
          fontSize: "14px",
          color: "var(--ink-3)",
          lineHeight: 1.65,
          marginBottom: "24px",
        }}
      >
        Describe it freely and AI will match you with the right concern
      </p>

      <textarea
        value={preference}
        onChange={(e) => setPreference(e.target.value)}
        rows={5}
        placeholder="e.g. relationship issues, work stress, career decisions…"
        style={{
          width: "100%",
          resize: "none",
          borderRadius: "4px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "16px",
          fontSize: "15px",
          color: "var(--ink)",
          lineHeight: 1.65,
          outline: "none",
          fontFamily: "inherit",
          marginBottom: "24px",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />

      {error && (
        <p
          style={{
            marginBottom: "12px",
            fontSize: "13px",
            color: "var(--destructive)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      <PrimaryBtn onClick={handleMatch} disabled={!preference.trim()}>
        Find a concern
      </PrimaryBtn>

      {/* ── Divider ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "24px 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink-4)",
          }}
        >
          or
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* ── Spin drum ── */}
      {drumVisible && (
        <div style={{ marginBottom: "16px" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--ink-4)",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            Spinning…
          </p>
          <SpinDrum
            items={spinItems}
            onSettle={handleSpinSettle}
            triggerRef={spinTriggerRef}
          />
        </div>
      )}

      {/* ── Random button ── */}
      <button
        onClick={handleSpinClick}
        disabled={spinLoading || drumVisible}
        style={{
          width: "100%",
          borderRadius: "4px",
          background: "transparent",
          color: spinLoading || drumVisible ? "var(--ink-4)" : "var(--ink)",
          border: "1px solid var(--border)",
          padding: "15px 16px",
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          cursor: spinLoading || drumVisible ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!spinLoading && !drumVisible) e.currentTarget.style.borderColor = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "18px",
            lineHeight: 1,
            animation: spinLoading ? "spin 0.6s linear infinite" : "none",
          }}
        >
          🎲
        </span>
        {spinLoading ? "Loading…" : "Random concern"}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Shell>
  );
}

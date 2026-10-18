"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ShareButton } from "@/components/ShareButton";
import AnswererContainer from "@/containers/AnswererContainer";

interface Perspective {
  label: string;
  percentage: number;
  example_quote: string;
}

interface AnswerItem {
  id: string;
  answer_text: string;
  answerer_light_profile: {
    age_group?: string | null;
    occupation?: string | null;
    mbti?: string | null;
  };
  created_at: string;
}

interface SynthesisData {
  ready: boolean;
  count: number;
  required?: number;
  perspectives?: Perspective[];
  summary?: string;
  answers?: AnswerItem[];
}

interface ConcernData {
  id: string;
  content: string;
  category: string | null;
  asker_session_id: string;
}

const INITIAL_VISIBLE = 5;
const LS_SEEN_PREFIX = "gogo_seen_count_";

function AnswerList({ answers, concernId }: { answers: AnswerItem[]; concernId: string }) {
  const [expanded, setExpanded] = useState(false);

  // Read the previously-seen count once on mount — before we overwrite it
  const [newCount] = useState<number>(() => {
    try {
      const prev = parseInt(localStorage.getItem(LS_SEEN_PREFIX + concernId) ?? "0", 10);
      return Math.max(0, answers.length - prev);
    } catch {
      return 0;
    }
  });

  // Mark all current answers as seen after mount so next visit gets the right baseline
  useEffect(() => {
    try {
      localStorage.setItem(LS_SEEN_PREFIX + concernId, String(answers.length));
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concernId, answers.length]);

  const visible = expanded ? answers : answers.slice(0, INITIAL_VISIBLE);
  const hidden = answers.length - INITIAL_VISIBLE;

  return (
    <div style={{ marginTop: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.16em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink-4)",
            margin: 0,
          }}
        >
          All responses
        </p>
        {newCount > 0 && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "var(--ink)",
              color: "var(--accent-fg)",
              borderRadius: "2px",
              padding: "2px 7px",
            }}
          >
            {newCount} new
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {visible.map((a, i) => {
          const prof = a.answerer_light_profile;
          const meta = [prof.age_group, prof.occupation, prof.mbti].filter(Boolean).join(" · ");
          // answers are newest-first; "new" ones are the first `newCount` entries
          const isNew = i < newCount;
          return (
            <div
              key={a.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${isNew ? "var(--ink)" : "var(--border)"}`,
                borderRadius: "4px",
                padding: "16px 18px",
              }}
            >
              {isNew && (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink)",
                    marginBottom: "8px",
                  }}
                >
                  New
                </span>
              )}
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.7,
                  color: "var(--ink-2)",
                  marginBottom: meta ? "10px" : "0",
                }}
              >
                {a.answer_text}
              </p>
              {meta && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-4)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {meta}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: "12px",
            width: "100%",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "12px",
            fontSize: "13px",
            color: "var(--ink-3)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--ink)";
            e.currentTarget.style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--ink-3)";
          }}
        >
          {expanded ? "Show less ↑" : `Show ${hidden} more response${hidden === 1 ? "" : "s"} ↓`}
        </button>
      )}
    </div>
  );
}

export default function ConcernPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [concern, setConcern] = useState<ConcernData | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
  const [view, setView] = useState<"result" | "answer">("result");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Edit concern state
  const [editingConcern, setEditingConcern] = useState(false);
  const [editConcernText, setEditConcernText] = useState("");
  const [editConcernSaving, setEditConcernSaving] = useState(false);
  const [editConcernError, setEditConcernError] = useState("");

  // Resolve params
  useEffect(() => {
    params.then(({ id: resolvedId }) => setId(resolvedId));
  }, [params]);

  const fetchedRef = useRef(false);

  const fetchData = useCallback(async (currentId: string) => {
    setLoading(true);
    setError("");
    try {
      const [synthRes, concernRes, { data: sessionData }] = await Promise.all([
        fetch(`/api/concerns/${currentId}/synthesis`),
        fetch(`/api/concerns?id=${currentId}`),
        supabase.auth.getSession(),
      ]);
      const synthJson = await synthRes.json();
      if (!synthRes.ok) {
        setError(synthJson.error ?? "Concern not found.");
        return;
      }
      if (concernRes.ok) {
        const cj = await concernRes.json();
        if (cj.concern) {
          setConcern(cj.concern);
          // Check ownership: compare current anon session id with the concern's asker id
          const currentUserId = sessionData?.session?.user?.id;
          if (currentUserId) {
            setSessionId(currentUserId);
            if (cj.concern.asker_session_id === currentUserId) {
              setIsOwner(true);
            }
          }
        }
      }
      setSynthesis(synthJson);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData(id);
  }, [id, fetchData]);

  /* ── Loading ────────────────────────────────────────────────────── */
  if (!id || loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          Loading…
        </p>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: "8px",
            }}
          >
            Concern not found
          </p>
          <p style={{ fontSize: "14px", color: "var(--ink-3)" }}>{error}</p>
        </div>
      </div>
    );
  }

  /* ── Answerer view ──────────────────────────────────────────────── */
  if (view === "answer") {
    return (
      <AnswererContainer
        prefillConcernId={id}
        prefillContent={concern?.content}
        prefillCategory={concern?.category ?? undefined}
      />
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  /* ── Result view ────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
        {concern?.category && (
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.14em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--ink-4)",
            }}
          >
            {concern.category}
          </span>
        )}
      </nav>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "40px 24px 48px",
          maxWidth: "560px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Eyebrow */}
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
          {synthesis?.ready ? "AI synthesis" : "Waiting for answers"}
        </p>

        {/* Concern */}
        {concern && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "20px",
              marginBottom: "32px",
            }}
          >
            {editingConcern ? (
              <div>
                <textarea
                  value={editConcernText}
                  onChange={(e) => setEditConcernText(e.target.value)}
                  maxLength={500}
                  rows={6}
                  style={{
                    width: "100%",
                    resize: "none",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: "12px",
                    fontSize: "15px",
                    color: "var(--ink)",
                    lineHeight: 1.7,
                    outline: "none",
                    fontFamily: "inherit",
                    marginBottom: "8px",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <p style={{ fontSize: "11px", color: "var(--ink-4)", textAlign: "right", marginBottom: "10px", fontVariantNumeric: "tabular-nums" }}>
                  {editConcernText.length}/500
                </p>
                {editConcernError && (
                  <p style={{ fontSize: "13px", color: "var(--destructive)", marginBottom: "8px" }}>{editConcernError}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={async () => {
                      setEditConcernError("");
                      const trimmed = editConcernText.trim();
                      if (!trimmed) { setEditConcernError("Please enter your concern."); return; }
                      setEditConcernSaving(true);
                      try {
                        const res = await fetch(`/api/concerns/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ content: trimmed, askerSessionId: sessionId }),
                        });
                        const json = await res.json();
                        if (!res.ok) { setEditConcernError(json.error ?? "Save failed."); return; }
                        setConcern((prev) => prev ? { ...prev, content: json.concern.content } : prev);
                        setEditingConcern(false);
                      } catch {
                        setEditConcernError("Network error. Please try again.");
                      } finally {
                        setEditConcernSaving(false);
                      }
                    }}
                    disabled={editConcernSaving || !editConcernText.trim()}
                    style={{
                      flex: 1,
                      borderRadius: "4px",
                      background: "var(--ink)",
                      color: "var(--accent-fg)",
                      border: "none",
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: editConcernSaving || !editConcernText.trim() ? "not-allowed" : "pointer",
                      opacity: editConcernSaving || !editConcernText.trim() ? 0.45 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {editConcernSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingConcern(false); setEditConcernError(""); }}
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
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "var(--ink-2)",
                    marginBottom: isOwner ? "12px" : "0",
                  }}
                >
                  {concern.content}
                </p>
                {isOwner && (
                  <button
                    onClick={() => { setEditConcernText(concern.content); setEditingConcern(true); setEditConcernError(""); }}
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
                    Edit question
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Synthesis or waiting */}
        {synthesis?.ready ? (
          <div style={{ marginBottom: "36px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(28px, 6vw, 40px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.0,
                  color: "var(--ink)",
                }}
              >
                {synthesis.count}
                <br />
                {synthesis.count === 1 ? "response" : "responses"} in
              </h2>
            </div>

            {/* Percentage bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>
              {[...(synthesis.perspectives ?? [])].sort((a, b) => b.percentage - a.percentage).map((p, i) => (
                <div key={p.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {p.label}
                    </span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "var(--ink)",
                        letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.percentage}%
                    </span>
                  </div>
                  {/* Bar track */}
                  <div
                    style={{
                      height: "4px",
                      background: "var(--surface-2)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        height: "4px",
                        width: `${p.percentage}%`,
                        background: i === 0 ? "var(--ink)" : "var(--ink-3)",
                        borderRadius: "2px",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--ink-4)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;{p.example_quote}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            {/* Summary */}
            {synthesis.summary && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "20px 20px 18px",
                  borderLeft: "3px solid var(--ink)",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--ink-4)",
                    marginBottom: "10px",
                  }}
                >
                  AI summary
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.75,
                    color: "var(--ink-2)",
                  }}
                >
                  {synthesis.summary}
                </p>
              </div>
            )}

            {/* Individual answer cards */}
            {synthesis.answers && synthesis.answers.length > 0 && (
              <AnswerList answers={synthesis.answers} concernId={id} />
            )}
          </div>
        ) : (
          /* Waiting state */
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "32px 24px",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            <p
              style={{
                fontSize: "clamp(28px, 7vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                marginBottom: "8px",
                lineHeight: 1,
              }}
            >
              {synthesis?.count ?? 0} / {synthesis?.required ?? 3}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ink-3)",
                marginBottom: "16px",
                lineHeight: 1.6,
              }}
            >
              Once {synthesis?.required ?? 3} or more answers arrive,
              <br />
              AI will synthesise them
            </p>
            <button
              onClick={() => { fetchedRef.current = false; fetchData(id); }}
              style={{
                fontSize: "12px",
                color: "var(--ink-4)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontFamily: "inherit",
              }}
            >
              Refresh
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isOwner ? (
            /* Owner: show a notice instead of the answer button */
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>✍️</span>
              <p style={{ fontSize: "13px", color: "var(--ink-3)", lineHeight: 1.5, margin: 0 }}>
                This is your own concern.
                <br />
                Share the link to collect answers from others.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setView("answer")}
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
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Answer this concern
            </button>
          )}

          <ShareButton
            url={shareUrl}
            title="Answer my concern"
            text={`${concern?.content?.slice(0, 80) ?? ""}${(concern?.content?.length ?? 0) > 80 ? "…" : ""}\n\nDrop me your honest take 🙏`}
          />
        </div>
      </div>
    </div>
  );
}

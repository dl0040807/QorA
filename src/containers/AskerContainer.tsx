"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ShareButton } from "@/components/ShareButton";

type Step = "input" | "submitting" | "shared";

const MAX_CHARS = 500;
const LS_KEY = "gogo_my_concerns";

interface StoredConcern {
  id: string;
  content: string;
  category: string;
  created_at: string;
}

/* ── Shared layout shell ─────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
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
      </nav>

      {/* Body */}
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

/* ── Main component ──────────────────────────────────────────────── */
export default function AskerContainer() {
  const [step, setStep] = useState<Step>("input");
  const [content, setContent] = useState("");
  const [userCategory, setUserCategory] = useState("");
  const [error, setError] = useState("");
  const [concernId, setConcernId] = useState("");
  const [category, setCategory] = useState("");
  const [crisisMessage, setCrisisMessage] = useState("");
  const [myConcerns, setMyConcerns] = useState<StoredConcern[]>([]);

  function readLocalConcerns(): StoredConcern[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  function saveLocalConcern(c: StoredConcern) {
    try {
      const existing = readLocalConcerns();
      const updated = [c, ...existing.filter((x) => x.id !== c.id)];
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable — ignore
    }
  }

  async function loadMyConcerns(sessionId: string) {
    // Always start from localStorage so seeded/injected data shows immediately
    const local = readLocalConcerns();
    if (local.length > 0) setMyConcerns(local);

    // Then fetch from DB by real session ID and merge (DB is source of truth)
    try {
      const res = await fetch(`/api/concerns?sessionId=${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        const fetched: StoredConcern[] = (json.concerns ?? []).map(
          (c: { id: string; content: string; category: string | null; created_at: string }) => ({
            id: c.id,
            content: c.content,
            category: c.category ?? "Other",
            created_at: c.created_at,
          }),
        );
        // Merge: DB rows first, then any local-only entries not yet in DB
        const dbIds = new Set(fetched.map((c) => c.id));
        const localOnly = local.filter((c) => !dbIds.has(c.id));
        const merged = [...fetched, ...localOnly];
        if (merged.length > 0) setMyConcerns(merged);
      }
    } catch {
      // network error — already showing local results above
    }
  }

  // Ensure anonymous session exists, then load past concerns
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      let session = data.session;
      if (!session) {
        const { data: newData } = await supabase.auth.signInAnonymously();
        session = newData.session;
      }
      if (session?.user?.id) {
        loadMyConcerns(session.user.id);
      } else {
        setMyConcerns(readLocalConcerns());
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setError("");
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please enter your concern.");
      return;
    }
    if (trimmed.length > MAX_CHARS) {
      setError(`Please keep it under ${MAX_CHARS} characters.`);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setError("Could not load session. Please try again in a moment.");
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          askerSessionId: session.user.id,
          userCategory: userCategory.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Submission failed.");
        setStep("input");
        return;
      }

      if (json.crisis) {
        setCrisisMessage(json.message);
        setStep("input");
        return;
      }

      const newId: string = json.id;
      const newCategory: string = json.category ?? "Other";
      setConcernId(newId);
      setCategory(newCategory);

      // Persist so the user can find it on revisit
      const newConcern: StoredConcern = {
        id: newId,
        content: trimmed,
        category: newCategory,
        created_at: new Date().toISOString(),
      };
      saveLocalConcern(newConcern);
      setMyConcerns((prev) => [newConcern, ...prev.filter((x) => x.id !== newId)]);

      setStep("shared");
    } catch {
      setError("Network error. Please try again.");
      setStep("input");
    }
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/concern/${concernId}` : "";

  /* ── Crisis notice ──────────────────────────────────────────────── */
  if (crisisMessage) {
    return (
      <Shell>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "36px 28px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "28px", marginBottom: "16px" }}>💙</p>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: "12px",
            }}
          >
            It sounds like you&apos;re really struggling right now
          </h2>
          <p
            style={{
              whiteSpace: "pre-line",
              fontSize: "14px",
              lineHeight: 1.7,
              color: "var(--ink-3)",
            }}
          >
            {crisisMessage}
          </p>
          <button
            onClick={() => { setCrisisMessage(""); setContent(""); }}
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "var(--ink-4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Start over
          </button>
        </div>
      </Shell>
    );
  }

  /* ── Shared / success ───────────────────────────────────────────── */
  if (step === "shared") {
    return (
      <Shell>
        {/* Label */}
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.16em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink-4)",
            marginBottom: "20px",
          }}
        >
          Concern posted
        </p>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(32px, 8vw, 52px)",
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            marginBottom: "32px",
          }}
        >
          Share the link
          <br />
          to collect answers
        </h1>

        {/* Concern card */}
        {category && (
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--ink-4)",
              marginBottom: "6px",
            }}
          >
            {category}
          </p>
        )}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--ink-2)" }}>
            {content}
          </p>
        </div>

        {/* Info */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-3)",
            marginBottom: "16px",
            lineHeight: 1.6,
          }}
        >
          Once 3 or more answers come in, AI will synthesise them for you.
        </p>

        {/* URL box */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--ink-3)",
              wordBreak: "break-all",
            }}
          >
            {shareUrl}
          </p>
        </div>

        <ShareButton
          url={shareUrl}
          title="Answer my concern"
          text={`${content.slice(0, 80)}${content.length > 80 ? "…" : ""}\n\nDrop me your honest take 🙏`}
        />

        {/* Result link */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "var(--ink-4)",
              marginBottom: "8px",
            }}
          >
            Save this link to check back on responses later.
          </p>
          <Link
            href={`/concern/${concernId}`}
            style={{
              fontSize: "13px",
              color: "var(--ink)",
              fontWeight: 600,
              textDecoration: "none",
              borderBottom: "1px solid var(--ink)",
              paddingBottom: "1px",
            }}
          >
            Go to results page →
          </Link>
        </div>
      </Shell>
    );
  }

  /* ── Submitting loader ──────────────────────────────────────────── */
  if (step === "submitting") {
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
            AI is analysing…
          </p>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            One moment
          </p>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.35; }
            }
          `}</style>
        </div>
      </Shell>
    );
  }

  /* ── Input ──────────────────────────────────────────────────────── */
  return (
    <Shell>
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
        Post a concern
      </p>

      {/* Headline */}
      <h1
        style={{
          fontSize: "clamp(36px, 8vw, 56px)",
          fontWeight: 900,
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          color: "var(--ink)",
          marginBottom: "36px",
        }}
      >
        What&apos;s on
        <br />
        your mind?
      </h1>

      {/* Textarea */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CHARS}
          rows={7}
          placeholder="Write freely about what's been on your mind…"
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
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <span
          style={{
            position: "absolute",
            bottom: "12px",
            right: "14px",
            fontSize: "11px",
            color: content.length > MAX_CHARS * 0.9 ? "var(--destructive)" : "var(--ink-4)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {content.length}/{MAX_CHARS}
        </span>
      </div>

      {/* User category */}
      <input
        value={userCategory}
        onChange={(e) => setUserCategory(e.target.value)}
        placeholder="Category (optional) — e.g. Sports, Fashion, Finance"
        maxLength={40}
        style={{
          width: "100%",
          borderRadius: "4px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "13px 16px",
          fontSize: "14px",
          color: "var(--ink)",
          outline: "none",
          fontFamily: "inherit",
          marginBottom: "28px",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />

      {/* Error */}
      {error && (
        <p
          style={{
            marginBottom: "16px",
            fontSize: "13px",
            color: "var(--destructive)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
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
          cursor: content.trim() ? "pointer" : "not-allowed",
          opacity: content.trim() ? 1 : 0.35,
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
      >
        Post concern
      </button>

      {/* Note */}
      <p
        style={{
          marginTop: "16px",
          fontSize: "12px",
          color: "var(--ink-4)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Posted anonymously · no personal data collected
      </p>

      {/* My past concerns */}
      {myConcerns.length > 0 && (
        <div
          style={{
            marginTop: "48px",
            paddingTop: "32px",
            borderTop: "1px solid var(--border)",
          }}
        >
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
            My concerns
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {myConcerns.map((c) => (
              <a
                key={c.id}
                href={`/concern/${c.id}`}
                style={{
                  display: "block",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "14px 16px",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {c.category && (
                  <span
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--ink-4)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {c.category}
                  </span>
                )}
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {c.content}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

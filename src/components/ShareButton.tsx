"use client";

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
  className?: string;
}

export function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  async function handleShare() {
    setShareError("");
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setShareError("Sharing failed. Please copy the link instead.");
      }
    }
  }

  async function handleCopy() {
    setShareError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Copy failed. Please select and copy the link manually.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {canShare && (
        <button
          onClick={handleShare}
          style={{
            width: "100%",
            borderRadius: "4px",
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--border)",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface-2)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--surface)")
          }
        >
          Share
        </button>
      )}
      <button
        onClick={handleCopy}
        style={{
          width: "100%",
          borderRadius: "4px",
          background: "transparent",
          color: "var(--ink-3)",
          border: "1px solid var(--border-light)",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
      >
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
      {shareError && (
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--destructive)",
          }}
        >
          {shareError}
        </p>
      )}
    </div>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main
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
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            letterSpacing: "0.12em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink)",
          }}
        >
          Q or A
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--ink-4)",
            letterSpacing: "0.04em",
          }}
        >
          Anonymous advice community
        </span>
      </nav>

      <style>{`
        .role-card-dark { transition: opacity 0.15s; }
        .role-card-dark:hover { opacity: 0.85; }
        .role-card-light { transition: background 0.15s; }
        .role-card-light:hover { background: var(--surface-2) !important; }
      `}</style>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 24px 32px",
          maxWidth: "640px",
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
            color: "var(--ink-3)",
            marginBottom: "20px",
          }}
        >
          Anonymous · AI-Synthesised
        </p>

        {/* Big editorial headline */}
        <h1
          style={{
            fontSize: "clamp(52px, 12vw, 88px)",
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "-0.04em",
            color: "var(--ink)",
            marginBottom: "32px",
          }}
        >
          Q or A
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "var(--ink-3)",
            maxWidth: "360px",
            lineHeight: 1.65,
            marginBottom: "48px",
          }}
        >
          Post anonymously and strangers will give you honest answers.
          <br />
          AI synthesises all the responses and delivers them to you.
        </p>

        {/* Role cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <Link href="/ask" style={{ textDecoration: "none" }}>
            <div
              className="role-card-dark"
              style={{
                background: "var(--ink)",
                color: "var(--accent-fg)",
                padding: "24px 20px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              <p
                style={{
                  fontSize: "24px",
                  marginBottom: "12px",
                  lineHeight: 1,
                }}
              >
                🤔
              </p>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  marginBottom: "6px",
                  letterSpacing: "-0.01em",
                }}
              >
                I have a question
              </p>
              <p style={{ fontSize: "12px", opacity: 0.65, lineHeight: 1.5 }}>
                Post your concern
                <br />
                and collect opinions
              </p>
            </div>
          </Link>

          <Link href="/answer" style={{ textDecoration: "none" }}>
            <div
              className="role-card-light"
              style={{
                background: "var(--surface)",
                color: "var(--ink)",
                padding: "24px 20px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <p
                style={{
                  fontSize: "24px",
                  marginBottom: "12px",
                  lineHeight: 1,
                }}
              >
                💬
              </p>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  marginBottom: "6px",
                  letterSpacing: "-0.01em",
                }}
              >
                I&apos;ll answer
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--ink-3)",
                  lineHeight: 1.5,
                }}
              >
                Find a concern
                <br />
                you can help with
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer strip */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "var(--ink-4)",
            letterSpacing: "0.04em",
          }}
        >
          © 2025 Q or A
        </span>
        <span style={{ fontSize: "11px", color: "var(--ink-4)" }}>
          Powered by Claude AI
        </span>
      </footer>
    </main>
  );
}

export default function Loading() {
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

"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f7f6f3", textAlign: "center", padding: 24 }}>
      <div><h1 style={{ fontSize: 24 }}>Something went wrong</h1><p style={{ color: "#4a4f5a" }}>Please try again in a moment.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: 0, background: "#dc1c26", color: "#fff", cursor: "pointer" }}>Try again</button></div>
    </body></html>
  );
}

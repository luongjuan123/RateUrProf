import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          border: "12px solid #1d4ed8",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: "#1d4ed8",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            <span>RUP</span>
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-2px",
              display: "flex",
            }}
          >
            <span>RateUr</span>
            <span style={{ color: "#1d4ed8" }}>Profs</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#666666",
            textTransform: "uppercase",
            letterSpacing: "3px",
          }}
        >
          Vietnam University Professor Ratings & Reviews
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

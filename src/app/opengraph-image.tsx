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
          border: "20px solid #000000",
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
              background: "#fef9c3",
              border: "3px solid #000000",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
            }}
          >
            <span>RU</span>
            <span style={{ color: "#e03a3e" }}>P</span>
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#000000",
              letterSpacing: "-2px",
              display: "flex",
            }}
          >
            <span>RateUr</span>
            <span style={{ color: "#e03a3e" }}>Profs</span>
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

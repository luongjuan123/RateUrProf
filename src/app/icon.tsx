import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 14,
          background: "#fef9c3",
          border: "2px solid #000000",
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000000",
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: "-0.5px",
        }}
      >
        <span>RU</span>
        <span style={{ color: "#e03a3e" }}>P</span>
      </div>
    ),
    {
      ...size,
    }
  );
}

import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: "#fef9c3",
          border: "3px solid #000000",
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000000",
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: "-1px",
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

import { ImageResponse } from "next/og";

export const alt = "Squeek Colony — Build together. Let the wheel decide.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 72,
        color: "#f7f1df",
        background:
          "radial-gradient(circle at 75% 20%, #314735 0%, #17251f 35%, #101713 75%)",
        fontFamily: "Georgia",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26 }}>
          <div
            style={{
              display: "flex",
              width: 58,
              height: 58,
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #7e795b",
              borderRadius: 16,
              color: "#f6c874",
              fontSize: 34,
            }}
          >
            ⌁
          </div>
          Squeek Colony
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              marginBottom: 18,
              color: "#b8db90",
              fontFamily: "Arial",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            A living world on Squeekchain
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 850,
              flexDirection: "column",
              fontSize: 76,
              lineHeight: 0.98,
              letterSpacing: -3,
            }}
          >
            <span>Build together.</span>
            <span>Let the wheel decide.</span>
          </div>
        </div>
        <div style={{ color: "#aeb8ae", fontFamily: "Arial", fontSize: 21 }}>
          Real rounds · Community choices · Verifiable outcomes
        </div>
      </div>
    </div>,
    size,
  );
}

import { ImageResponse } from "next/og";
import { siteDescription } from "@/lib/site";

/** The picture shown when a page of the site is shared. Drawn in code. */
export const alt = "RecruiterLink: the global directory of recruitment agencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(160deg, #21174B 10%, #4C57E6 110%)",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", fontSize: 132 }}>
          <span>recruiter</span>
          <span style={{ color: "#FF3EB5" }}>link</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 46, color: "#EDEEFF" }}>
          {siteDescription}
        </div>
      </div>
    ),
    size,
  );
}

import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SplitSimple - Easy Expense Splitting",
    short_name: "SplitSimple",
    description:
      "Split restaurant bills, rent, and group expenses by item, share, or exact amount. Free with no signup — see everyone's share instantly and share a link.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1E40AF",
    icons: [
      {
        // Single scalable SVG icon; modern browsers accept sizes "any" for SVG.
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  }
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RPGers 2026",
    short_name: "RPGers",
    description: "Programme, inscriptions et planning du festival RPGers 2026.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    lang: "fr",
    categories: ["entertainment", "events", "games"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Parties", short_name: "Parties", url: "/" },
      { name: "Mon planning", short_name: "Planning", url: "/planning" },
    ],
  };
}

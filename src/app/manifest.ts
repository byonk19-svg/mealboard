import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f8fafc",
    description: "Private family meal planning and grocery list app.",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/icons/icon-192.png",
        type: "image/png"
      },
      {
        sizes: "512x512",
        src: "/icons/icon-512.png",
        type: "image/png"
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/maskable-icon-512.png",
        type: "image/png"
      }
    ],
    id: "/",
    name: "MealBoard",
    orientation: "portrait",
    scope: "/",
    short_name: "MealBoard",
    start_url: "/dashboard",
    theme_color: "#0f766e"
  };
}

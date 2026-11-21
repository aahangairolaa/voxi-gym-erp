import type { MetadataRoute } from "next";

/** Lets staff "Add to Home Screen" and open VOXI like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VOXI — Gym Management",
    short_name: "VOXI",
    description: "The all-in-one gym ERP for Qatar.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f6fb",
    theme_color: "#6a44f2",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

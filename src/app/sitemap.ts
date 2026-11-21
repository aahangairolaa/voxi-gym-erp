import type { MetadataRoute } from "next";
import { CONTACT } from "@/lib/contact";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/register", "/login", "/privacy", "/terms"].map((p) => ({ url: `${CONTACT.site}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
}

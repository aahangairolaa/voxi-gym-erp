import type { MetadataRoute } from "next";
import { CONTACT } from "@/lib/contact";

/** Search engines may index the public website, never the app or member cards. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing", "/privacy", "/terms", "/register"], disallow: ["/api/", "/c/", "/r/", "/dashboard", "/members", "/admin", "/invoice"] }],
    sitemap: `${CONTACT.site}/sitemap.xml`,
  };
}

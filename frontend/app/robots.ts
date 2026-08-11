import type { MetadataRoute } from "next";

const SITE_URL = "https://goal-coach.app";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: ["/", "/contact", "/terms", "/privacy"],
			disallow: ["/goals", "/todos", "/coach", "/settings", "/dashboard", "/sign-in", "/sign-up"],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}

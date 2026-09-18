import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:"/",disallow:"/api/"},sitemap:"https://metabot-cr.vercel.app/sitemap.xml"}}

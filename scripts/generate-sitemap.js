import express from "express";
import College from "../models/College.js"; // your college model

const router = express.Router();
const BASE_URL = "https://www.collegeforms.in";

router.get("/sitemap.xml", async (req, res) => {
  try {
    const colleges = await College.find({}, "slug updatedAt");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // ✅ Static pages
    const staticUrls = [
      "/", "/studyabroad", "/contactus", "/events",
      "/students/tests", "/colleges", "/offer", "/step",
      "/blogs", "/myaccount", "/video", "/change-password",
      "/user/login", "/user/signup", "/user/forgot-password",
      "/privacy-policy", "/terms"
    ];

    staticUrls.forEach(u => {
      xml += `<url><loc>${BASE_URL}${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    // ✅ Dynamic college pages
    colleges.forEach(c => {
      xml += `<url>
        <loc>${BASE_URL}/college/${c.slug}</loc>
        <lastmod>${c.updatedAt.toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
      </url>\n`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;

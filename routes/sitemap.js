import express from "express";
import College from "../models/College.js";
import Blog from "../models/Blog.js";

const router = express.Router();
const BASE_URL = "https://www.collegeforms.in";

// Helper to escape XML special characters
const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

// Helper to format date
const formatDate = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    return new Date(date).toISOString().split('T')[0];
};

router.get("/sitemap.xml", async (req, res) => {
    try {
        console.log("🔄 Generating comprehensive XML sitemap...");
        
        // Start building XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // =============== STATIC PAGES ===============
        const staticPages = [
            // Home & Main Pages
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/home', priority: '1.0', changefreq: 'daily' },
            { url: '/old', priority: '0.8', changefreq: 'monthly' },
            
            // College Related
            { url: '/colleges', priority: '0.9', changefreq: 'daily' },
            { url: '/step', priority: '0.7', changefreq: 'weekly' },
            { url: '/offer', priority: '0.7', changefreq: 'weekly' },
            { url: '/education/education-loan', priority: '0.6', changefreq: 'monthly' },
            { url: '/education/accommodation', priority: '0.6', changefreq: 'monthly' },
            { url: '/CompetitiveExams', priority: '0.7', changefreq: 'weekly' },
            
            // Study Abroad
            { url: '/studyabroad', priority: '0.8', changefreq: 'weekly' },
            { url: '/education/:category', priority: '0.7', changefreq: 'weekly' },
            
            // Exams & Courses
            { url: '/exams', priority: '0.8', changefreq: 'weekly' },
            { url: '/courses', priority: '0.8', changefreq: 'weekly' },
            { url: '/students/tests', priority: '0.7', changefreq: 'weekly' },
            
            // Blog & Content
            { url: '/blogs', priority: '0.8', changefreq: 'daily' },
            
            // Events & Video
            { url: '/events', priority: '0.7', changefreq: 'weekly' },
            { url: '/video', priority: '0.6', changefreq: 'monthly' },
            
            // User Account
            { url: '/myaccount', priority: '0.3', changefreq: 'monthly' },
            { url: '/cart', priority: '0.5', changefreq: 'weekly' },
            { url: '/user/login', priority: '0.2', changefreq: 'monthly' },
            { url: '/user/signup', priority: '0.2', changefreq: 'monthly' },
            { url: '/user/forgot-password', priority: '0.1', changefreq: 'yearly' },
            { url: '/user/reset-password/:token', priority: '0.1', changefreq: 'yearly' },
            { url: '/change-password', priority: '0.1', changefreq: 'yearly' },
            
            // Contact & Support
            { url: '/contactus', priority: '0.7', changefreq: 'monthly' },
            { url: '/FAQ', priority: '0.6', changefreq: 'monthly' },
            
            // Legal
            { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
            { url: '/terms', priority: '0.3', changefreq: 'yearly' },
            
            // Team Pages
            { url: '/team', priority: '0.6', changefreq: 'monthly' },
            { url: '/course/:id', priority: '0.7', changefreq: 'weekly' },
            
            // Admin (optional - you might want to exclude these)
            // { url: '/admin/login', priority: '0.1', changefreq: 'yearly' },
            
            // Other Pages from your routes
            { url: '/education/overseas', priority: '0.7', changefreq: 'weekly' },
        ];
        
        // Add static pages
        staticPages.forEach(page => {
            xml += `  <url>\n`;
            xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
            xml += `    <lastmod>${formatDate(new Date())}</lastmod>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // =============== DYNAMIC COLLEGE PAGES ===============
        try {
            // Only get colleges that have slugs and are active
            const colleges = await College.find({ 
                slug: { $exists: true, $ne: null, $ne: '' }
            })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 })
            .limit(5000)
            .lean();
            
            console.log(`📊 Found ${colleges.length} colleges with slugs`);
            
            colleges.forEach(college => {
                // Double-check slug exists and is valid
                if (college.slug && college.slug.trim()) {
                    const escapedSlug = escapeXml(college.slug.trim());
                    xml += `  <url>\n`;
                    xml += `    <loc>${BASE_URL}/college/${escapedSlug}</loc>\n`;
                    xml += `    <lastmod>${formatDate(college.updatedAt)}</lastmod>\n`;
                    xml += `    <changefreq>weekly</changefreq>\n`;
                    xml += `    <priority>0.8</priority>\n`;
                    xml += `  </url>\n`;
                }
            });
            
            console.log(`✅ Added ${colleges.length} colleges to sitemap`);
            
        } catch (collegeError) {
            console.error("❌ College fetch error:", collegeError.message);
        }
        
        // =============== DYNAMIC BLOG PAGES ===============
        try {
            const blogs = await Blog.find({ 
                slug: { $exists: true, $ne: null, $ne: '' }
            })
            .select('slug updatedAt')
            .sort({ updatedAt: -1 })
            .limit(1000)
            .lean();
            
            console.log(`📊 Found ${blogs.length} blogs with slugs`);
            
            blogs.forEach(blog => {
                if (blog.slug && blog.slug.trim()) {
                    const escapedSlug = escapeXml(blog.slug.trim());
                    xml += `  <url>\n`;
                    xml += `    <loc>${BASE_URL}/blogs/${escapedSlug}</loc>\n`;
                    xml += `    <lastmod>${formatDate(blog.updatedAt)}</lastmod>\n`;
                    xml += `    <changefreq>monthly</changefreq>\n`;
                    xml += `    <priority>0.8</priority>\n`;
                    xml += `  </url>\n`;
                }
            });
            
            console.log(`✅ Added ${blogs.length} blogs to sitemap`);
            
        } catch (blogError) {
            console.error("❌ Blog fetch error:", blogError.message);
        }
        
        // =============== ADDITIONAL PAGES ===============
        // Add pages with specific IDs/categories if needed
        const additionalPages = [
            // Example: Specific education categories
            '/education/engineering',
            '/education/medical',
            '/education/management',
            '/education/law',
            '/education/arts',
            
            // Example: Specific course pages
            '/course/btech',
            '/course/mbbs',
            '/course/mba',
            '/course/bca',
            
            // Example: Exam categories
            '/exams/jee',
            '/exams/neet',
            '/exams/cat',
            '/exams/gate',
        ];
        
        additionalPages.forEach(page => {
            xml += `  <url>\n`;
            xml += `    <loc>${BASE_URL}${page}</loc>\n`;
            xml += `    <lastmod>${formatDate(new Date())}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.5</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // Close XML
        xml += '</urlset>';
        
        // Set headers
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
        
        // Send response
        res.send(xml);
        console.log("✅ Comprehensive XML sitemap generated successfully");
        
    } catch (error) {
        console.error("❌ Sitemap generation failed:", error);
        
        // Simple fallback sitemap
        const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/colleges</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/blogs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
        
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.send(fallbackXml);
    }
});

// Optional: Create separate sitemaps for better organization
router.get("/sitemap-index.xml", async (req, res) => {
    try {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-colleges.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-blogs.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
</sitemapindex>`;
        
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(xml);
        
    } catch (error) {
        console.error("Sitemap index error:", error);
        res.status(500).send("Error generating sitemap index");
    }
});

// Static pages sitemap
router.get("/sitemap-static.xml", async (req, res) => {
    try {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/home', priority: '1.0', changefreq: 'daily' },
            { url: '/colleges', priority: '0.9', changefreq: 'daily' },
            { url: '/blogs', priority: '0.8', changefreq: 'weekly' },
            { url: '/studyabroad', priority: '0.8', changefreq: 'weekly' },
            { url: '/contactus', priority: '0.7', changefreq: 'monthly' },
            { url: '/events', priority: '0.7', changefreq: 'weekly' },
            { url: '/courses', priority: '0.8', changefreq: 'weekly' },
            { url: '/exams', priority: '0.8', changefreq: 'weekly' },
            { url: '/students/tests', priority: '0.7', changefreq: 'weekly' },
            { url: '/myaccount', priority: '0.3', changefreq: 'monthly' },
            { url: '/video', priority: '0.6', changefreq: 'monthly' },
            { url: '/step', priority: '0.7', changefreq: 'weekly' },
            { url: '/offer', priority: '0.7', changefreq: 'weekly' },
            { url: '/user/login', priority: '0.2', changefreq: 'monthly' },
            { url: '/user/signup', priority: '0.2', changefreq: 'monthly' },
            { url: '/FAQ', priority: '0.6', changefreq: 'monthly' },
            { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
            { url: '/terms', priority: '0.3', changefreq: 'yearly' },
            { url: '/education/education-loan', priority: '0.6', changefreq: 'monthly' },
            { url: '/education/accommodation', priority: '0.6', changefreq: 'monthly' },
            { url: '/CompetitiveExams', priority: '0.7', changefreq: 'weekly' },
            { url: '/cart', priority: '0.5', changefreq: 'weekly' },
        ];
        
        staticPages.forEach(page => {
            xml += `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
        });
        
        xml += `
</urlset>`;
        
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(xml);
        
    } catch (error) {
        console.error("Static sitemap error:", error);
        res.status(500).send("Error generating static sitemap");
    }
});

// College sitemap
router.get("/sitemap-colleges.xml", async (req, res) => {
    try {
        const colleges = await College.find({ 
            slug: { $exists: true, $ne: null, $ne: '' }
        })
        .select('slug updatedAt')
        .sort({ updatedAt: -1 })
        .limit(50000)
        .lean();
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        
        colleges.forEach(college => {
            if (college.slug && college.slug.trim()) {
                const escapedSlug = escapeXml(college.slug.trim());
                xml += `
  <url>
    <loc>${BASE_URL}/college/${escapedSlug}</loc>
    <lastmod>${formatDate(college.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
            }
        });
        
        xml += `
</urlset>`;
        
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(xml);
        
    } catch (error) {
        console.error("College sitemap error:", error);
        res.status(500).send("Error generating college sitemap");
    }
});

// Blog sitemap
router.get("/sitemap-blogs.xml", async (req, res) => {
    try {
        const blogs = await Blog.find({ 
            slug: { $exists: true, $ne: null, $ne: '' }
        })
        .select('slug updatedAt')
        .sort({ updatedAt: -1 })
        .limit(50000)
        .lean();
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        
        blogs.forEach(blog => {
            if (blog.slug && blog.slug.trim()) {
                const escapedSlug = escapeXml(blog.slug.trim());
                xml += `
  <url>
    <loc>${BASE_URL}/blogs/${escapedSlug}</loc>
    <lastmod>${formatDate(blog.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
            }
        });
        
        xml += `
</urlset>`;
        
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(xml);
        
    } catch (error) {
        console.error("Blog sitemap error:", error);
        res.status(500).send("Error generating blog sitemap");
    }
});

export default router;
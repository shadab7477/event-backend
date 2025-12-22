// /var/www/collegeform/backend/middleware/seoMiddleware.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from '../models/Blog.js'; // Make sure this import exists

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bot user agents detection
const BOT_USER_AGENTS = [
    'googlebot', 'googlebot-mobile', 'googlebot-image', 'mediapartners-google',
    'bingbot', 'slurp', 'yandex', 'yandexbot', 'yandeximages', 'yandexvideo',
    'baiduspider', 'duckduckbot', 'facebot', 'facebookexternalhit', 'facebookcatalog',
    'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
    'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkShare', 'redditbot',
    'applebot', 'whatsapp', 'telegrambot', 'discordbot', 'skypeuripreview',
    'ia_archiver', 'archive.org_bot', 'msnbot', 'msnbot-media', 'adsbot-google',
    'developers.google.com/+/web/snippet',
    'google-structured-data-testing-tool', // Google testing tools
    'google-page-speed', 'lighthouse', 'pingdom', 'gtmetrix', // Performance tools
    'ahrefsbot', 'semrushbot', 'moz.com', 'mj12bot', 'seznambot', // SEO tools
    'applebot', 'baiduspider', 'sogou', 'exabot', // International bots
    'Google-SearchConsole', 'Google-InspectionTool' // GSC tools
];

// Check if user agent is a bot
export const isBot = (userAgent) => {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return BOT_USER_AGENTS.some(bot => ua.includes(bot));
};

// Generate meta description from blog content
const generateMetaDescription = (content, maxLength = 160) => {
    if (!content) return 'Read our latest blog about education and career guidance.';
    
    // Remove HTML tags
    const plainText = content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'") // Replace &#39; with '
        .trim();
    
    // Trim to max length without cutting words
    if (plainText.length <= maxLength) return plainText;
    
    // Find the last space within limit and trim there
    const trimmed = plainText.substring(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(' ');
    
    return lastSpace > 0 
        ? trimmed.substring(0, lastSpace) + '...'
        : trimmed + '...';
};

// Generate blog excerpt for preview
const generateBlogExcerpt = (content, maxLength = 500) => {
    if (!content) return '';
    
    const plainText = content
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (plainText.length <= maxLength) return plainText;
    
    const trimmed = plainText.substring(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(' ');
    
    return lastSpace > 0 
        ? trimmed.substring(0, lastSpace) + '...'
        : trimmed + '...';
};

// Generate breadcrumb structured data
const generateBreadcrumbData = (blogTitle, slug, baseUrl) => {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Blogs",
                "item": `${baseUrl}/blogs`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": blogTitle,
                "item": `${baseUrl}/blogs/${slug}`
            }
        ]
    };
};

// Generate FAQ structured data
const generateFAQData = (faqs, baseUrl) => {
    if (!faqs || faqs.length === 0) return null;
    
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq, index) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer.replace(/<[^>]*>/g, '')
            }
        }))
    };
};

// Generate blog structured data
const generateBlogStructuredData = (blog, metaDescription, metaImage, baseUrl) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": blog.title,
        "description": metaDescription,
        "image": metaImage,
        "datePublished": blog.createdAt,
        "dateModified": blog.updatedAt || blog.createdAt,
        "author": {
            "@type": "Organization",
            "name": blog.author || "CollegeForm",
            "url": baseUrl
        },
        "publisher": {
            "@type": "Organization",
            "name": "CollegeForm",
            "logo": {
                "@type": "ImageObject",
                "url": `${baseUrl}/logo.png`,
                "width": 200,
                "height": 60
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${baseUrl}/blogs/${blog.slug}`
        }
    };
    
    // Add keywords if available
    if (blog.keywords && blog.keywords.length > 0) {
        structuredData.keywords = blog.keywords.join(', ');
    }
    
    // Add category
    if (blog.category) {
        structuredData.articleSection = blog.category;
    }
    
    // Add word count if content is available
    if (blog.content) {
        const wordCount = blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        structuredData.wordCount = wordCount;
    }
    
    return structuredData;
};

// Route-specific meta data
export const ROUTE_META_DATA = {
    '/': {
        title: "CollegeForms.in - India's most preferred and trusted online platform for discounted College Applications",
        description: "Explore top colleges, best courses after 12th, MBA & BBA entrance exams, and get expert college admission help. Discover scholarships, discounts on forms, and college guidance at CollegeForms.in.",
        keywords: "best colleges in India, college admission help, MBA entrance exams, course selection guidance, tuition fee discounts, scholarships after 12th, scholarships on tuition fees",
        ogImage: "https://www.collegeforms.in/college-forms-og-image.jpg",
        canonical: "https://www.collegeforms.in/"
    },

    '/studyabroad': {
        title: "Study Abroad Programs – Scholarships & Admissions | CollegeForms",
        description: "Looking to study abroad? Explore top international colleges, scholarships on tuition, and MBA programs. Get expert college guidance and application help with CollegeForms.in.",
        keywords: "study abroad programs, international colleges, MBA abroad options, tuition fee scholarships, overseas admission help, best global colleges, IELTS EXAMs, SAT Exam, GRE/GMAT Exam",
        ogImage: "https://www.collegeforms.in/study-abroad-og-image.jpg",
        canonical: "https://www.collegeforms.in/studyabroad"
    },

    '/colleges': {
        title: "Top Colleges in India - Rankings, Fees, Admission | CollegeForms",
        description: "Find the best colleges in India with rankings, fees structure, admission process, and student reviews. Get expert guidance for college selection.",
        keywords: "colleges in India, college rankings, admission process, college fees, top engineering colleges, top medical colleges, management colleges",
        ogImage: "https://www.collegeforms.in/colleges-og-image.jpg",
        canonical: "https://www.collegeforms.in/colleges"
    },

    '/blogs': {
        title: "Education Blog - Latest Updates & Guidance | CollegeForms",
        description: "Latest education news, career guidance, college admission tips, and exam preparation strategies. Stay updated with the education sector.",
        keywords: "education blog, career guidance, admission tips, exam preparation, education news, college admission blog",
        ogImage: "https://www.collegeforms.in/blogs-og-image.jpg",
        canonical: "https://www.collegeforms.in/blogs"
    },

    '/contactus': {
        title: "Contact Us - Get College Admission Help | CollegeForms",
        description: "Get in touch with our education experts for college admission guidance, scholarship information, and application help.",
        keywords: "contact college admission help, education consultants, admission guidance contact",
        ogImage: "https://www.collegeforms.in/contact-og-image.jpg",
        canonical: "https://www.collegeforms.in/contactus"
    },

    '/courses': {
        title: "Popular Courses & Career Options | CollegeForms",
        description: "Explore popular courses after 12th, career options, and find the right path for your future. Get guidance on course selection.",
        keywords: "courses after 12th, career options, course selection, engineering courses, medical courses",
        ogImage: "https://www.collegeforms.in/courses-og-image.jpg",
        canonical: "https://www.collegeforms.in/courses"
    },

    '/exams': {
        title: "Entrance Exams Preparation & Guidance | CollegeForms",
        description: "Prepare for various entrance exams with expert guidance, tips, and resources. Get information about exam dates and patterns.",
        keywords: "entrance exams, exam preparation, JEE, NEET, CAT, MAT, exam dates",
        ogImage: "https://www.collegeforms.in/exams-og-image.jpg",
        canonical: "https://www.collegeforms.in/exams"
    },

    '/students/tests': {
        title: "Online Tests & Practice Papers | CollegeForms",
        description: "Take online practice tests, mock exams, and improve your preparation with our test series for various entrance exams.",
        keywords: "online tests, practice papers, mock exams, test series",
        ogImage: "https://www.collegeforms.in/tests-og-image.jpg",
        canonical: "https://www.collegeforms.in/students/tests"
    },

    '/events': {
        title: "Education Events & Workshops | CollegeForms",
        description: "Stay updated with upcoming education events, workshops, webinars, and college fairs. Participate and enhance your knowledge.",
        keywords: "education events, workshops, webinars, college fairs",
        ogImage: "https://www.collegeforms.in/events-og-image.jpg",
        canonical: "https://www.collegeforms.in/events"
    },

    '/video': {
        title: "Educational Videos & Tutorials | CollegeForms",
        description: "Watch educational videos, tutorials, and expert talks on college admissions, exam preparation, and career guidance.",
        keywords: "educational videos, tutorials, expert talks",
        ogImage: "https://www.collegeforms.in/video-og-image.jpg",
        canonical: "https://www.collegeforms.in/video"
    },

    '/privacy': {
        title: "Privacy Policy | CollegeForms",
        description: "Read our privacy policy to understand how we collect, use, and protect your personal information.",
        keywords: "privacy policy, data protection, terms of use",
        ogImage: "https://www.collegeforms.in/privacy-og-image.jpg",
        canonical: "https://www.collegeforms.in/privacy"
    },

    '/terms': {
        title: "Terms & Conditions | CollegeForms",
        description: "Read our terms and conditions for using CollegeForms.in services and platform.",
        keywords: "terms and conditions, user agreement, legal terms",
        ogImage: "https://www.collegeforms.in/terms-og-image.jpg",
        canonical: "https://www.collegeforms.in/terms"
    }
};

// Read index.html once and cache it
let cachedIndexHtml = null;

const readIndexHtml = () => {
    if (cachedIndexHtml) {
        return cachedIndexHtml;
    }
    
    try {
        const indexPath = path.join(__dirname, '../../frontend/build/index.html');
        cachedIndexHtml = fs.readFileSync(indexPath, 'utf8');
        console.log('📁 Index.html loaded successfully');
        return cachedIndexHtml;
    } catch (error) {
        console.error('❌ Failed to load index.html:', error.message);
        return '<html><head><title>CollegeForms</title></head><body><div id="root"></div></body></html>';
    }
};

// Generate HTML for blog pages
const generateBlogHTML = (blog, baseUrl) => {
    // Generate meta description
    const metaDescription = blog.metaDescription || generateMetaDescription(blog.content);
    
    // Generate image URL
    const metaImage = blog.image 
        ? (blog.image.startsWith('http') ? blog.image : `${baseUrl}${blog.image}`)
        : `${baseUrl}/default-blog-image.jpg`;
    
    // Generate page title
    const pageTitle = `${blog.title} | CollegeForm Blog`;
    
    // Get category
    const category = blog.category || 'Education';
    
    // Generate keywords
    const keywords = blog.tags ? blog.tags.join(', ') : `${category}, education, college, career, blog`;
    
    // Generate structured data
    const blogStructuredData = generateBlogStructuredData(blog, metaDescription, metaImage, baseUrl);
    const breadcrumbData = generateBreadcrumbData(blog.title, blog.slug, baseUrl);
    const faqData = blog.faqs ? generateFAQData(blog.faqs, baseUrl) : null;
    
    // Generate blog excerpt for preview
    const blogExcerpt = generateBlogExcerpt(blog.content);
    
    // Format date
    const publishedDate = new Date(blog.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const metaTags = `
        <title>${pageTitle}</title>
        <meta name="description" content="${metaDescription}" />
        <meta name="keywords" content="${keywords}" />
        <link rel="canonical" href="${baseUrl}/blogs/${blog.slug}" />
        
        <!-- Open Graph -->
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${baseUrl}/blogs/${blog.slug}" />
        <meta property="og:title" content="${pageTitle}" />
        <meta property="og:description" content="${metaDescription}" />
        <meta property="og:image" content="${metaImage}" />
        <meta property="og:site_name" content="College Form" />
        <meta property="article:published_time" content="${blog.createdAt}" />
        <meta property="article:modified_time" content="${blog.updatedAt || blog.createdAt}" />
        <meta property="article:author" content="${blog.author || 'CollegeForm'}" />
        <meta property="article:section" content="${category}" />
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="${baseUrl}/blogs/${blog.slug}" />
        <meta name="twitter:title" content="${pageTitle}" />
        <meta name="twitter:description" content="${metaDescription}" />
        <meta name="twitter:image" content="${metaImage}" />
        
        <!-- Additional SEO -->
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="author" content="${blog.author || 'CollegeForm'}" />
        <meta name="publish_date" content="${blog.createdAt}" />
        
        <!-- Structured Data -->
        <script type="application/ld+json">
            ${JSON.stringify(blogStructuredData, null, 2)}
        </script>
        
        <script type="application/ld+json">
            ${JSON.stringify(breadcrumbData, null, 2)}
        </script>
        
        ${faqData ? `
        <script type="application/ld+json">
            ${JSON.stringify(faqData, null, 2)}
        </script>
        ` : ''}
    `;

    // Create blog content for bots to see
    const blogContentHTML = `
        <div class="ssr-blog-content" style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <article>
                <header style="text-align: center; margin-bottom: 40px;">
                    <h1 style="font-size: 2.5rem; color: #1a237e; margin-bottom: 20px;">${blog.title}</h1>
                    <div style="color: #666; font-size: 0.9rem; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>📅 ${publishedDate}</span>
                        ${blog.author ? `<span>👤 By ${blog.author}</span>` : ''}
                        ${category ? `<span>🏷️ Category: ${category}</span>` : ''}
                    </div>
                </header>
                
                ${blog.image ? `
                <div style="margin: 30px 0;">
                    <img src="${metaImage}" alt="${blog.title}" 
                         style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 12px;"
                         loading="lazy">
                </div>
                ` : ''}
                
                <div style="font-size: 1.1rem; line-height: 1.8; color: #333;">
                    ${blogExcerpt}
                    <p style="margin-top: 30px; font-style: italic;">
                        <strong>Continue reading the full article for more insights...</strong>
                    </p>
                </div>
                
                ${blog.faqs && blog.faqs.length > 0 ? `
                <section style="margin-top: 50px; background: #f8f9fa; padding: 30px; border-radius: 12px;">
                    <h2 style="color: #1a237e; margin-bottom: 20px;">Frequently Asked Questions</h2>
                    <div style="display: grid; gap: 15px;">
                        ${blog.faqs.slice(0, 3).map((faq, index) => `
                            <div style="border-left: 4px solid #2196f3; padding-left: 15px;">
                                <h3 style="color: #333; margin-bottom: 10px; font-size: 1.1rem;">
                                    Q${index + 1}: ${faq.question}
                                </h3>
                                <p style="color: #555;">${faq.answer.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                            </div>
                        `).join('')}
                    </div>
                </section>
                ` : ''}
            </article>
        </div>
    `;

    const newHead = `<head>
        <meta charset="utf-8"/>
        <link rel="icon" href="/favicon.png"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="theme-color" content="#000000"/>
        ${metaTags}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DMZRBF2RQ1"></script>
        <script>function gtag(){dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[],gtag("js",new Date),gtag("config","G-DMZRBF2RQ1")</script>
        <script>!function(e,t,a,n,g){e[n]=e[n]||[],e[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var m=t.getElementsByTagName(a)[0],r=t.createElement(a);r.async=!0,r.src="https://www.googletagmanager.com/gtm.js?id=GTM-549BCBRD",m.parentNode.insertBefore(r,m)}(window,document,"script","dataLayer")</script>
        <script defer="defer" src="/static/js/main.ba321a83.js"></script>
        <link href="/static/css/main.28da5570.css" rel="stylesheet">
        
        <!-- Inline styles for SSR content -->
        <style>
            .ssr-blog-content { display: block !important; }
            #root { display: none; }
        </style>
    </head>`;
    
    // Get the HTML template
    const htmlTemplate = readIndexHtml();
    
    // Replace head and add blog content
    const modifiedHtml = htmlTemplate
        .replace(/<head>[\s\S]*?<\/head>/, newHead)
        .replace('<div id="root"></div>', `<div id="root" style="display: none;"></div>${blogContentHTML}`);
    
    return modifiedHtml;
};

// Generate general SEO HTML
const generateSEOHTML = (meta, htmlTemplate) => {
    const metaTags = `
        <title>${meta.title}</title>
        <meta name="description" content="${meta.description}" />
        <meta name="keywords" content="${meta.keywords}" />
        <link rel="canonical" href="${meta.canonical}" />
        
        <!-- Open Graph -->
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${meta.canonical}" />
        <meta property="og:title" content="${meta.title}" />
        <meta property="og:description" content="${meta.description}" />
        <meta property="og:image" content="${meta.ogImage}" />
        <meta property="og:site_name" content="College Forms" />
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="${meta.canonical}" />
        <meta name="twitter:title" content="${meta.title}" />
        <meta name="twitter:description" content="${meta.description}" />
        <meta name="twitter:image" content="${meta.ogImage}" />
        
        <!-- Additional SEO -->
        <meta name="robots" content="index, follow" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="author" content="College Forms" />
    `;

    const newHead = `<head>
        <meta charset="utf-8"/>
        <link rel="icon" href="/favicon.png"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="theme-color" content="#000000"/>
        ${metaTags}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DMZRBF2RQ1"></script>
        <script>function gtag(){dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[],gtag("js",new Date),gtag("config","G-DMZRBF2RQ1")</script>
        <script>!function(e,t,a,n,g){e[n]=e[n]||[],e[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var m=t.getElementsByTagName(a)[0],r=t.createElement(a);r.async=!0,r.src="https://www.googletagmanager.com/gtm.js?id=GTM-549BCBRD",m.parentNode.insertBefore(r,m)}(window,document,"script","dataLayer")</script>
        <script defer="defer" src="/static/js/main.ba321a83.js"></script>
        <link href="/static/css/main.28da5570.css" rel="stylesheet">
    </head>`;
    
    return htmlTemplate.replace(/<head>[\s\S]*?<\/head>/, newHead);
};

// Main middleware function
export const seoMiddleware = async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const requestPath = req.path;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Skip for API, static files, sitemap, etc.
    if (requestPath.startsWith('/api/') || 
        requestPath.startsWith('/static/') ||
        requestPath.startsWith('/uploads/') ||
        requestPath === '/sitemap.xml' ||
        requestPath === '/robots.txt' ||
        requestPath.includes('.')) {
        return next();
    }
    
    // Check if it's a bot
    if (isBot(userAgent)) {
        console.log(`🤖 Bot detected: ${userAgent.substring(0, 50)}...`);
        console.log(`📄 Requested path: ${requestPath}`);
        
        try {
            // Handle blog routes specially
            if (requestPath.startsWith('/blogs/') && requestPath !== '/blogs') {
                const slug = requestPath.split('/blogs/')[1];
                
                if (slug) {
                    console.log(`📝 Fetching blog: ${slug}`);
                    
                    try {
                        // Fetch blog from database
                        const blog = await Blog.findOne({ 
                            slug: slug,
                            status: 'published'
                        }).lean();
                        
                        if (!blog) {
                            console.log(`❌ Blog not found: ${slug}`);
                            // Serve 404 for bots
                            const notFoundHtml = `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>404 - Blog Not Found | CollegeForm</title>
                                </head>
                                <body>
                                    <h1>404 - Blog Not Found</h1>
                                </body>
                                </html>
                            `;
                            res.setHeader('Content-Type', 'text/html; charset=utf-8');
                            return res.status(404).send(notFoundHtml);
                        }
                        
                        // Increment view count
                        await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });
                        
                        // Generate blog HTML
                        const blogHtml = generateBlogHTML(blog, baseUrl);
                        
                        console.log(`✅ Serving blog HTML for: ${blog.title.substring(0, 50)}...`);
                        
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=1800');
                        res.setHeader('X-SSR', 'true');
                        res.setHeader('X-Blog-Id', blog._id.toString());
                        
                        return res.send(blogHtml);
                        
                    } catch (dbError) {
                        console.error('❌ Database error:', dbError.message);
                        // Fall back to normal React app on database error
                    }
                }
            }
            
            // For other bot requests, use general SEO handling
            const htmlTemplate = readIndexHtml();
            
            // Get meta data for this route
            let metaData = ROUTE_META_DATA[requestPath];
            
            // Use default if no specific meta found
            if (!metaData) {
                metaData = ROUTE_META_DATA['/'];
            }
            
            // Generate and send SEO-optimized HTML
            const seoHtml = generateSEOHTML(metaData, htmlTemplate);
            
            console.log(`✅ Serving SEO HTML for: ${requestPath}`);
            console.log(`   Title: ${metaData.title.substring(0, 50)}...`);
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(seoHtml);
            
        } catch (error) {
            console.error('❌ SEO middleware error:', error.message);
            next(); // Fall back to normal React app
        }
    } else {
        // Normal user - serve React app as usual
        next();
    }
};
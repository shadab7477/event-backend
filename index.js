// /var/www/collegeform/backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import path from "path";

import eventRoutes from "./routes/eventRoutes.js";
import { fileURLToPath } from 'url';
import userauth from './routes/userauth.js';
import adminUroutes from "./routes/adminUroutes.js";
import { startCleanupService } from './services/cleanupService.js';

import categoryRoutes from './routes/categoryRoutes.js';
import artistRoutes from './routes/artistRoutes.js';
// ✅ IMPORTANT: Import your SEO middleware

// Load environment variables
dotenv.config();

// Database connection
connectDB();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3036",
  "https://collegeforms.in",
  "http://localhost:5000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      origin === allowed || 
      origin.startsWith(allowed) ||
      new RegExp(`^https?://(.*\.)?${allowed.replace(/^https?:\/\//, '')}$`).test(origin)
    )) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "X-CSRF-Token"
  ],
  exposedHeaders: [
    "Content-Range",
    "X-Content-Range",
    "Content-Disposition",
    "Authorization",
    "X-Total-Count"
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit OPTIONS handler
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ 
  extended: true,
  limit: '50mb',
  parameterLimit: 100000
}));

// Serve static files from uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ CRITICAL: Serve React build files BEFORE SEO middleware
app.use(express.static(path.join(__dirname, "../frontend/build")));

// API Routes
// app.use("/api/upload", upload);
app.use("/api/auth", authRoutes);
app.use("/api/auth", userauth);
// app.use("/api", password);
app.use("/api/admin", adminUroutes);

app.use("/api/events", eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/artists', artistRoutes);
// ✅ Sitemap route

// Health check endpoints
app.get("/start", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/ping", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    service: "College Forms API",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Apply SEO Middleware BEFORE catch-all route
// app.use(seoMiddleware);

// ✅ Catch-all route for React app (will be used for normal users)


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Policy',
      message: 'Cross-origin requests are not allowed from this domain',
      allowedOrigins
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 Handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.originalUrl} was not found`
  });
});

// Server config
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${ENV} mode on port ${PORT}`);
  console.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`🗺️  Sitemap available at: /sitemap.xml`);
  console.log(`🤖 SEO Bot detection: ENABLED`);
  console.log(`🎯 Bot detection will serve meta tags, normal users get React app`);
});
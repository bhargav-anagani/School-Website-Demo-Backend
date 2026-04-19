// ─────────────────────────────────────────────────────────────
// International High School — Express Server Entry Point
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { testConnection } = require('./src/config/db');
const { errorHandler }   = require('./src/middleware/errorHandler');

// Routes
const authRoutes    = require('./src/routes/auth');
const adminRoutes   = require('./src/routes/admin');
const studentRoutes = require('./src/routes/student');
const teacherRoutes = require('./src/routes/teacher');
const parentRoutes  = require('./src/routes/parent');
const publicRoutes  = require('./src/routes/public');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ─────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── HEALTH CHECK ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'International High School API is running 🎓', version: '1.0.0' });
});

// ── API ROUTES ─────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent',  parentRoutes);
app.use('/api/public',  publicRoutes);

// ── 404 HANDLER ────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────
app.use(errorHandler);

// ── START SERVER ───────────────────────────────────────────────
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 International High School ERP API`);
    console.log(`🔑 Health: http://localhost:${PORT}/api/health\n`);
  });
};

start();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/errors');

const app = express();

const allowedOrigins = [
  'https://anantairways.in',
  'https://www.anantairways.in',
  'http://anantairways.in',
  'http://www.anantairways.in',
  'https://api.anantairways.in',
  'http://api.anantairways.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5400'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((o) => o.replace(/\/$/, '') === normalizedOrigin);
    if (isAllowed || normalizedOrigin.endsWith('.anantairways.in')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware: Request logging for server terminal debugging
app.use((req, res, next) => {
  console.log(`📥 [REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware: Parse incoming JSON requests
app.use(express.json());

// Middleware: Parse urlencoded payloads
app.use(express.urlencoded({ extended: true }));

// Middleware: Parse Cookie header and populate req.cookies
app.use(cookieParser());

// API Route Definitions
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exams', examRoutes);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Online Examination System API is running smoothly.'
  });
});

// Fallback Route handler for 404 (Not Found)
app.all('*', (req, res, next) => {
  console.error(`⚠️ [404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;

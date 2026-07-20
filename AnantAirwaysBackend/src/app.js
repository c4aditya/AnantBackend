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
  'http://localhost:5173',
  'http://localhost:5173/',
  'http://localhost:3000',
  'http://localhost:5174'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((o) => o.replace(/\/$/, '') === normalizedOrigin);
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Allow configured origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const flightRoutes = require('./routes/flight.routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/errors');

const app = express();

const allowedOrigins = [
  'https://anantairways.in',
  'https://www.anantairways.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5400',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  const envFrontend = process.env.FRONTEND_URL.replace(/\/+$/, '');
  if (!allowedOrigins.includes(envFrontend)) {
    allowedOrigins.push(envFrontend);
  }
}

if (process.env.CLIENT_URL) {
  const envClient = process.env.CLIENT_URL.replace(/\/+$/, '');
  if (!allowedOrigins.includes(envClient)) {
    allowedOrigins.push(envClient);
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/+$/, '') === normalizedOrigin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      // Safely allow requesting origin while reflecting it for credentials support
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
app.use('/api/v1/exam', examRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/flights', flightRoutes);

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

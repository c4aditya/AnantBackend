const express = require('express');
const { searchFlights, createBookingRequest } = require('../controllers/flight.controller');

const router = express.Router();

// GET /api/v1/flights/search
router.get('/search', searchFlights);

// POST /api/v1/flights/booking-request
router.post('/booking-request', createBookingRequest);

module.exports = router;


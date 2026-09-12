// In-memory cache for Amadeus OAuth token
let amadeusToken = null;
let tokenExpiry = 0;

// Helper to get Amadeus Access Token
const getAmadeusToken = async () => {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Return cached token if valid (with 60s buffer)
  if (amadeusToken && Date.now() < tokenExpiry - 60000) {
    return amadeusToken;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      console.warn('Amadeus Auth Failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    amadeusToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return amadeusToken;
  } catch (err) {
    console.warn('Amadeus Auth Exception:', err.message);
    return null;
  }
};

// Map of IATA codes to City names for clean display
const cityMap = {
  DEL: 'Delhi',
  BOM: 'Mumbai',
  AMD: 'Ahmedabad',
  LKO: 'Lucknow',
  MAA: 'Chennai',
  DXB: 'Dubai',
  CCU: 'Kolkata',
  HYD: 'Hyderabad',
  BLR: 'Bangalore',
  JAI: 'Jaipur',
  GOI: 'Goa',
  PNQ: 'Pune'
};

// Carrier Code mapping
const carrierMap = {
  AI: 'Air India',
  '6E': 'IndiGo',
  UK: 'Vistara',
  SG: 'SpiceJet',
  QP: 'Akasa Air',
  I5: 'AirAsia India',
  EK: 'Emirates',
  FZ: 'flydubai'
};

// Generate realistic direct flight schedule fallback data when Amadeus is offline / unset
const generateFallbackFlights = (origin, destination, departureDate) => {
  const originCode = (origin || 'DEL').toUpperCase();
  const destCode = (destination || 'BOM').toUpperCase();
  const originCity = cityMap[originCode] || originCode;
  const destCity = cityMap[destCode] || destCode;
  const dateStr = departureDate || new Date().toISOString().split('T')[0];

  const routeFlightTemplates = [
    { code: '6E', num: '204', departure: '06:00 AM', arrival: '08:15 AM', duration: '2h 15m', basePrice: 4200, classType: 'Economy' },
    { code: 'AI', num: '805', departure: '07:30 AM', arrival: '09:45 AM', duration: '2h 15m', basePrice: 4800, classType: 'Economy' },
    { code: 'UK', num: '930', departure: '09:00 AM', arrival: '11:15 AM', duration: '2h 15m', basePrice: 5600, classType: 'Economy' },
    { code: 'QP', num: '1102', departure: '10:45 AM', arrival: '01:00 PM', duration: '2h 15m', basePrice: 3900, classType: 'Economy' },
    { code: 'SG', num: '8161', departure: '12:15 PM', arrival: '02:30 PM', duration: '2h 15m', basePrice: 4100, classType: 'Economy' },
    { code: '6E', num: '5312', departure: '02:00 PM', arrival: '04:15 PM', duration: '2h 15m', basePrice: 4600, classType: 'Economy' },
    { code: 'UK', num: '944', departure: '04:30 PM', arrival: '06:45 PM', duration: '2h 15m', basePrice: 6200, classType: 'Business' },
    { code: 'AI', num: '868', departure: '06:15 PM', arrival: '08:30 PM', duration: '2h 15m', basePrice: 5100, classType: 'Economy' },
    { code: '6E', num: '6184', departure: '08:00 PM', arrival: '10:15 PM', duration: '2h 15m', basePrice: 4300, classType: 'Economy' },
    { code: 'UK', num: '988', departure: '09:45 PM', arrival: '11:55 PM', duration: '2h 10m', basePrice: 5400, classType: 'Economy' },
    { code: 'AI', num: '652', departure: '11:15 PM', arrival: '01:30 AM', duration: '2h 15m', basePrice: 4000, classType: 'Economy' }
  ];

  // Adjust prices slightly based on route (e.g. Dubai routes cost more)
  const isInternational = originCode === 'DXB' || destCode === 'DXB';
  const priceMultiplier = isInternational ? 2.8 : 1.0;

  return routeFlightTemplates.map((item, idx) => ({
    id: `FL-${originCode}-${destCode}-${idx + 1}`,
    airline: carrierMap[item.code] || 'Air India',
    flightNumber: `${item.code}-${item.num}`,
    from: originCity,
    to: destCity,
    originCode: originCode,
    destinationCode: destCode,
    departure: item.departure,
    arrival: item.arrival,
    duration: item.duration,
    price: Math.round(item.basePrice * priceMultiplier),
    class: item.classType,
    date: dateStr,
    stops: 0
  }));
};

/**
 * @desc Search Flight Offers
 * @route GET /api/v1/flights/search
 * @access Public
 */
const searchFlights = async (req, res, next) => {
  try {
    const { origin, destination, date, passengers = 1 } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      message: 'Origin and destination IATA codes are required.'
    });
  }

  const originCode = origin.toUpperCase();
  const destCode = destination.toUpperCase();
  const departureDate = date || new Date().toISOString().split('T')[0];

  const token = await getAmadeusToken();

  if (token) {
    try {
      const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&adults=${passengers}&currencyCode=INR&max=20`;

      const amadeusRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (amadeusRes.ok) {
        const data = await amadeusRes.json();
        if (data.data && data.data.length > 0) {
          const flights = data.data.map((offer, idx) => {
            const itinerary = offer.itineraries[0];
            const segment = itinerary.segments[0];
            const lastSegment = itinerary.segments[itinerary.segments.length - 1];
            const carrierCode = segment.carrierCode;
            const carrierName = data.dictionaries?.carriers?.[carrierCode] || carrierMap[carrierCode] || carrierCode;
            const depTimeStr = new Date(segment.departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const arrTimeStr = new Date(lastSegment.arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const price = Math.round(parseFloat(offer.price.total));

            return {
              id: offer.id || `AM-${idx + 1}`,
              airline: carrierName,
              flightNumber: `${carrierCode}-${segment.number}`,
              from: cityMap[originCode] || originCode,
              to: cityMap[destCode] || destCode,
              originCode,
              destinationCode: destCode,
              departure: depTimeStr,
              arrival: arrTimeStr,
              duration: itinerary.duration.replace('PT', '').toLowerCase(),
              price: price,
              class: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy',
              date: departureDate,
              stops: itinerary.segments.length - 1
            };
          });

          return res.status(200).json({
            success: true,
            source: 'amadeus',
            count: flights.length,
            data: flights
          });
        }
      }
    } catch (err) {
      console.warn('Amadeus API call failed, falling back:', err.message);
    }
  }

  // Fallback data generation if Amadeus API is unavailable or returns 0 results
  const fallbackResults = generateFallbackFlights(originCode, destCode, departureDate);

  return res.status(200).json({
    success: true,
    source: 'fallback',
    count: fallbackResults.length,
    data: fallbackResults
  });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Create Flight Booking Request
 * @route POST /api/v1/flights/booking-request
 * @access Public
 */
const createBookingRequest = async (req, res, next) => {
  try {
    const {
      flightId,
      airline,
      flightNumber,
      from,
      to,
      date,
      price,
      contactName,
      contactEmail,
      passengersCount,
      passengers
    } = req.body;

    if (!contactName || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Contact name and email are required.'
      });
    }

    // In-memory or logged booking request object
    const bookingRequestRecord = {
      requestId: `BR-${Date.now()}`,
      flightId: flightId || 'N/A',
      airline: airline || 'Flight Airline',
      flightNumber: flightNumber || 'N/A',
      route: `${from || 'Origin'} → ${to || 'Destination'}`,
      date: date || new Date().toISOString().split('T')[0],
      price: price || 0,
      contactName,
      contactEmail,
      passengersCount: passengersCount || 1,
      passengers: passengers || [],
      status: 'RECEIVED',
      createdAt: new Date().toISOString()
    };

    console.log('📌 [BOOKING REQUEST RECEIVED]:', bookingRequestRecord);

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully!',
      data: bookingRequestRecord
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchFlights,
  createBookingRequest
};


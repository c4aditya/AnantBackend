const fs = require('fs');
const path = require('path');
const mongoose = require('./src/models/examQuestion.model').db.base || require('mongoose');
const ExamQuestion = require('./src/models/examQuestion.model');

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const questionsData = [
  // Q1 - Written
  {
    question: "What is the role of an airport in the aviation industry? Explain the major facilities and services provided at an airport.",
    type: "written",
    level: "Beginner",
    options: [],
    correctAnswer: "",
    marks: 1
  },
  // Q2 - Written
  {
    question: "Explain the difference between a commercial airport, domestic flight, and international flight.",
    type: "written",
    level: "Beginner",
    options: [],
    correctAnswer: "",
    marks: 1
  },
  // Q3 - Written
  {
    question: "What is airport ground handling? Explain some of the major activities involved in ground handling.",
    type: "written",
    level: "Beginner",
    options: [],
    correctAnswer: "",
    marks: 1
  },
  // Q4 - Written
  {
    question: "Explain the importance of passenger safety and security at an airport. What are some common security procedures followed at airports?",
    type: "written",
    level: "Beginner",
    options: [],
    correctAnswer: "",
    marks: 1
  },
  // Q5 - Written
  {
    question: "What is the role of an airline's cabin crew? Explain their major responsibilities before, during, and after a flight.",
    type: "written",
    level: "Beginner",
    options: [],
    correctAnswer: "",
    marks: 1
  },
  // Q6 - Beginner MCQ
  {
    question: 'What does the abbreviation "ICAO" stand for?',
    type: "mcq",
    level: "Beginner",
    options: [
      "International Civil Aviation Organization",
      "International Commercial Aviation Organization",
      "Indian Civil Aviation Organization",
      "International Cargo Aviation Organization"
    ],
    correctAnswer: "International Civil Aviation Organization",
    marks: 1
  },
  // Q7 - Beginner MCQ
  {
    question: 'What does "IATA" stand for?',
    type: "mcq",
    level: "Beginner",
    options: [
      "International Airport Transport Association",
      "International Air Transport Association",
      "International Aviation Travel Authority",
      "International Airline Transport Administration"
    ],
    correctAnswer: "International Air Transport Association",
    marks: 1
  },
  // Q8 - Beginner MCQ
  {
    question: "Which of the following is primarily responsible for operating an aircraft during a flight?",
    type: "mcq",
    level: "Beginner",
    options: [
      "Ground staff",
      "Cabin crew",
      "Flight crew",
      "Airport security"
    ],
    correctAnswer: "Flight crew",
    marks: 1
  },
  // Q9 - Beginner MCQ
  {
    question: "What is the primary purpose of a boarding pass?",
    type: "mcq",
    level: "Beginner",
    options: [
      "To identify the aircraft mechanic",
      "To allow a passenger to board a specific flight",
      "To purchase aviation fuel",
      "To check aircraft maintenance records"
    ],
    correctAnswer: "To allow a passenger to board a specific flight",
    marks: 1
  },
  // Q10 - Beginner MCQ
  {
    question: "What is the area where aircraft park, load/unload passengers and cargo, and receive ground services commonly called?",
    type: "mcq",
    level: "Beginner",
    options: [
      "Runway",
      "Apron",
      "Taxiway",
      "Terminal gate"
    ],
    correctAnswer: "Apron",
    marks: 1
  },
  // Q11 - Beginner MCQ
  {
    question: "What is the primary purpose of a runway?",
    type: "mcq",
    level: "Beginner",
    options: [
      "Aircraft parking",
      "Passenger boarding",
      "Aircraft takeoff and landing",
      "Cargo storage"
    ],
    correctAnswer: "Aircraft takeoff and landing",
    marks: 1
  },
  // Q12 - Beginner MCQ
  {
    question: "What is a taxiway used for?",
    type: "mcq",
    level: "Beginner",
    options: [
      "Aircraft movement between runways and other airport areas",
      "Passenger security screening",
      "Aircraft refueling only",
      "Cargo transportation"
    ],
    correctAnswer: "Aircraft movement between runways and other airport areas",
    marks: 1
  },
  // Q13 - Beginner MCQ
  {
    question: "Which department is generally responsible for assisting passengers with check-in and boarding?",
    type: "mcq",
    level: "Beginner",
    options: [
      "Ground handling staff",
      "Aircraft maintenance",
      "Air traffic control",
      "Flight operations only"
    ],
    correctAnswer: "Ground handling staff",
    marks: 1
  },
  // Q14 - Beginner MCQ
  {
    question: 'What does "ETA" commonly mean in aviation?',
    type: "mcq",
    level: "Beginner",
    options: [
      "Estimated Time of Arrival",
      "Expected Travel Authorization",
      "Estimated Terminal Assignment",
      "Emergency Travel Approval"
    ],
    correctAnswer: "Estimated Time of Arrival",
    marks: 1
  },
  // Q15 - Beginner MCQ
  {
    question: 'What does "ETD" commonly mean?',
    type: "mcq",
    level: "Beginner",
    options: [
      "Estimated Travel Distance",
      "Estimated Time of Departure",
      "Expected Terminal Departure",
      "Emergency Time of Departure"
    ],
    correctAnswer: "Estimated Time of Departure",
    marks: 1
  },
  // Q16 - Mid-Level MCQ
  {
    question: "What is the main responsibility of Air Traffic Control (ATC)?",
    type: "mcq",
    level: "Mid-Level",
    options: [
      "Selling airline tickets",
      "Managing and controlling aircraft movements safely",
      "Cleaning aircraft cabins",
      "Loading passenger baggage"
    ],
    correctAnswer: "Managing and controlling aircraft movements safely",
    marks: 1
  },
  // Q17 - Mid-Level MCQ
  {
    question: "What is a NOTAM primarily used for?",
    type: "mcq",
    level: "Mid-Level",
    options: [
      "Recording passenger meal preferences",
      "Providing important information about changes or hazards relevant to flight operations",
      "Issuing airline tickets",
      "Recording aircraft fuel consumption"
    ],
    correctAnswer: "Providing important information about changes or hazards relevant to flight operations",
    marks: 1
  },
  // Q18 - Mid-Level MCQ
  {
    question: "What is the purpose of an aircraft turnaround?",
    type: "mcq",
    level: "Mid-Level",
    options: [
      "To permanently retire an aircraft",
      "To prepare an aircraft for its next flight after arrival",
      "To change the aircraft manufacturer",
      "To conduct only passenger immigration"
    ],
    correctAnswer: "To prepare an aircraft for its next flight after arrival",
    marks: 1
  },
  // Q19 - Mid-Level MCQ
  {
    question: "Which of the following is normally included in aircraft ground handling?",
    type: "mcq",
    level: "Mid-Level",
    options: [
      "Baggage handling",
      "Aircraft engine design",
      "Pilot licensing",
      "Aircraft manufacturing"
    ],
    correctAnswer: "Baggage handling",
    marks: 1
  },
  // Q20 - Mid-Level MCQ
  {
    question: "What is the main purpose of a flight plan?",
    type: "mcq",
    level: "Mid-Level",
    options: [
      "To record passenger complaints",
      "To provide planned flight information for operational and air traffic management purposes",
      "To calculate passenger ticket prices",
      "To assign cabin crew meals"
    ],
    correctAnswer: "To provide planned flight information for operational and air traffic management purposes",
    marks: 1
  },
  // Q21 - Advanced MCQ
  {
    question: "What is the primary purpose of an aircraft's Minimum Equipment List (MEL)?",
    type: "mcq",
    level: "Advanced",
    options: [
      "To determine passenger seating preferences",
      "To specify which inoperative equipment may be permitted under defined conditions for dispatch",
      "To calculate airline ticket prices",
      "To determine airport parking charges"
    ],
    correctAnswer: "To specify which inoperative equipment may be permitted under defined conditions for dispatch",
    marks: 1
  },
  // Q22 - Advanced MCQ
  {
    question: 'What does "CRM" stand for in aviation safety?',
    type: "mcq",
    level: "Advanced",
    options: [
      "Crew Resource Management",
      "Cabin Route Management",
      "Commercial Risk Management",
      "Crew Regulation Manual"
    ],
    correctAnswer: "Crew Resource Management",
    marks: 1
  },
  // Q23 - Advanced MCQ
  {
    question: "What is the primary objective of Crew Resource Management (CRM)?",
    type: "mcq",
    level: "Advanced",
    options: [
      "To reduce aircraft fuel prices",
      "To improve communication, teamwork, decision-making, and situational awareness among crew members",
      "To increase passenger baggage allowance",
      "To manage airline ticket sales"
    ],
    correctAnswer: "To improve communication, teamwork, decision-making, and situational awareness among crew members",
    marks: 1
  },
  // Q24 - Advanced MCQ
  {
    question: "What is the purpose of an airport's Safety Management System (SMS)?",
    type: "mcq",
    level: "Advanced",
    options: [
      "To manage airline advertisements",
      "To systematically identify hazards and manage aviation safety risks",
      "To calculate passenger fares",
      "To schedule passenger meals"
    ],
    correctAnswer: "To systematically identify hazards and manage aviation safety risks",
    marks: 1
  },
  // Q25 - Advanced MCQ
  {
    question: "What is the main purpose of an aircraft's Flight Data Recorder (FDR)?",
    type: "mcq",
    level: "Advanced",
    options: [
      "To record passenger conversations",
      "To record operational flight parameters and aircraft performance data",
      "To store passenger ticket information",
      "To control the aircraft's navigation system"
    ],
    correctAnswer: "To record operational flight parameters and aircraft performance data",
    marks: 1
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anant-airways-exams';
    console.log('Connecting to MongoDB database at:', mongoUri.split('@')[1] || mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing questions
    console.log('Clearing existing exam questions...');
    await ExamQuestion.deleteMany({});
    console.log('Existing questions cleared.');

    // Insert 25 questions sequentially to strictly preserve array order and creation timestamps
    console.log('Inserting 25 official exam questions sequentially...');
    for (const item of questionsData) {
      await ExamQuestion.create(item);
    }
    console.log(`Successfully seeded 25 questions in exact order!\n`);

    // Verify database contents sorted by createdAt
    const allQuestions = await ExamQuestion.find({}).sort({ createdAt: 1 });
    console.log('================ VERIFICATION RESULTS ================');
    console.log(`Total Questions in Database: ${allQuestions.length}`);

    allQuestions.forEach((q, index) => {
      console.log(`Q${index + 1} [${q.level}] [${q.type.toUpperCase()}] : ${q.question.substring(0, 55)}...`);
      if (q.type === 'mcq') {
        console.log(`   Options (${q.options.length}): ${q.options.join(' | ')}`);
        console.log(`   Correct Answer: ${q.correctAnswer}`);
      } else {
        console.log(`   Written question (No Options)`);
      }
    });

    console.log('======================================================');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding questions:', error);
    process.exit(1);
  }
}

seedDatabase();

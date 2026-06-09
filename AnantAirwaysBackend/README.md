# Online Examination System Backend

A production-ready Node.js, Express, and MongoDB (Mongoose) backend for an Online Examination System. This application implements secure JWT cookie-based role authentication, MVC design patterns, and in-memory test grading with cheat-prevention filters.

---

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Security**: JWT (JSON Web Tokens) in HttpOnly cookies, bcryptjs for password hashing
- **Validation**: Mongoose validators & custom checks
- **Architecture**: MVC (Model-View-Controller)

---

## 📁 Project Structure

```
src/
├── config/
│   └── db.js                 # MongoDB connection using Mongoose
├── models/
│   ├── user.model.js         # User schema & encryption methods
│   └── exam.model.js         # Exam schema & total marks pre-save triggers
├── controllers/
│   ├── auth.controller.js    # Sign-up, login (users/admins), profile, and logout
│   └── exam.controller.js    # Exam administration CRUD, publishing, and evaluation
├── routes/
│   ├── auth.routes.js        # Auth endpoint mappings
│   └── exam.routes.js        # Exam endpoint mappings
├── middlewares/
│   ├── auth.middleware.js    # Session check (protect) & role authorization guards
│   └── errorHandler.js      # Centralised global Express error handler
├── utils/
│   ├── apiResponse.js        # Standardised API JSON response wrappers
│   ├── asyncHandler.js       # Express handler wrapper to catch async exceptions
│   └── errors.js             # Custom operational error classes
├── app.js                    # Core Express server configuration
└── server.js                 # Entry point launcher (databases & listener ports)
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a URI string)

### 2. Configure Environment Variables
Create a `.env` file in the root folder (or rename `.env.example` to `.env`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/anant-airways-exams
JWT_SECRET=supersecretjwtkeyforanantairwaysexaminationbackend123456!
JWT_EXPIRE=24h
NODE_ENV=development
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application
- **Production mode**:
  ```bash
  npm start
  ```
- **Development mode** (runs with watch/reload support):
  ```bash
  npm run dev
  ```

### 5. Run Integration Tests
```bash
node test-api.js
```

---

## 🔒 Security & Architecture Explanations

### Custom Auth Matching Logic
To log in a user or admin, the application requires:
- `anantEmail`
- `password`
- `userEmail`
- `userPhoneNumber`

Rather than checking individually and risking user email/phone scanning, the controller checks the database for a combined match of the email, personal email, and personal phone number:
```javascript
const user = await User.findOne({ anantEmail, userEmail, userPhoneNumber }).select('+password');
```
If any of these details mismatch, the server returns a 400 Bad Request error with the message:
> `"User details do not match records."`

### Cheating Prevention
To prevent students from inspecting correct answers via Chrome DevTools or network interceptors:
- Admin requests retrieve the full Exam details (including `correctAnswer`).
- Student requests (`user` role) retrieve a modified list or single object where `correctAnswer` properties are omitted dynamically.

### In-Memory Grading
Exams submitted via the `submitExam` controller are graded instantly in-memory. 
- Individual question scores are aggregated based on the correctness of `selectedAnswer` compared to `correctAnswer`.
- The score percentage is returned in a clean API response.
- **No data is saved to a Result collection, keeping database transactions clean.**

---

## 📡 API Endpoints

### 🔐 Authentication Routes

All routes prefix: `/api/v1/auth`

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/create-admin` | Public | Bootstraps the first Admin profile. Role becomes `"admin"`. |
| `POST` | `/login-user` | Public | Logs in a student. Checks credentials & sets secure JWT cookie. |
| `POST` | `/login-admin` | Public | Logs in an admin. Checks credentials & sets secure JWT cookie. |
| `POST` | `/logout` | Public | Clears the JWT cookie session. |
| `GET` | `/me` | User, Admin | Returns profile information of the current logged-in session. |
| `POST` | `/add-user` | Admin | Allows an Admin to register a new Student (role `"user"`). |
| `GET` | `/users` | Admin | Retrieves lists of all registered users (passwords excluded). |

---

### 📝 Exam Routes

All routes prefix: `/api/v1/exams` (Require authenticated JWT cookie)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Admin | Creates a new exam. Total marks computed automatically. |
| `GET` | `/` | User, Admin | Lists exams. Admin gets all; User gets published only (answers hidden). |
| `GET` | `/:id` | User, Admin | Fetch single exam details. Answers hidden for User role. |
| `PUT` | `/:id` | Admin | Updates exam questions or info. Marks re-computed on save. |
| `DELETE` | `/:id` | Admin | Deletes an exam from the database. |
| `PATCH` | `/:id/publish`| Admin | Toggles exam `isPublished` visibility status. |
| `POST` | `/submit` | User, Admin | Evaluates answers, calculates grades in-memory, returns score. |

---

## 📯 Payload & Response Examples

### 1. Add User (Admin Route)
- **Endpoint**: `POST /api/v1/auth/add-user`
- **Body**:
  ```json
  {
    "anantEmail": "exam.taker@anantairways.com",
    "password": "strongPassword123",
    "userEmail": "personal.taker@gmail.com",
    "userPhoneNumber": "+15550199"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "User added successfully",
    "data": {
      "user": {
        "_id": "603d65b7...",
        "anantEmail": "exam.taker@anantairways.com",
        "userEmail": "personal.taker@gmail.com",
        "userPhoneNumber": "+15550199",
        "role": "user",
        "isActive": true,
        "createdAt": "2026-06-06T12:00:00.000Z"
      }
    }
  }
  ```

### 2. Create Exam (Admin Route)
- **Endpoint**: `POST /api/v1/exams`
- **Body**:
  ```json
  {
    "title": "Cabin Crew Safety Test",
    "description": "Safety procedure checks",
    "durationInMinutes": 45,
    "questions": [
      {
        "question": "What is the emergency code for hijacking?",
        "options": ["7500", "7700", "7600"],
        "correctAnswer": "7500",
        "marks": 5
      }
    ]
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Exam created successfully",
    "data": {
      "exam": {
        "_id": "603d6f10...",
        "title": "Cabin Crew Safety Test",
        "description": "Safety procedure checks",
        "durationInMinutes": 45,
        "questions": [
          {
            "_id": "603d6f10...a1",
            "question": "What is the emergency code for hijacking?",
            "options": ["7500", "7700", "7600"],
            "correctAnswer": "7500",
            "marks": 5
          }
        ],
        "totalMarks": 5,
        "createdBy": "603d65b7...",
        "isPublished": false,
        "createdAt": "2026-06-06T12:10:00.000Z"
      }
    }
  }
  ```

### 3. Submit Exam (Student Route)
- **Endpoint**: `POST /api/v1/exams/submit`
- **Body**:
  ```json
  {
    "examId": "603d6f10...",
    "answers": [
      {
        "questionId": "603d6f10...a1",
        "selectedAnswer": "7500"
      }
    ]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Exam submitted and graded successfully",
    "data": {
      "summary": {
        "examId": "603d6f10...",
        "examTitle": "Cabin Crew Safety Test",
        "totalQuestions": 1,
        "correctAnswersCount": 1,
        "incorrectAnswersCount": 0,
        "totalMarks": 5,
        "marksObtained": 5,
        "percentage": 100
      },
      "evaluation": [
        {
          "questionId": "603d6f10...a1",
          "question": "What is the emergency code for hijacking?",
          "options": ["7500", "7700", "7600"],
          "selectedAnswer": "7500",
          "isCorrect": true,
          "marks": 5,
          "marksAwarded": 5
        }
      ]
    }
  }
  ```

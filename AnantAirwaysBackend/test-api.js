const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = 5005;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;
let server;

// Helper to extract cookies from headers
const getCookie = (headers) => {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  // Extract token value
  const match = setCookie.match(/token=([^;]+)/);
  return match ? `token=${match[1]}` : null;
};

const runTests = async () => {
  try {
    console.log('--- STARTING ONLINE EXAMINATION SYSTEM INTEGRATION TESTS ---');

    // Connect to database and clear it
    console.log('Connecting to database...');
    await mongoose.connect('mongodb://127.0.0.1:27017/anant-airways-exams-test');
    console.log('Clearing test database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped.');

    // Start Express server
    console.log(`Starting server on port ${PORT}...`);
    server = app.listen(PORT);
    console.log('Server started.');

    // 1. Create Admin
    console.log('\nTest 1: Creating an Admin...');
    const createAdminRes = await fetch(`${BASE_URL}/auth/create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anantEmail: 'admin@anantairways.com',
        password: 'adminpassword123',
        userEmail: 'admin.personal@gmail.com',
        userPhoneNumber: '+19876543210'
      })
    });
    
    const adminData = await createAdminRes.json();
    if (createAdminRes.status !== 201 || !adminData.success) {
      throw new Error(`Create admin failed: ${JSON.stringify(adminData)}`);
    }
    console.log('✓ Admin created successfully with role:', adminData.data.user.role);
    const adminCookie = getCookie(createAdminRes.headers);
    if (!adminCookie) {
      throw new Error('No JWT token cookie set in headers for Admin creation');
    }
    console.log('✓ Admin cookie extracted successfully');

    // 2. Admin Login
    console.log('\nTest 2: Logging in as Admin...');
    const loginAdminRes = await fetch(`${BASE_URL}/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anantEmail: 'admin@anantairways.com',
        password: 'adminpassword123',
        userEmail: 'admin.personal@gmail.com',
        userPhoneNumber: '+19876543210'
      })
    });
    const loginAdminData = await loginAdminRes.json();
    if (loginAdminRes.status !== 200 || !loginAdminData.success) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginAdminData)}`);
    }
    console.log('✓ Admin logged in successfully.');

    // 3. User Login before addition (should fail)
    console.log('\nTest 3: Attempt User Login for non-existent user...');
    const loginFailRes = await fetch(`${BASE_URL}/auth/login-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anantEmail: 'user@anantairways.com',
        password: 'userpassword123',
        userEmail: 'user.personal@gmail.com',
        userPhoneNumber: '+11234567890'
      })
    });
    const loginFailData = await loginFailRes.json();
    if (loginFailRes.status !== 400 || loginFailData.message !== 'User details do not match records.') {
      throw new Error(`Expected error 'User details do not match records.', but got status ${loginFailRes.status} and message: ${loginFailData.message}`);
    }
    console.log('✓ Correctly failed login with:', loginFailData.message);

    // 4. Admin adds a user
    console.log('\nTest 4: Admin adding a User...');
    const addUserRes = await fetch(`${BASE_URL}/auth/add-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        anantEmail: 'student@anantairways.com',
        password: 'studentpassword123',
        userEmail: 'student@anantairways.com',
        userPhoneNumber: '+12223334444'
      })
    });
    const addUserData = await addUserRes.json();
    if (addUserRes.status !== 201 || !addUserData.success) {
      throw new Error(`Add user failed: ${JSON.stringify(addUserData)}`);
    }
    console.log('✓ User added successfully:', addUserData.data.user.anantEmail);

    // 5. User Login with incorrect details mismatch check
    console.log('\nTest 5: Logging in as User with incorrect personal email...');
    const loginUserMismatchRes = await fetch(`${BASE_URL}/auth/login-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anantEmail: 'wrong.student@anantairways.com', // Wrong
        password: 'studentpassword123',
        userEmail: 'student@anantairways.com',
        userPhoneNumber: '+12223334444'
      })
    });
    const loginUserMismatchData = await loginUserMismatchRes.json();
    if (loginUserMismatchRes.status !== 400 || loginUserMismatchData.message !== 'User details do not match records.') {
      throw new Error(`Expected user validation check to fail, got: ${JSON.stringify(loginUserMismatchData)}`);
    }
    console.log('✓ Mismatch personal email successfully failed with:', loginUserMismatchData.message);

    // 6. User login with correct details
    console.log('\nTest 6: Logging in as User with correct details...');
    const loginUserRes = await fetch(`${BASE_URL}/auth/login-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anantEmail: 'student@anantairways.com',
        password: 'studentpassword123',
        userEmail: 'student@anantairways.com',
        userPhoneNumber: '+12223334444'
      })
    });
    const loginUserData = await loginUserRes.json();
    if (loginUserRes.status !== 200 || !loginUserData.success) {
      throw new Error(`User login failed: ${JSON.stringify(loginUserData)}`);
    }
    const userCookie = getCookie(loginUserRes.headers);
    if (!userCookie) {
      throw new Error('No user token cookie returned');
    }
    console.log('✓ User logged in successfully. Cookie saved.');

    // 7. Get Current User profile
    console.log('\nTest 7: Fetching current user profile...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': userCookie }
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.data.user.anantEmail !== 'student@anantairways.com') {
      throw new Error(`Profile check failed: ${JSON.stringify(meData)}`);
    }
    console.log('✓ Current user profile matched:', meData.data.user.anantEmail);

    // 8. Admin creates exam
    console.log('\nTest 8: Admin creating an Exam...');
    const createExamRes = await fetch(`${BASE_URL}/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        title: 'Anant Airways Flight Safety Exam',
        description: 'Basic test on emergency procedures and protocols.',
        durationInMinutes: 30,
        questions: [
          {
            question: 'What is the standard emergency emergency squawk code for hijacking?',
            options: ['7500', '7600', '7700', '7200'],
            correctAnswer: '7500',
            marks: 5
          },
          {
            question: 'In case of cabin depressurisation, what should you do first?',
            options: ['Put on your own oxygen mask', 'Help passengers with their masks', 'Deploy liferafts', 'Initiate emergency descent'],
            correctAnswer: 'Put on your own oxygen mask',
            marks: 5
          }
        ]
      })
    });
    const createExamData = await createExamRes.json();
    if (createExamRes.status !== 201 || !createExamData.success) {
      throw new Error(`Create exam failed: ${JSON.stringify(createExamData)}`);
    }
    const examId = createExamData.data.exam._id;
    console.log('✓ Exam created with ID:', examId);
    console.log('✓ Total Marks auto-calculated to:', createExamData.data.exam.totalMarks);
    if (createExamData.data.exam.totalMarks !== 10) {
      throw new Error(`Expected totalMarks to be 10, got ${createExamData.data.exam.totalMarks}`);
    }

    // 9. User fetches exams (should be empty as the exam is not published)
    console.log('\nTest 9: User fetching exams (unpublished state)...');
    const userExamsRes = await fetch(`${BASE_URL}/exams`, {
      headers: { 'Cookie': userCookie }
    });
    const userExamsData = await userExamsRes.json();
    if (userExamsRes.status !== 200 || userExamsData.data.exams.length !== 0) {
      throw new Error(`Expected 0 exams for user, got: ${userExamsData.data.exams.length}`);
    }
    console.log('✓ User retrieved 0 published exams successfully.');

    // 10. Admin publishes exam
    console.log('\nTest 10: Admin publishing the Exam...');
    const publishRes = await fetch(`${BASE_URL}/exams/${examId}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({ isPublished: true })
    });
    const publishData = await publishRes.json();
    if (publishRes.status !== 200 || !publishData.data.exam.isPublished) {
      throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
    }
    console.log('✓ Exam published successfully.');

    // 11. User fetches exams (should now see the exam)
    console.log('\nTest 11: User fetching exams (published state)...');
    const userExamsPublishedRes = await fetch(`${BASE_URL}/exams`, {
      headers: { 'Cookie': userCookie }
    });
    const userExamsPublishedData = await userExamsPublishedRes.json();
    if (userExamsPublishedRes.status !== 200 || userExamsPublishedData.data.exams.length !== 1) {
      throw new Error(`Expected 1 exam, got: ${userExamsPublishedData.data.exams.length}`);
    }
    console.log('✓ User sees the exam:', userExamsPublishedData.data.exams[0].title);
    
    // Verify that user CANNOT see the correctAnswers in list
    const userQuestion = userExamsPublishedData.data.exams[0].questions[0];
    if (userQuestion.correctAnswer) {
      throw new Error('Security Breach: correctAnswers are exposed in the user exam list!');
    }
    console.log('✓ Verified: user exam list strips correctAnswers.');

    // 12. User fetches single exam details
    console.log('\nTest 12: User fetching single exam details...');
    const singleExamRes = await fetch(`${BASE_URL}/exams/${examId}`, {
      headers: { 'Cookie': userCookie }
    });
    const singleExamData = await singleExamRes.json();
    if (singleExamRes.status !== 200) {
      throw new Error(`Failed to fetch single exam: ${JSON.stringify(singleExamData)}`);
    }
    const q1 = singleExamData.data.exam.questions[0];
    if (q1.correctAnswer) {
      throw new Error('Security Breach: correctAnswer exposed in single exam fetch!');
    }
    console.log('✓ Verified: single exam details strips correctAnswers.');

    // 13. User submits exam answers (one correct, one incorrect)
    console.log('\nTest 13: User submitting exam answers...');
    // We need the question IDs from the singleExamData
    const qId1 = singleExamData.data.exam.questions[0]._id;
    const qId2 = singleExamData.data.exam.questions[1]._id;

    const submitRes = await fetch(`${BASE_URL}/exams/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        examId: examId,
        answers: [
          {
            questionId: qId1,
            selectedAnswer: '7500' // Correct
          },
          {
            questionId: qId2,
            selectedAnswer: 'Initiate emergency descent' // Incorrect
          }
        ]
      })
    });
    const submitData = await submitRes.json();
    if (submitRes.status !== 200 || !submitData.success) {
      throw new Error(`Submission failed: ${JSON.stringify(submitData)}`);
    }
    
    const summary = submitData.data.summary;
    console.log('✓ Exam submission graded in-memory:');
    console.log('  Total Marks:', summary.totalMarks);
    console.log('  Marks Obtained:', summary.marksObtained);
    console.log('  Correct Answers Count:', summary.correctAnswersCount);
    console.log('  Incorrect Answers Count:', summary.incorrectAnswersCount);
    console.log('  Percentage Score:', summary.percentage + '%');

    if (summary.marksObtained !== 5 || summary.correctAnswersCount !== 1) {
      throw new Error(`Grading math is wrong! Expected 5 marks, got: ${summary.marksObtained}`);
    }
    console.log('✓ Grading math validated correctly.');

    // Clean up
    console.log('\n--- ALL INTEGRATION TESTS PASSED SUCCESSFULY ---');
    cleanup(0);
  } catch (error) {
    console.error('\n❌ TEST RUN ERROR:', error.message);
    console.error(error.stack);
    cleanup(1);
  }
};

const cleanup = async (exitCode) => {
  console.log('Cleaning up connections...');
  if (server) {
    server.close();
  }
  await mongoose.connection.close();
  console.log(`Exiting test runner with code ${exitCode}.`);
  process.exit(exitCode);
};

// Start the tests
runTests();

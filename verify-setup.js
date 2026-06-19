#!/usr/bin/env node

/**
 * Quick Verification Script for Safe Learning Spot Centre
 * Run this in your backend directory to verify setup
 * Usage: node verify-setup.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  Safe Learning Spot Centre - Setup Verification Script        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

const check = (name, condition, details = '') => {
  if (condition) {
    console.log(`✓ ${name}`);
    if (details) console.log(`  ${details}`);
    passCount++;
  } else {
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
    failCount++;
  }
};

const checkFile = (filePath, description) => {
  const exists = fs.existsSync(filePath);
  check(
    description,
    exists,
    exists ? `Found at: ${filePath}` : `NOT FOUND: ${filePath}`
  );
  return exists;
};

// 1. Environment Variables
console.log('\n📋 ENVIRONMENT VARIABLES\n');
check('TEST_MODE is set', process.env.TEST_MODE === 'true', `Value: ${process.env.TEST_MODE}`);
check('NODE_ENV is set', process.env.NODE_ENV, `Value: ${process.env.NODE_ENV}`);
check('DATABASE_URL is set', !!process.env.DATABASE_URL, process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
check('JWT_SECRET is set', !!process.env.JWT_SECRET, process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');
check('PORT is set', process.env.PORT, `Value: ${process.env.PORT}`);
check('FRONTEND_URL is set', process.env.FRONTEND_URL, `Value: ${process.env.FRONTEND_URL}`);

// 2. Required Files
console.log('\n📁 REQUIRED FILES\n');
checkFile(path.join(__dirname, '.env'), 'Backend .env file');
checkFile(path.join(__dirname, 'server.js'), 'Server entry point');
checkFile(path.join(__dirname, 'routes', 'courses.js'), 'Courses routes');
checkFile(path.join(__dirname, 'routes', 'coursesData.js'), 'Courses data');
checkFile(path.join(__dirname, 'routes', 'payment.js'), 'Payment routes');
checkFile(path.join(__dirname, 'routes', 'auth.js'), 'Auth routes');
checkFile(path.join(__dirname, 'middleware', 'auth.js'), 'Auth middleware');

// 3. Frontend Files
console.log('\n🎨 FRONTEND FILES\n');
checkFile(path.join(__dirname, 'frontend', '.env.local'), 'Frontend .env.local');
checkFile(path.join(__dirname, 'frontend', 'src', 'pages', 'CourseView.js'), 'CourseView component');
checkFile(path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.js'), 'Dashboard component');
checkFile(path.join(__dirname, 'frontend', 'src', 'services', 'api.js'), 'API service');

// 4. Courses Data Validation
console.log('\n📚 COURSES DATA VALIDATION\n');
try {
  const coursesDataPath = path.join(__dirname, 'routes', 'coursesData.js');
  if (fs.existsSync(coursesDataPath)) {
    // Read and parse the file
    const coursesContent = fs.readFileSync(coursesDataPath, 'utf-8');

    // Check for expected content
    const has7Courses = coursesContent.match(/id:\s*[1-7]\s*,/g)?.length >= 7;
    check('Has 7 courses defined', has7Courses, has7Courses ? '✓ All 7 courses found' : '✗ Missing courses');

    const hasFriendship = coursesContent.includes('Friendship as Weaponry');
    check('Course 1: Friendship as Weaponry', hasFriendship);

    const hasRelationships = coursesContent.includes('Relationships: 2-Step Verification');
    check('Course 2: Relationships: 2-Step Verification', hasRelationships);

    const hasEnergy = coursesContent.includes('Energy Harvesting & Sacred Sexuality');
    check('Course 3: Energy Harvesting & Sacred Sexuality', hasEnergy);

    const hasFinancial = coursesContent.includes('Financial Truth & Reversal');
    check('Course 4: Financial Truth & Reversal', hasFinancial);

    const hasFamily = coursesContent.includes('Family Patterns & Scapegoating');
    check('Course 5: Family Patterns & Scapegoating', hasFamily);

    const hasInstitutional = coursesContent.includes('Institutional Brainwashing');
    check('Course 6: Institutional Brainwashing', hasInstitutional);

    const hasMedia = coursesContent.includes('Media & Narrative Control');
    check('Course 7: Media & Narrative Control', hasMedia);

    const hasExportDefault = coursesContent.includes('export default COURSES');
    check('Exports courses with default export', hasExportDefault);
  }
} catch (err) {
  console.log(`✗ Error validating courses data: ${err.message}`);
  failCount++;
}

// 5. Critical Configuration
console.log('\n⚙️  CRITICAL CONFIGURATION\n');
check('Backend will run in TEST_MODE', process.env.TEST_MODE === 'true');
check('Courses API will be available', fs.existsSync(path.join(__dirname, 'routes', 'courses.js')));
check('Payment API will grant free access', fs.existsSync(path.join(__dirname, 'routes', 'payment.js')));

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log(`║  VERIFICATION SUMMARY                                          ║`);
console.log(`║  ✓ Passed: ${passCount}                                                  ║`);
console.log(`║  ✗ Failed: ${failCount}                                                  ║`);

if (failCount === 0) {
  console.log(`║  Status: ✓ All checks passed! Ready to launch.                 ║`);
} else {
  console.log(`║  Status: ✗ Some checks failed. See above for details.          ║`);
}

console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Next Steps
console.log('NEXT STEPS:\n');
if (failCount === 0) {
  console.log('1. Start the backend server:');
  console.log('   node server.js\n');
  console.log('2. Start the frontend server (in another terminal):');
  console.log('   cd frontend && npm start\n');
  console.log('3. Visit http://localhost:3000 and test the courses\n');
  console.log('4. Check browser console (F12) for debug messages\n');
} else {
  console.log('Fix the failed checks above before starting the servers.\n');
  console.log('Most common issues:');
  console.log('- TEST_MODE not set to "true" in .env');
  console.log('- Missing frontend/.env.local file');
  console.log('- coursesData.js not exporting all 7 courses\n');
}

process.exit(failCount > 0 ? 1 : 0);

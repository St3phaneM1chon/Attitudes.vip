#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n🧪 Running API Integration Tests\n'));

// Test suites to run
const testSuites = [
  { name: 'Authentication', file: 'auth.test.js' },
  { name: 'Weddings', file: 'weddings.test.js' },
  { name: 'Guest Management', file: 'guests.test.js' },
  { name: 'Vendor Bookings', file: 'vendors.test.js' },
  { name: 'Payments', file: 'payments.test.js' }
];

// Environment setup
const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-key',
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: '3001' // Use different port for tests
};

// Run specific test suite or all
const targetSuite = process.argv[2];
let testFiles = [];

if (targetSuite) {
  const suite = testSuites.find(s => s.file === targetSuite || s.name.toLowerCase() === targetSuite.toLowerCase());
  if (suite) {
    testFiles = [path.join(__dirname, suite.file)];
    console.log(chalk.yellow(`Running ${suite.name} tests only\n`));
  } else {
    console.log(chalk.red(`Unknown test suite: ${targetSuite}`));
    console.log(chalk.gray('Available suites:'));
    testSuites.forEach(s => {
      console.log(chalk.gray(`  - ${s.name} (${s.file})`));
    });
    process.exit(1);
  }
} else {
  testFiles = testSuites.map(s => path.join(__dirname, s.file));
  console.log(chalk.yellow('Running all integration test suites\n'));
}

// Jest arguments
const jestArgs = [
  '--config', path.join(__dirname, 'jest.config.js'),
  '--runInBand', // Run tests serially to avoid conflicts
  '--detectOpenHandles',
  '--forceExit',
  ...testFiles
];

// Add coverage if requested
if (process.argv.includes('--coverage')) {
  jestArgs.push('--coverage');
  jestArgs.push('--coverageDirectory', path.join(__dirname, 'coverage'));
}

// Add watch mode if requested
if (process.argv.includes('--watch')) {
  jestArgs.push('--watch');
}

// Add verbose if requested
if (process.argv.includes('--verbose')) {
  jestArgs.push('--verbose');
}

// Pre-test checks
console.log(chalk.gray('Pre-test checks:'));
console.log(chalk.gray(`  - Test environment: ${testEnv.NODE_ENV}`));
console.log(chalk.gray(`  - API port: ${testEnv.PORT}`));
console.log(chalk.gray(`  - Database: ${testEnv.SUPABASE_URL}`));
console.log(chalk.gray(`  - Redis: ${testEnv.REDIS_URL}\n`));

// Run Jest
const jest = spawn('npx', ['jest', ...jestArgs], {
  env: testEnv,
  stdio: 'inherit'
});

jest.on('close', (code) => {
  if (code === 0) {
    console.log(chalk.green.bold('\n✅ All integration tests passed!\n'));
  } else {
    console.log(chalk.red.bold(`\n❌ Integration tests failed with code ${code}\n`));
  }
  process.exit(code);
});

jest.on('error', (error) => {
  console.error(chalk.red('Failed to start Jest:'), error);
  process.exit(1);
});
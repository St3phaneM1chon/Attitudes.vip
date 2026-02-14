module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Répertoire de couverture
  coverageDirectory: 'coverage',
  
  // Fichiers à inclure dans la couverture
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/server.js',
    '!**/node_modules/**'
  ],
  
  // Patterns de fichiers de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Ignorer ces chemins
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  
  // Configuration des seuils de couverture
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Transformations
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Variables globales
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Timeout
  testTimeout: 10000,
  
  // Verbose
  verbose: true,
  
  // Afficher la couverture après les tests
  collectCoverage: false,
  
  // Mapper les modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
}
// Diagnostic startup - catch ALL errors to stdout
console.log('=== DIAGNOSTIC STARTUP ===')
console.log('Node version:', process.version)
console.log('PORT:', process.env.PORT)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
console.log('REDIS_URL exists:', !!process.env.REDIS_URL)
console.log('CWD:', process.cwd())

// Catch everything
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message)
  console.error('Stack:', err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason)
  process.exit(1)
})

// Test requires one by one
const modules = [
  ['http', 'http'],
  ['express', 'express'],
  ['cors', 'cors'],
  ['helmet', 'helmet'],
  ['morgan', 'morgan'],
  ['compression', 'compression'],
  ['express-rate-limit', 'express-rate-limit'],
  ['dotenv', 'dotenv'],
  ['winston', 'winston'],
  ['winston-daily-rotate-file', 'winston-daily-rotate-file'],
  ['sequelize', 'sequelize'],
  ['pg', 'pg'],
  ['ioredis', 'ioredis'],
  ['jsonwebtoken', 'jsonwebtoken'],
  ['bcryptjs', 'bcryptjs'],
  ['passport', 'passport'],
  ['multer', 'multer'],
  ['nodemailer', 'nodemailer'],
  ['socket.io', 'socket.io'],
]

console.log('\n=== TESTING MODULE REQUIRES ===')
for (const [name, mod] of modules) {
  try {
    require(mod)
    console.log(`✅ ${name}`)
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`)
  }
}

// Test local modules
console.log('\n=== TESTING LOCAL MODULES ===')
const localModules = [
  ['./utils/logger', './utils/logger'],
  ['./middleware/error-handler', './middleware/error-handler'],
  ['./models', './models'],
  ['./services/cache/redis-cache', './services/cache/redis-cache'],
  ['./services/websocket/websocket-service', './services/websocket/websocket-service'],
  ['./app', './app'],
]

for (const [name, mod] of localModules) {
  try {
    require(mod)
    console.log(`✅ ${name}`)
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`)
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error(`   Missing: ${err.requireStack ? err.requireStack.join(' -> ') : 'unknown'}`)
    }
  }
}

// If we get here, try starting the actual server
console.log('\n=== STARTING ACTUAL SERVER ===')
try {
  require('./server')
} catch (err) {
  console.error('SERVER STARTUP ERROR:', err.message)
  console.error('Stack:', err.stack)
  process.exit(1)
}

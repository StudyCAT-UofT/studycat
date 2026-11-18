/**
 * Startup checks for the Node.js server, loaded from instrumentation.ts.
 *
 * Configuration that would make a production server insecure stops the process here, so
 * it fails visibly at deploy time. (Throwing from register() is not enough: Next.js logs
 * the error but keeps serving, answering every request with a 500.)
 */
import { jwtSecretProblem } from './lib/jwt'

if (process.env.NODE_ENV === 'production') {
  const problem = jwtSecretProblem(process.env.JWT_SECRET)
  if (problem) {
    console.error(`Refusing to start: ${problem}. Generate one with: openssl rand -base64 48`)
    process.exit(1)
  }
}

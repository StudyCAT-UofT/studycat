import pino from 'pino';
import pretty from 'pino-pretty';

const isDev = process.env.NODE_ENV !== 'production';

// pino-pretty is used as a direct destination stream (not via pino's
// worker-thread `transport` option) so it survives being bundled by
// Turbopack/webpack for the Next.js server build.
const destination = isDev
  ? pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
  : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { service: 'studycat' },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: { err: pino.stdSerializers.err },
    redact: {
      paths: ['headers.cookie', 'headers.authorization', 'password', '*.password', 'token', '*.token'],
      censor: '[REDACTED]',
    },
  },
  destination
);

import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Missing env vars: ${missing.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  otpExpirySeconds: Number(process.env.OTP_EXPIRY_SECONDS) || 300,
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

loadEnv({ path: './.env', quiet: true });

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRY = process.env.JWT_EXPIRY;
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
export const FILE_PATH = process.env.FILE_PATH;
export const LOGO_URL = process.env.LOGO_URL;
export const API_URL = process.env.API_URL;
export const WEB_URL = process.env.WEB_URL;
export const FREE_TRIAL_DAYS = process.env.FREE_TRIAL_DAYS;
export const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
export const twillio_accountSid = process.env.twillio_accountSid;
export const twillio_authToken = process.env.twillio_authToken;
export const twillio_serviceSid = process.env.twillio_serviceSid;
export const twilio_number = process.env.twilio_number;
export const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
export const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const smtpConfig = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
}

export const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_DATABASE,
};

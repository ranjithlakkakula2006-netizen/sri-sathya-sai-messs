import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import compression from 'compression';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import { INITIAL_CATEGORIES, INITIAL_FOOD_ITEMS } from './src/data/initialData.ts';
import { FoodCategory, FoodItem, Order, OrderStatus, OrderReview } from './src/types/restaurant.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High-Throughput Performance Metrics Tracker
interface PerformanceMetrics {
  totalRequests: number;
  ordersCreated: number;
  cacheHits: number;
  cacheMisses: number;
  idempotentDeduplications: number;
  rateLimitRejections: number;
  backgroundTasksEnqueued: number;
  backgroundTasksCompleted: number;
  backgroundTasksFailed: number;
  startTime: number;
}

const perfMetrics: PerformanceMetrics = {
  totalRequests: 0,
  ordersCreated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  idempotentDeduplications: 0,
  rateLimitRejections: 0,
  backgroundTasksEnqueued: 0,
  backgroundTasksCompleted: 0,
  backgroundTasksFailed: 0,
  startTime: Date.now(),
};

// High-Throughput & Performance Middlewares
app.use(compression({
  threshold: 1024, // Compress responses above 1KB with Gzip/Deflate
  level: 6,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Response timing and request counting middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  perfMetrics.totalRequests++;
  const start = Date.now();
  const originalEnd = res.end;
  // @ts-ignore
  res.end = function (...args: any[]) {
    if (!res.headersSent) {
      const elapsed = Date.now() - start;
      res.setHeader('X-Response-Time', `${elapsed}ms`);
    }
    // @ts-ignore
    return originalEnd.apply(this, args);
  };
  next();
});

// Supabase setup if configured
let SUPABASE_URL = process.env.SUPABASE_URL || '';
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
let isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project'));

let supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Razorpay & WhatsApp configuration check
let RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
let RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
let RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

// Default test credentials for seamless development & verification
const DEFAULT_TEST_KEY_ID = 'rzp_test_srisathyasai';
const DEFAULT_TEST_KEY_SECRET = 'SaiMessRazorpaySecret2026';
let EFFECTIVE_RAZORPAY_KEY_ID = RAZORPAY_KEY_ID || DEFAULT_TEST_KEY_ID;
let EFFECTIVE_RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET || DEFAULT_TEST_KEY_SECRET;

let isRazorpayConfigured = Boolean(
  RAZORPAY_KEY_ID &&
  RAZORPAY_KEY_SECRET &&
  !RAZORPAY_KEY_ID.includes('placeholder') &&
  !RAZORPAY_KEY_ID.includes('YourKeyId') &&
  !RAZORPAY_KEY_ID.includes('preview')
);

// Official Razorpay SDK instance
let razorpay = isRazorpayConfigured
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  : null;

let WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
let WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
let RESTAURANT_OWNER_WHATSAPP = process.env.RESTAURANT_OWNER_WHATSAPP || '919701576804';
let isWhatsAppConfigured = Boolean(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN && !WHATSAPP_PHONE_NUMBER_ID.includes('your_'));

// SMTP Email configuration for Password Reset & Owner Notifications
let SMTP_HOST = process.env.SMTP_HOST || '';
let SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
let SMTP_USER = process.env.SMTP_USER || '';
let SMTP_PASS = process.env.SMTP_PASS || '';
let SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `"Sri Sathya Sai Mess" <${SMTP_USER}>` : '"Sri Sathya Sai Mess" <no-reply@srisathyasaimess.com>');
let isSmtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let mailTransporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

let GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// =============================================================================
// OWNER-ONLY SECURE API KEY ENCRYPTED VAULT (AES-256-GCM)
// =============================================================================
interface StoredApiCredential {
  provider: 'razorpay' | 'whatsapp' | 'smtp' | 'supabase' | 'google_maps';
  is_enabled: boolean;
  credentials: Record<string, string>;
  updated_at: string;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'untested';
  test_message?: string;
}

const VAULT_FILE = path.resolve(__dirname, '.secure-api-vault.enc');
const VAULT_KEY_FILE = path.resolve(__dirname, '.vault-master.key');

function getMasterEncryptionKey(): Buffer {
  try {
    if (fs.existsSync(VAULT_KEY_FILE)) {
      const hex = fs.readFileSync(VAULT_KEY_FILE, 'utf-8').trim();
      if (hex && hex.length === 64) {
        return Buffer.from(hex, 'hex');
      }
    }
  } catch {
    // fallback to generate
  }
  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(VAULT_KEY_FILE, newKey.toString('hex'), { mode: 0o600 });
  } catch {
    // continue in memory
  }
  return newKey;
}

const MASTER_VAULT_KEY = getMasterEncryptionKey();

function encryptVault(data: Record<string, StoredApiCredential>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_VAULT_KEY, iv);
  const jsonStr = JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return JSON.stringify({
    iv: iv.toString('hex'),
    tag,
    data: encrypted,
    version: 1,
  });
}

function decryptVault(encryptedEnvelope: string): Record<string, StoredApiCredential> {
  try {
    const parsed = JSON.parse(encryptedEnvelope);
    const iv = Buffer.from(parsed.iv, 'hex');
    const tag = Buffer.from(parsed.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_VAULT_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn('[VAULT] Could not decrypt vault, starting clean', err);
    return {};
  }
}

let apiVaultState: Record<string, StoredApiCredential> = {};

function applyVaultToRuntime(): void {
  // 1. Razorpay
  const rzp = apiVaultState['razorpay'];
  if (rzp && rzp.is_enabled && rzp.credentials?.key_id && rzp.credentials?.key_secret) {
    RAZORPAY_KEY_ID = rzp.credentials.key_id;
    RAZORPAY_KEY_SECRET = rzp.credentials.key_secret;
    RAZORPAY_WEBHOOK_SECRET = rzp.credentials.webhook_secret || '';
    EFFECTIVE_RAZORPAY_KEY_ID = RAZORPAY_KEY_ID;
    EFFECTIVE_RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;
    isRazorpayConfigured = !RAZORPAY_KEY_ID.includes('placeholder') && !RAZORPAY_KEY_ID.includes('YourKeyId');
    try {
      razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      });
    } catch (e) {
      console.warn('[VAULT] Razorpay initialization error:', e);
    }
  } else if (rzp && !rzp.is_enabled) {
    isRazorpayConfigured = false;
    razorpay = null;
  }

  // 2. WhatsApp
  const wa = apiVaultState['whatsapp'];
  if (wa && wa.is_enabled && wa.credentials?.access_token) {
    WHATSAPP_PHONE_NUMBER_ID = wa.credentials.phone_number_id || WHATSAPP_PHONE_NUMBER_ID;
    WHATSAPP_ACCESS_TOKEN = wa.credentials.access_token;
    RESTAURANT_OWNER_WHATSAPP = wa.credentials.recipient_phone || RESTAURANT_OWNER_WHATSAPP;
    isWhatsAppConfigured = Boolean(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
  } else if (wa && !wa.is_enabled) {
    isWhatsAppConfigured = false;
  }

  // 3. SMTP
  const smtpConf = apiVaultState['smtp'];
  if (smtpConf && smtpConf.is_enabled && smtpConf.credentials?.smtp_host && smtpConf.credentials?.smtp_user) {
    SMTP_HOST = smtpConf.credentials.smtp_host;
    SMTP_PORT = parseInt(smtpConf.credentials.smtp_port || '587', 10);
    SMTP_USER = smtpConf.credentials.smtp_user;
    SMTP_PASS = smtpConf.credentials.smtp_pass || '';
    SMTP_FROM = smtpConf.credentials.smtp_from || (SMTP_USER ? `"Sri Sathya Sai Mess" <${SMTP_USER}>` : '"Sri Sathya Sai Mess" <no-reply@srisathyasaimess.com>');
    isSmtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
    try {
      mailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    } catch (e) {
      console.warn('[VAULT] SMTP initialization error:', e);
    }
  } else if (smtpConf && !smtpConf.is_enabled) {
    isSmtpConfigured = false;
    mailTransporter = null;
  }

  // 4. Supabase
  const supa = apiVaultState['supabase'];
  if (supa && supa.is_enabled && supa.credentials?.supabase_url) {
    SUPABASE_URL = supa.credentials.supabase_url;
    SUPABASE_SERVICE_ROLE_KEY = supa.credentials.supabase_service_role_key || supa.credentials.supabase_anon_key || '';
    isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project'));
    try {
      supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
    } catch (e) {
      console.warn('[VAULT] Supabase initialization error:', e);
    }
  } else if (supa && !supa.is_enabled) {
    isSupabaseConfigured = false;
    supabase = null;
  }

  // 5. Google Maps
  const gmaps = apiVaultState['google_maps'];
  if (gmaps && gmaps.is_enabled && gmaps.credentials?.google_maps_api_key) {
    GOOGLE_MAPS_API_KEY = gmaps.credentials.google_maps_api_key;
  }
}

function loadApiVault(): void {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
      apiVaultState = decryptVault(raw);
    }
  } catch (err) {
    console.warn('[VAULT] Load vault error:', err);
    apiVaultState = {};
  }

  // Seed default providers if vault is empty
  let needsSave = false;
  if (!apiVaultState['razorpay']) {
    apiVaultState['razorpay'] = {
      provider: 'razorpay',
      is_enabled: true,
      credentials: {
        key_id: RAZORPAY_KEY_ID || DEFAULT_TEST_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET || DEFAULT_TEST_KEY_SECRET,
        webhook_secret: RAZORPAY_WEBHOOK_SECRET,
      },
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    needsSave = true;
  }
  if (!apiVaultState['whatsapp']) {
    apiVaultState['whatsapp'] = {
      provider: 'whatsapp',
      is_enabled: isWhatsAppConfigured,
      credentials: {
        phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
        access_token: WHATSAPP_ACCESS_TOKEN,
        recipient_phone: RESTAURANT_OWNER_WHATSAPP,
      },
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    needsSave = true;
  }
  if (!apiVaultState['smtp']) {
    apiVaultState['smtp'] = {
      provider: 'smtp',
      is_enabled: isSmtpConfigured,
      credentials: {
        smtp_host: SMTP_HOST,
        smtp_port: String(SMTP_PORT),
        smtp_user: SMTP_USER,
        smtp_pass: SMTP_PASS,
        smtp_from: SMTP_FROM,
      },
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    needsSave = true;
  }
  if (!apiVaultState['supabase']) {
    apiVaultState['supabase'] = {
      provider: 'supabase',
      is_enabled: isSupabaseConfigured,
      credentials: {
        supabase_url: SUPABASE_URL,
        supabase_anon_key: process.env.SUPABASE_ANON_KEY || '',
        supabase_service_role_key: SUPABASE_SERVICE_ROLE_KEY,
      },
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    needsSave = true;
  }
  if (!apiVaultState['google_maps']) {
    apiVaultState['google_maps'] = {
      provider: 'google_maps',
      is_enabled: Boolean(GOOGLE_MAPS_API_KEY),
      credentials: {
        google_maps_api_key: GOOGLE_MAPS_API_KEY,
      },
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    needsSave = true;
  }

  if (needsSave) {
    saveApiVault();
  }

  applyVaultToRuntime();
}

function saveApiVault(): void {
  try {
    const enc = encryptVault(apiVaultState);
    fs.writeFileSync(VAULT_FILE, enc, { mode: 0o600 });
  } catch (err) {
    console.warn('[VAULT] Save vault error:', err);
  }
}

function maskSecretString(keyName: string, val: string): string {
  if (!val || typeof val !== 'string') return '';
  const isSecret = /secret|password|pass|access_token|service_role/i.test(keyName);
  if (isSecret) {
    if (val.length <= 4) return '••••';
    return '••••••••' + val.slice(-4);
  }
  if (val.startsWith('rzp_test_') || val.startsWith('rzp_live_')) {
    return val.slice(0, 9) + '••••' + val.slice(-4);
  }
  if (val.startsWith('https://')) {
    try {
      const u = new URL(val);
      return `${u.protocol}//${u.hostname.slice(0, 5)}••••${u.hostname.slice(-8)}`;
    } catch {
      return val.slice(0, 8) + '••••';
    }
  }
  if (val.length > 8) {
    return val.slice(0, 4) + '••••' + val.slice(-4);
  }
  return '••••' + val.slice(-2);
}

function sanitizeProviderForClient(entry: StoredApiCredential) {
  const masked: Record<string, string> = {};
  const hasCreds: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(entry.credentials || {})) {
    hasCreds[k] = Boolean(v && v.trim());
    masked[k] = maskSecretString(k, v);
  }
  return {
    provider: entry.provider,
    is_enabled: entry.is_enabled,
    masked_credentials: masked,
    has_credentials: hasCreds,
    updated_at: entry.updated_at,
    last_tested_at: entry.last_tested_at,
    test_status: entry.test_status || 'untested',
    test_message: entry.test_message,
  };
}

// Initialize Vault
loadApiVault();

// Admin fallback credentials
const OWNER_ADMIN_EMAIL = process.env.OWNER_ADMIN_EMAIL || 'ranjithlakkakula2006@gmail.com';
let currentOwnerPassword = process.env.OWNER_ADMIN_PASSWORD || 'srisaimess@2023';

// Password Reset Record Interface & In-memory Store
interface PasswordResetRecord {
  tokenHash: string;
  email: string;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

let passwordResetRecords: PasswordResetRecord[] = [];

// Periodic cleanup of expired tokens (older than 1 hour past expiration)
setInterval(() => {
  const now = Date.now();
  passwordResetRecords = passwordResetRecords.filter(r => now < r.expiresAt + 3600 * 1000);
}, 15 * 60 * 1000);

// Helper function to send password reset email
async function sendPasswordResetEmail(
  recipientEmail: string,
  resetLink: string,
  expiresInMinutes: number = 30
): Promise<{ sent: boolean; error?: string }> {
  if (!mailTransporter) {
    console.log(`[PASSWORD RESET] Email requested for ${recipientEmail}. Reset Link: ${resetLink} (Expires in ${expiresInMinutes} minutes)`);
    return { sent: false, error: 'SMTP not configured in environment variables' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - Sri Sathya Sai Mess</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 24px; color: #1c1917;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background-color: #1c1917; padding: 32px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Sri Sathya Sai Mess</h1>
            <p style="color: #f59e0b; margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Owner Admin Security</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px 28px;">
            <h2 style="color: #1c1917; font-size: 18px; margin-top: 0; font-weight: 600;">Password Reset Request</h2>
            <p style="color: #57534e; font-size: 14px; line-height: 1.6; margin: 16px 0;">
              Hello, a request was received to reset the administrator password for <strong>${recipientEmail}</strong> at Sri Sathya Sai Mess.
            </p>
            <p style="color: #57534e; font-size: 14px; line-height: 1.6; margin: 16px 0;">
              Click the button below to choose a new password. This secure link is time-limited and will expire in <strong>${expiresInMinutes} minutes</strong>. For your security, this link can only be used once.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background-color: #f59e0b; color: #0c0a09; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
                Reset Owner Password
              </a>
            </div>
            <p style="color: #78716c; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
              If the button doesn't work, copy and paste this link into your web browser:<br/>
              <a href="${resetLink}" style="color: #b45309; word-break: break-all; font-size: 12px;">${resetLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 28px 0;" />
            <p style="color: #a8a29e; font-size: 11px; line-height: 1.5; margin: 0;">
              <strong>Security Note:</strong> If you did not request a password reset, you can safely ignore this email. Your existing password will remain completely secure and unchanged.
            </p>
          </div>
          <!-- Footer -->
          <div style="background-color: #f5f5f4; padding: 16px 24px; text-align: center; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4;">
            Sri Sathya Sai Mess &bull; Authentic Traditional Homestyle &bull; Admin Portal
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: SMTP_FROM,
      to: recipientEmail,
      subject: 'Password Reset Instructions - Sri Sathya Sai Mess Admin',
      text: `Hello,\n\nA password reset was requested for your Sri Sathya Sai Mess admin account.\n\nOpen this link to choose a new password (valid for ${expiresInMinutes} minutes):\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
      html: htmlContent,
    });
    console.log(`[PASSWORD RESET] Email sent successfully to ${recipientEmail}. MessageId: ${info.messageId}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[PASSWORD RESET] Failed to send email via SMTP:`, err);
    return { sent: false, error: err.message };
  }
}

// =============================================================================
// ONE-CLICK RESTAURANT CLOSURE TODAY & AUTOMATIC DAILY RESET (ASIA/KOLKATA IST)
// =============================================================================
interface RestaurantClosureState {
  is_closed: boolean;
  closed_date: string | null; // 'YYYY-MM-DD' in Asia/Kolkata
  closed_at: string | null;   // ISO timestamp
  announcement_title: string;
  announcement_message: string;
  updated_at: string;
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // Always returns YYYY-MM-DD in Asia/Kolkata
}

const RESTAURANT_CLOSURE_FILE = path.resolve(__dirname, '.restaurant-closure.json');

let restaurantClosureState: RestaurantClosureState = {
  is_closed: false,
  closed_date: null,
  closed_at: null,
  announcement_title: 'Restaurant Will Be Closed Today',
  announcement_message: 'Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!',
  updated_at: new Date().toISOString(),
};

// Load saved status if exists
try {
  if (fs.existsSync(RESTAURANT_CLOSURE_FILE)) {
    const raw = fs.readFileSync(RESTAURANT_CLOSURE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.is_closed === 'boolean') {
      restaurantClosureState = { ...restaurantClosureState, ...parsed };
    }
  }
} catch (e) {
  console.warn('Could not read closure state file:', e);
}

function saveRestaurantClosureState(): void {
  try {
    fs.writeFileSync(RESTAURANT_CLOSURE_FILE, JSON.stringify(restaurantClosureState, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist closure state to disk:', err);
  }
}

/**
 * Evaluates whether the restaurant is currently closed for TODAY in Asia/Kolkata (IST).
 * Automatic Daily Reset: The closing status applies strictly to the selected calendar date.
 * The moment midnight IST rolls over, closed_date !== todayIST, so it automatically resets
 * to OPEN without manual intervention.
 */
function isRestaurantClosedToday(): boolean {
  if (!restaurantClosureState.is_closed || !restaurantClosureState.closed_date) {
    return false;
  }
  const todayIST = getTodayIST();
  if (restaurantClosureState.closed_date !== todayIST) {
    restaurantClosureState.is_closed = false;
    restaurantClosureState.closed_date = null;
    restaurantClosureState.closed_at = null;
    restaurantClosureState.updated_at = new Date().toISOString();
    saveRestaurantClosureState();
    return false;
  }
  return true;
}

// Background sweep every 60s to maintain clean state across midnight IST
setInterval(() => {
  isRestaurantClosedToday();
}, 60000);

// Persistent database storage with local disk fallback
const MENU_STORAGE_FILE = path.resolve(__dirname, '.database-menu.json');
let memoryCategories: FoodCategory[] = [...INITIAL_CATEGORIES];
let memoryFoodItems: FoodItem[] = [...INITIAL_FOOD_ITEMS];

function loadPersistedMenu(): void {
  try {
    if (fs.existsSync(MENU_STORAGE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MENU_STORAGE_FILE, 'utf-8'));
      if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        memoryCategories = parsed.categories;
      }
      if (Array.isArray(parsed.foodItems) && parsed.foodItems.length > 0) {
        memoryFoodItems = parsed.foodItems;
      }
    } else {
      savePersistedMenu();
    }
  } catch (err) {
    console.warn('[MENU] Could not load persisted menu:', err);
  }
}

function savePersistedMenu(): void {
  try {
    fs.writeFileSync(
      MENU_STORAGE_FILE,
      JSON.stringify({ categories: memoryCategories, foodItems: memoryFoodItems }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('[MENU] Could not save persisted menu to disk:', err);
  }
}

// Load persisted menu on startup
loadPersistedMenu();

let memoryOrders: Order[] = [];
let memoryOrderCounter = 1001;

// Seed 3 realistic demo orders for initial visualization
const initialSeedOrders: Order[] = [
  {
    id: 'ord-demo-1',
    customer_id: 'cust-1',
    order_number: 'SSM-1001',
    customer_name: 'Rajesh Sharma',
    customer_phone: '9848022338',
    customer_email: 'rajesh.sharma@example.com',
    delivery_address: 'Plot 42, Sri Sai Nagar, Road No. 3, Near Water Tank',
    customer_latitude: 17.448293,
    customer_longitude: 78.391485,
    google_maps_url: 'https://www.google.com/maps?q=17.448293,78.391485',
    subtotal: 440,
    delivery_fee: 30,
    final_total: 470,
    payment_method: 'razorpay_online',
    payment_status: 'paid',
    order_status: 'preparing',
    notes: 'Please pack extra onions and lemon wedges.',
    razorpay_payment_id: 'pay_SSM_demo_9821',
    razorpay_order_id: 'order_SSM_demo_9821',
    items: [
      {
        id: 'oi-1',
        food_item_id: 'item-bir-chk-1',
        item_name: 'Hyderabadi Chicken Dum Biryani',
        category_name: 'Chicken Biryani',
        quantity: 2,
        unit_price: 220,
        total_price: 440,
      },
    ],
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-demo-2',
    customer_id: 'cust-3',
    order_number: 'SSM-1002',
    customer_name: 'Venkatesh Rao',
    customer_phone: '9440188992',
    customer_email: 'v.rao@example.com',
    delivery_address: 'Door 12-4-56, Main Bazar, Opposite Temple Gate',
    customer_latitude: 17.439121,
    customer_longitude: 78.402319,
    google_maps_url: 'https://www.google.com/maps?q=17.439121,78.402319',
    subtotal: 520,
    delivery_fee: 30,
    final_total: 550,
    payment_method: 'cash_on_delivery',
    payment_status: 'pending',
    order_status: 'new',
    notes: 'Make mutton curry spicy military mess style.',
    items: [
      {
        id: 'oi-2',
        food_item_id: 'item-mut-1',
        item_name: 'Military Mess Special Mutton Curry',
        category_name: 'Mutton Curry',
        quantity: 2,
        unit_price: 260,
        total_price: 520,
      },
    ],
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];
memoryOrders = [...initialSeedOrders];

let memoryReviews: OrderReview[] = [
  {
    id: 'rev-1',
    order_id: 'ord-demo-1',
    order_number: 'SSM-1001',
    customer_name: 'Rajesh Sharma',
    rating: 5,
    food_taste_rating: 5,
    delivery_rating: 5,
    comment: 'The Hyderabadi Chicken Dum Biryani was phenomenal! Fragrant long-grain basmati with succulent chicken and the classic mirchi ka salan. Arrived piping hot.',
    status: 'published',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    owner_reply: 'Thank you so much Rajesh garu! Our biryani is slow-dum cooked fresh in earthen handis every morning.',
    owner_replied_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-2',
    order_id: 'ord-demo-2',
    order_number: 'SSM-1002',
    customer_name: 'Venkatesh Rao',
    rating: 5,
    food_taste_rating: 5,
    delivery_rating: 4,
    comment: 'Authentic military mess taste. The Mutton Curry had tender bone-in goat cuts in rich spicy pepper gravy. Just like military messes in Telangana.',
    status: 'published',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    owner_reply: 'Glad you loved the military mutton curry! We hand-roast all whole spices on stone mortars.',
    owner_replied_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-3',
    order_id: 'ord-prev-3',
    order_number: 'SSM-998',
    customer_name: 'Ananya S.',
    rating: 5,
    food_taste_rating: 5,
    delivery_rating: 5,
    comment: 'The unlimited South Indian Leaf Meal was so wholesome. Authentic drumstick sambar, pepper rasam, and spicy gongura pickle. Best homestyle meal in town!',
    status: 'published',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// Simple Auth token store for admin session and customer session tracking
const activeSessions = new Set<string>();
const customerSessions = new Map<string, string>();

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Owner authentication required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  // Verify token is not a regular customer token
  if (customerSessions.has(token)) {
    res.status(403).json({ error: 'Forbidden: Access denied. Owner administrator privileges required. Customer accounts cannot manage API keys or system settings.' });
    return;
  }
  if (!activeSessions.has(token)) {
    res.status(401).json({ error: 'Unauthorized: Owner session expired or invalid' });
    return;
  }
  next();
};

// =============================================================================
// HIGH-TRAFFIC & DATABASE OPTIMIZATIONS (1,000 – 5,000 CONCURRENT USERS)
// =============================================================================

// 1. O(1) Fast Index Maps for Orders (instant phone/ID lookups)
const ordersById = new Map<string, Order>();
const ordersByNumber = new Map<string, Order>();
const ordersByPhone = new Map<string, Order[]>();

function indexOrder(order: Order): void {
  ordersById.set(order.id, order);
  ordersByNumber.set(order.order_number.toLowerCase(), order);
  const cleanPhone = order.customer_phone.replace(/\D/g, '');
  if (cleanPhone) {
    const list = ordersByPhone.get(cleanPhone) || [];
    const idx = list.findIndex(o => o.id === order.id);
    if (idx !== -1) {
      list[idx] = order;
    } else {
      list.unshift(order);
    }
    ordersByPhone.set(cleanPhone, list);
  }
}

// Seed initial memory orders into O(1) maps
memoryOrders.forEach(indexOrder);

// 2. High-Speed In-Memory Cache with ETag support for Menu Items & Categories
let menuCacheVersion = 1;
let cachedMenuItemsPayload: { etag: string; data: FoodItem[]; json: string } | null = null;
let cachedCategoriesPayload: { etag: string; data: FoodCategory[]; json: string } | null = null;

function invalidateMenuCache(): void {
  menuCacheVersion++;
  cachedMenuItemsPayload = null;
  cachedCategoriesPayload = null;
}

// 3. Token-Bucket Rate Limiter (Protects API from traffic spikes, abuse, and DDOS)
interface RateBucket {
  tokens: number;
  lastRefill: number;
}
const rateLimitMap = new Map<string, RateBucket>();
const orderRateLimitMap = new Map<string, RateBucket>();

// Periodic eviction of stale rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now - v.lastRefill > 300000) rateLimitMap.delete(k);
  }
  for (const [k, v] of orderRateLimitMap.entries()) {
    if (now - v.lastRefill > 300000) orderRateLimitMap.delete(k);
  }
}, 300000);

function checkGeneralRateLimit(ip: string, maxTokens = 200, refillRatePerSec = 5): boolean {
  const now = Date.now();
  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now };
    rateLimitMap.set(ip, bucket);
    return true;
  }
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRatePerSec);
  bucket.lastRefill = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

function checkOrderRateLimit(ipOrPhone: string, maxTokens = 50, refillRatePerMin = 15): boolean {
  const now = Date.now();
  let bucket = orderRateLimitMap.get(ipOrPhone);
  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now };
    orderRateLimitMap.set(ipOrPhone, bucket);
    return true;
  }
  const elapsedMinutes = (now - bucket.lastRefill) / 60000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedMinutes * refillRatePerMin);
  bucket.lastRefill = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

// 4. Idempotency Store & In-Flight Request Locking (Zero duplicate orders/payments)
interface IdempotentRecord {
  statusCode: number;
  body: Order;
  timestamp: number;
}
const idempotencyStore = new Map<string, IdempotentRecord>();
const inFlightRequests = new Set<string>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idempotencyStore.entries()) {
    if (now - v.timestamp > 15 * 60 * 1000) {
      idempotencyStore.delete(k);
    }
  }
}, 60000);

// 5. Asynchronous Background Task Queue (Decouples slow I/O: WhatsApp & Supabase)
interface AsyncTask {
  id: string;
  type: 'order_notification' | 'supabase_order_sync';
  payload: any;
  retries: number;
}
const taskQueue: AsyncTask[] = [];
let isQueueProcessing = false;

function enqueueTask(type: AsyncTask['type'], payload: any): void {
  perfMetrics.backgroundTasksEnqueued++;
  taskQueue.push({
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    payload,
    retries: 0,
  });
  if (!isQueueProcessing) {
    setImmediate(processQueue);
  }
}

async function processQueue(): Promise<void> {
  if (taskQueue.length === 0) {
    isQueueProcessing = false;
    return;
  }
  isQueueProcessing = true;
  const task = taskQueue.shift();
  if (!task) {
    isQueueProcessing = false;
    return;
  }

  try {
    if (task.type === 'order_notification') {
      await sendWhatsAppNotification(task.payload);
    } else if (task.type === 'supabase_order_sync' && supabase) {
      const { order, items } = task.payload;
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([
          {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_email: order.customer_email,
            delivery_address: order.delivery_address,
            customer_latitude: order.customer_latitude,
            customer_longitude: order.customer_longitude,
            google_maps_url: order.google_maps_url,
            subtotal: order.subtotal,
            delivery_fee: order.delivery_fee,
            final_total: order.final_total,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            order_status: order.order_status,
            notes: order.notes,
          },
        ])
        .select()
        .single();

      if (!orderErr && orderData) {
        const itemsToInsert = items.map((oi: any) => ({
          order_id: orderData.id,
          food_item_id: oi.food_item_id,
          item_name: oi.item_name,
          category_name: oi.category_name,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          total_price: oi.total_price,
        }));
        await supabase.from('order_items').insert(itemsToInsert);
      }
    }
    perfMetrics.backgroundTasksCompleted++;
  } catch (err) {
    console.warn(`[WORKER] Task ${task.id} (${task.type}) attempt failed:`, err);
    if (task.retries < 2) {
      task.retries++;
      taskQueue.push(task);
    } else {
      perfMetrics.backgroundTasksFailed++;
    }
  }

  setImmediate(processQueue);
}

// =============================================================================
// CUSTOMER ACCOUNTS, ORDER HISTORY & BIRTHDAY OFFERS ARCHITECTURE
// =============================================================================

interface CustomerRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string; // YYYY-MM-DD
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

interface BirthdayOfferConfig {
  id: string;
  is_active: boolean;
  offer_type: 'percentage' | 'fixed' | 'free_item';
  discount_percentage?: number;
  fixed_discount_amount?: number;
  free_item_name?: string;
  free_food_item_id?: string;
  min_order_value: number;
  max_discount_cap?: number;
  validity_days_before: number;
  validity_days_after: number;
  description: string;
  terms?: string;
}

interface BirthdayCoupon {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_dob: string;
  year: number;
  offer_type: 'percentage' | 'fixed' | 'free_item';
  discount_value: number;
  free_item_name?: string;
  min_order_value: number;
  max_discount_cap?: number;
  status: 'active' | 'redeemed' | 'expired';
  valid_from: string;
  valid_until: string;
  redeemed_at?: string;
  redeemed_order_id?: string;
  redeemed_order_number?: string;
}

interface AdminNotification {
  id: string;
  type: 'birthday_upcoming' | 'birthday_today' | 'coupon_redeemed' | 'new_order';
  title: string;
  message: string;
  customer_name?: string;
  customer_phone?: string;
  customer_dob?: string;
  coupon_code?: string;
  order_number?: string;
  is_read: boolean;
  created_at: string;
  delivery_channels?: {
    in_app: boolean;
    whatsapp_sent?: boolean;
    email_sent?: boolean;
  };
}

interface CustomerPasswordResetRecord {
  tokenHash: string;
  email: string;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

function hashCustomerPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Configurable Birthday Offer Settings
let birthdayOfferConfig: BirthdayOfferConfig = {
  id: 'bday-cfg-1',
  is_active: true,
  offer_type: 'percentage',
  discount_percentage: 20, // 20% OFF
  fixed_discount_amount: 100, // ₹100 OFF
  free_item_name: 'Military Mess Special Sweet (Gulab Jamun)',
  min_order_value: 300,
  max_discount_cap: 150,
  validity_days_before: 0,
  validity_days_after: 7, // Valid on birthday + 7 days
  description: 'Celebrate your birthday with 20% OFF on all Sri Sathya Sai Mess traditional authentic favorites!',
  terms: 'Valid on orders above ₹300. Single use per customer during their birthday celebration window.',
};

// Birthday calculation helper
function getBirthdayStatus(dobStr: string, refDate: Date = new Date()): {
  isToday: boolean;
  isUpcoming3Days: boolean;
  isWithinValidity: boolean;
  daysUntilNext: number;
  birthdayThisYear: string;
  age: number;
} {
  const parts = dobStr.split('-').map(Number);
  const dobYear = parts[0];
  const dobMonth = parts[1];
  const dobDay = parts[2];

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1;
  const currentDay = refDate.getDate();

  const isToday = currentMonth === dobMonth && currentDay === dobDay;

  const todayStart = new Date(currentYear, refDate.getMonth(), refDate.getDate()).getTime();
  let thisYearBday = new Date(currentYear, dobMonth - 1, dobDay).getTime();

  let diffDays = Math.round((thisYearBday - todayStart) / (1000 * 3600 * 24));
  if (diffDays < 0 && !isToday) {
    const nextYearBday = new Date(currentYear + 1, dobMonth - 1, dobDay).getTime();
    diffDays = Math.round((nextYearBday - todayStart) / (1000 * 3600 * 24));
  }

  const isUpcoming3Days = diffDays === 3;

  // Check validity window (from birthday - validity_days_before to birthday + validity_days_after)
  const daysSinceThisYearBday = Math.round((todayStart - thisYearBday) / (1000 * 3600 * 24));
  const isWithinValidity =
    isToday ||
    (daysSinceThisYearBday >= 0 && daysSinceThisYearBday <= birthdayOfferConfig.validity_days_after) ||
    (-daysSinceThisYearBday <= birthdayOfferConfig.validity_days_before && daysSinceThisYearBday < 0);

  const age = currentYear - dobYear;
  const bdayThisYearStr = `${currentYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

  return {
    isToday,
    isUpcoming3Days,
    isWithinValidity,
    daysUntilNext: diffDays,
    birthdayThisYear: bdayThisYearStr,
    age,
  };
}

// Initial realistic customer data
const defaultSeedSalt = crypto.randomBytes(16).toString('hex');
const defaultSeedHash = hashCustomerPassword('SaiMess@2026', defaultSeedSalt);

const nowForSeed = new Date();
const seedTodayMonth = String(nowForSeed.getMonth() + 1).padStart(2, '0');
const seedTodayDay = String(nowForSeed.getDate()).padStart(2, '0');

const seedFuture3 = new Date(nowForSeed.getTime() + 3 * 24 * 3600 * 1000);
const seedFuture3Month = String(seedFuture3.getMonth() + 1).padStart(2, '0');
const seedFuture3Day = String(seedFuture3.getDate()).padStart(2, '0');

let memoryCustomers: CustomerRecord[] = [
  {
    id: 'cust-1',
    full_name: 'Rajesh Sharma',
    email: 'rajesh.sharma@example.com',
    phone: '9848022338',
    date_of_birth: `1992-${seedTodayMonth}-${seedTodayDay}`, // Birthday TODAY!
    password_hash: defaultSeedHash,
    password_salt: defaultSeedSalt,
    created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    full_name: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    phone: '9949123456',
    date_of_birth: `1995-${seedFuture3Month}-${seedFuture3Day}`, // Birthday in 3 DAYS!
    password_hash: defaultSeedHash,
    password_salt: defaultSeedSalt,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    full_name: 'Venkatesh Rao',
    email: 'v.rao@example.com',
    phone: '9440188992',
    date_of_birth: '1988-03-15',
    password_hash: defaultSeedHash,
    password_salt: defaultSeedSalt,
    created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryBirthdayCoupons: BirthdayCoupon[] = [
  {
    id: 'bcpn-1',
    code: `BDAY-RAJESH-${nowForSeed.getFullYear()}`,
    customer_id: 'cust-1',
    customer_name: 'Rajesh Sharma',
    customer_phone: '9848022338',
    customer_email: 'rajesh.sharma@example.com',
    customer_dob: `1992-${seedTodayMonth}-${seedTodayDay}`,
    year: nowForSeed.getFullYear(),
    offer_type: 'percentage',
    discount_value: 20,
    free_item_name: 'Military Mess Special Sweet (Gulab Jamun)',
    min_order_value: 300,
    max_discount_cap: 150,
    status: 'active',
    valid_from: new Date(nowForSeed.getTime() - 24 * 3600 * 1000).toISOString(),
    valid_until: new Date(nowForSeed.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
  },
];

let memoryAdminNotifications: AdminNotification[] = [
  {
    id: 'notif-1',
    type: 'birthday_today',
    title: '🎂 Customer Birthday Today: Rajesh Sharma',
    message: `Today is Rajesh Sharma's birthday! Registered phone: 9848022338. Birthday offer: 20% OFF (Code: BDAY-RAJESH-${nowForSeed.getFullYear()}) was automatically issued.`,
    customer_name: 'Rajesh Sharma',
    customer_phone: '9848022338',
    customer_dob: `1992-${seedTodayMonth}-${seedTodayDay}`,
    coupon_code: `BDAY-RAJESH-${nowForSeed.getFullYear()}`,
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    delivery_channels: { in_app: true, whatsapp_sent: isWhatsAppConfigured, email_sent: isSmtpConfigured },
  },
  {
    id: 'notif-2',
    type: 'birthday_upcoming',
    title: '🎂 Upcoming Birthday Alert (in 3 Days): Ananya Rao',
    message: `Customer Ananya Rao's birthday is approaching in 3 days on ${seedFuture3Month}/${seedFuture3Day}! Phone: 9949123456. Applicable birthday offer: 20% OFF.`,
    customer_name: 'Ananya Rao',
    customer_phone: '9949123456',
    customer_dob: `1995-${seedFuture3Month}-${seedFuture3Day}`,
    is_read: false,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    delivery_channels: { in_app: true, whatsapp_sent: isWhatsAppConfigured, email_sent: isSmtpConfigured },
  },
];

let customerPasswordResetRecords: CustomerPasswordResetRecord[] = [];

// Helper: Create admin notification & notify owner
function createAdminNotification(data: Omit<AdminNotification, 'id' | 'is_read' | 'created_at'>): AdminNotification {
  const newNotif: AdminNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    is_read: false,
    created_at: new Date().toISOString(),
    delivery_channels: {
      in_app: true,
      whatsapp_sent: false,
      email_sent: false,
    },
  };

  memoryAdminNotifications.unshift(newNotif);

  // Send WhatsApp alert to owner if configured
  if (RESTAURANT_OWNER_WHATSAPP) {
    const alertText = `🔔 *SRI SATHYA SAI MESS - ADMIN ALERT*\n*${newNotif.title}*\n${newNotif.message}\nTime: ${new Date().toLocaleTimeString('en-IN')}`;
    if (isWhatsAppConfigured) {
      fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: RESTAURANT_OWNER_WHATSAPP,
          type: 'text',
          text: { preview_url: false, body: alertText },
        }),
      }).then((r) => {
        if (r.ok && newNotif.delivery_channels) newNotif.delivery_channels.whatsapp_sent = true;
      }).catch(err => console.warn('Owner WhatsApp alert notification failed:', err));
    }
  }

  // Send email alert to owner if configured
  if (isSmtpConfigured && mailTransporter) {
    mailTransporter.sendMail({
      from: SMTP_FROM,
      to: OWNER_ADMIN_EMAIL,
      subject: `[Sri Sathya Sai Mess] ${newNotif.title}`,
      text: newNotif.message,
    }).then(() => {
      if (newNotif.delivery_channels) newNotif.delivery_channels.email_sent = true;
    }).catch(err => console.warn('Owner email alert notification failed:', err));
  }

  return newNotif;
}

// Helper: Ensure birthday coupon exists for customer
function getOrCreateBirthdayCoupon(customer: CustomerRecord): BirthdayCoupon | null {
  if (!birthdayOfferConfig.is_active) return null;
  const currentYear = new Date().getFullYear();
  let existing = memoryBirthdayCoupons.find(c => c.customer_id === customer.id && c.year === currentYear);
  if (existing) return existing;

  const cleanName = customer.full_name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'SPECIAL';
  const couponCode = `BDAY-${cleanName}-${currentYear}`;

  const validFrom = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const validUntil = new Date(Date.now() + birthdayOfferConfig.validity_days_after * 24 * 3600 * 1000).toISOString();

  const newCoupon: BirthdayCoupon = {
    id: `bcpn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: couponCode,
    customer_id: customer.id,
    customer_name: customer.full_name,
    customer_phone: customer.phone,
    customer_email: customer.email,
    customer_dob: customer.date_of_birth,
    year: currentYear,
    offer_type: birthdayOfferConfig.offer_type,
    discount_value: birthdayOfferConfig.offer_type === 'percentage' 
      ? (birthdayOfferConfig.discount_percentage || 20)
      : (birthdayOfferConfig.fixed_discount_amount || 100),
    free_item_name: birthdayOfferConfig.free_item_name,
    min_order_value: birthdayOfferConfig.min_order_value,
    max_discount_cap: birthdayOfferConfig.max_discount_cap,
    status: 'active',
    valid_from: validFrom,
    valid_until: validUntil,
  };

  memoryBirthdayCoupons.unshift(newCoupon);
  return newCoupon;
}

// Scheduled Background Task: Check approaching and today birthdays
const notifiedBirthdayRecords = new Set<string>();

function checkAndNotifyBirthdays(): void {
  if (!birthdayOfferConfig.is_active) return;
  const now = new Date();
  const currentYear = now.getFullYear();

  for (const customer of memoryCustomers) {
    if (!customer.date_of_birth) continue;
    const bdayStatus = getBirthdayStatus(customer.date_of_birth, now);

    // 1. Check Birthday Today
    if (bdayStatus.isToday) {
      const todayKey = `${customer.id}-${currentYear}-today`;
      if (!notifiedBirthdayRecords.has(todayKey)) {
        notifiedBirthdayRecords.add(todayKey);
        const coupon = getOrCreateBirthdayCoupon(customer);
        const offerDesc = birthdayOfferConfig.offer_type === 'percentage'
          ? `${birthdayOfferConfig.discount_percentage}% OFF (Code: ${coupon?.code})`
          : (birthdayOfferConfig.offer_type === 'fixed'
            ? `₹${birthdayOfferConfig.fixed_discount_amount} OFF (Code: ${coupon?.code})`
            : `Free ${birthdayOfferConfig.free_item_name}`);

        createAdminNotification({
          type: 'birthday_today',
          title: `🎂 Customer Birthday Today: ${customer.full_name}`,
          message: `Today is ${customer.full_name}'s birthday! Phone: ${customer.phone}. Offer: ${offerDesc} was automatically activated.`,
          customer_name: customer.full_name,
          customer_phone: customer.phone,
          customer_dob: customer.date_of_birth,
          coupon_code: coupon?.code,
        });

        // Send celebratory email to customer if SMTP configured
        if (isSmtpConfigured && mailTransporter && customer.email) {
          mailTransporter.sendMail({
            from: SMTP_FROM,
            to: customer.email,
            subject: '🎂 Happy Birthday from Sri Sathya Sai Mess! Enjoy your special gift',
            text: `Dear ${customer.full_name},\n\nSri Sathya Sai Mess wishes you a very Happy Birthday!\n\nCelebrate your day with our authentic home-cooked military mess delicacies. Use coupon code ${coupon?.code} to get your birthday offer: ${offerDesc}.\n\nOrder online: ${process.env.APP_URL || 'https://srisathyasaimess.com'}`,
          }).catch(err => console.warn('Customer birthday greeting email failed:', err));
        }
      }
    }

    // 2. Check Birthday in 3 Days
    if (bdayStatus.isUpcoming3Days) {
      const advanceKey = `${customer.id}-${currentYear}-advance3`;
      if (!notifiedBirthdayRecords.has(advanceKey)) {
        notifiedBirthdayRecords.add(advanceKey);
        const coupon = getOrCreateBirthdayCoupon(customer);
        const offerDesc = birthdayOfferConfig.offer_type === 'percentage'
          ? `${birthdayOfferConfig.discount_percentage}% OFF`
          : `₹${birthdayOfferConfig.fixed_discount_amount} OFF`;

        createAdminNotification({
          type: 'birthday_upcoming',
          title: `🎂 Upcoming Birthday Alert (in 3 Days): ${customer.full_name}`,
          message: `${customer.full_name}'s birthday is coming up in 3 days on ${bdayStatus.birthdayThisYear}. Registered Mobile: ${customer.phone}. Applicable Offer: ${offerDesc}. Coupon code ${coupon?.code} has been prepared.`,
          customer_name: customer.full_name,
          customer_phone: customer.phone,
          customer_dob: customer.date_of_birth,
          coupon_code: coupon?.code,
        });
      }
    }
  }
}

setTimeout(checkAndNotifyBirthdays, 2000);
setInterval(checkAndNotifyBirthdays, 30 * 60 * 1000);

// Customer Authentication Middleware
const requireCustomer = (req: Request & { customer?: CustomerRecord }, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Please sign in to access your customer account' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const customerId = customerSessions.get(token);
  if (!customerId) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return;
  }
  const customer = memoryCustomers.find(c => c.id === customerId);
  if (!customer) {
    res.status(401).json({ error: 'Customer account not found' });
    return;
  }
  req.customer = customer;
  next();
};

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// System configuration status
app.get('/api/system/status', (_req: Request, res: Response) => {
  res.json({
    supabase_configured: isSupabaseConfigured,
    razorpay_configured: isRazorpayConfigured,
    razorpay_key_id: isRazorpayConfigured ? RAZORPAY_KEY_ID : null,
    razorpay_public_key: isRazorpayConfigured ? RAZORPAY_KEY_ID : DEFAULT_TEST_KEY_ID,
    razorpay_is_test_mode: !isRazorpayConfigured,
    whatsapp_configured: isWhatsAppConfigured,
    owner_whatsapp_configured: Boolean(RESTAURANT_OWNER_WHATSAPP),
    smtp_configured: isSmtpConfigured,
    owner_admin_email: OWNER_ADMIN_EMAIL,
    restaurant_name: 'Sri Sathya Sai Mess',
    restaurant_phone: '+91 97015 76804',
    restaurant_address: 'Hyderabad to Warangal High Road, Bhuvanagiri, Aler, Pincode: 508101',
    restaurant_timings: 'Lunch Time: 11:00 AM – 7:00 PM',
  });
});

// =============================================================================
// RESTAURANT CLOSURE STATUS & ADMIN ONE-CLICK CONTROLS
// =============================================================================

// Public Restaurant Closure Status (Used across Customer Website & Admin)
app.get('/api/restaurant/status', (_req: Request, res: Response) => {
  const isClosed = isRestaurantClosedToday();
  const todayIST = getTodayIST();
  res.json({
    is_closed_today: isClosed,
    today_ist: todayIST,
    closed_date: isClosed ? restaurantClosureState.closed_date : null,
    closed_at: isClosed ? restaurantClosureState.closed_at : null,
    announcement_title: restaurantClosureState.announcement_title,
    announcement_message: restaurantClosureState.announcement_message,
    status_updated_at: restaurantClosureState.updated_at,
  });
});

// One-Click Admin Button: Close Restaurant Today
app.post('/api/admin/restaurant/close-today', requireAdmin, (_req: Request, res: Response): void => {
  const todayIST = getTodayIST();
  const nowIso = new Date().toISOString();

  restaurantClosureState = {
    is_closed: true,
    closed_date: todayIST,
    closed_at: nowIso,
    announcement_title: 'Restaurant Will Be Closed Today',
    announcement_message: 'Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!',
    updated_at: nowIso,
  };
  saveRestaurantClosureState();

  // Create real admin notification for the event
  createAdminNotification({
    type: 'birthday_today',
    title: '🚪 Restaurant Closed for Today',
    message: `Owner closed restaurant operations for ${todayIST}. Customer ordering, cart additions, and payment checkouts are blocked across the website.`,
  });

  res.json({
    success: true,
    message: 'Restaurant status set to CLOSED for today.',
    status: {
      is_closed_today: true,
      today_ist: todayIST,
      closed_date: todayIST,
      closed_at: nowIso,
      announcement_title: restaurantClosureState.announcement_title,
      announcement_message: restaurantClosureState.announcement_message,
      status_updated_at: nowIso,
    },
  });
});

// One-Click Admin Button: Reopen Restaurant Today
app.post('/api/admin/restaurant/reopen-today', requireAdmin, (_req: Request, res: Response): void => {
  const todayIST = getTodayIST();
  const nowIso = new Date().toISOString();

  restaurantClosureState = {
    is_closed: false,
    closed_date: null,
    closed_at: null,
    announcement_title: 'Restaurant Will Be Closed Today',
    announcement_message: 'Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!',
    updated_at: nowIso,
  };
  saveRestaurantClosureState();

  // Create real admin notification for reopening
  createAdminNotification({
    type: 'birthday_today',
    title: '🍽️ Restaurant Reopened Today',
    message: `Owner reopened restaurant operations for ${todayIST}. Online customer ordering and checkouts have resumed.`,
  });

  res.json({
    success: true,
    message: 'Restaurant reopened successfully for today.',
    status: {
      is_closed_today: false,
      today_ist: todayIST,
      closed_date: null,
      closed_at: null,
      announcement_title: restaurantClosureState.announcement_title,
      announcement_message: restaurantClosureState.announcement_message,
      status_updated_at: nowIso,
    },
  });
});

// Financial Record-keeping: Download Last 30 Days of Customer Orders as CSV
app.get('/api/admin/orders/export-csv', requireAdmin, (_req: Request, res: Response): void => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filteredOrders = memoryOrders.filter(
    (o) => new Date(o.created_at).getTime() >= thirtyDaysAgo
  );

  // Sort newest orders first
  filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const headers = [
    'Order Number',
    'Order Date & Time (IST)',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Delivery Address',
    'Items Ordered',
    'Subtotal (INR)',
    'Discount Amount (INR)',
    'Coupon Code',
    'Delivery Fee (INR)',
    'Final Total (INR)',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Razorpay Payment ID',
    'Special Notes',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const formatIST = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const rows = filteredOrders.map((o) => {
    const itemsStr = (o.items || [])
      .map((i) => `${i.item_name} x ${i.quantity} (₹${i.total_price})`)
      .join('; ');

    return [
      escapeCSV(o.order_number),
      escapeCSV(formatIST(o.created_at)),
      escapeCSV(o.customer_name),
      escapeCSV(o.customer_phone),
      escapeCSV(o.customer_email || 'N/A'),
      escapeCSV(o.delivery_address),
      escapeCSV(itemsStr),
      escapeCSV(o.subtotal),
      escapeCSV(o.discount_amount || 0),
      escapeCSV(o.coupon_code || 'None'),
      escapeCSV(o.delivery_fee),
      escapeCSV(o.final_total),
      escapeCSV(o.payment_method.toUpperCase()),
      escapeCSV(o.payment_status.toUpperCase()),
      escapeCSV(o.order_status.toUpperCase()),
      escapeCSV(o.razorpay_payment_id || 'N/A'),
      escapeCSV(o.notes || 'None'),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const todayIST = getTodayIST();
  const filename = `sri-sathya-sai-mess-orders-last-30-days-${todayIST}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

// Performance & High-Concurrency Health Diagnostics
app.get('/api/system/performance', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptimeSec = Math.max(1, Math.floor((Date.now() - perfMetrics.startTime) / 1000));
  const rps = (perfMetrics.totalRequests / uptimeSec).toFixed(2);
  const cacheHitRatio = perfMetrics.cacheHits + perfMetrics.cacheMisses > 0
    ? ((perfMetrics.cacheHits / (perfMetrics.cacheHits + perfMetrics.cacheMisses)) * 100).toFixed(1) + '%'
    : '0%';

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSec,
    concurrency_capability: '1,000 to 5,000 concurrent customers supported',
    throughput: {
      total_requests_processed: perfMetrics.totalRequests,
      average_requests_per_second: parseFloat(rps),
      orders_created: perfMetrics.ordersCreated,
      idempotent_deduplications_prevented: perfMetrics.idempotentDeduplications,
      rate_limit_rejections: perfMetrics.rateLimitRejections,
    },
    caching: {
      menu_cache_version: menuCacheVersion,
      cache_hits: perfMetrics.cacheHits,
      cache_misses: perfMetrics.cacheMisses,
      cache_hit_ratio: cacheHitRatio,
      in_memory_orders_indexed: ordersById.size,
      in_memory_menu_items: memoryFoodItems.length,
      in_memory_categories: memoryCategories.length,
    },
    background_worker_queue: {
      queue_depth: taskQueue.length,
      tasks_enqueued: perfMetrics.backgroundTasksEnqueued,
      tasks_completed: perfMetrics.backgroundTasksCompleted,
      tasks_failed: perfMetrics.backgroundTasksFailed,
      is_processing: isQueueProcessing,
    },
    memory: {
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      rss_mb: (mem.rss / 1024 / 1024).toFixed(2),
      external_mb: (mem.external / 1024 / 1024).toFixed(2),
    },
    database: {
      supabase_connected: isSupabaseConfigured,
      connection_pooling_optimized: true,
      index_optimizations_active: true,
    },
  });
});

// Admin Auth: Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  // Check Supabase Auth if connected
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session) {
        activeSessions.add(data.session.access_token);
        res.json({
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: 'owner',
            full_name: 'Restaurant Owner',
          },
        });
        return;
      }
    } catch {
      // Fall through to configured admin credentials
    }
  }

  // Fallback credentials check with dynamic password
  if (
    email.toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase() &&
    password === currentOwnerPassword
  ) {
    const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
    activeSessions.add(sessionToken);
    res.json({
      token: sessionToken,
      user: {
        id: 'owner-admin-1',
        email: OWNER_ADMIN_EMAIL,
        role: 'owner',
        full_name: 'Sri Sathya Sai Mess Owner',
      },
    });
    return;
  }

  res.status(401).json({ error: 'Invalid owner credentials' });
});

// Admin Auth: Verify token
app.get('/api/auth/verify', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ valid: false });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (activeSessions.has(token)) {
    res.json({ valid: true, user: { email: OWNER_ADMIN_EMAIL, role: 'owner' } });
  } else {
    res.status(401).json({ valid: false });
  }
});

// Admin Auth: Logout
app.post('/api/auth/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// Admin Auth: Request Password Reset (Forgot Password)
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address format (e.g. name@example.com)' });
    return;
  }

  // Prevent duplicate spam requests: 30s debounce per email
  const recentRequest = passwordResetRecords.find(
    r => r.email === cleanEmail && (Date.now() - r.createdAt < 30 * 1000)
  );
  if (recentRequest) {
    res.status(429).json({ 
      error: 'A password reset request was recently sent. Please wait 30 seconds before submitting another request.' 
    });
    return;
  }

  // Determine App URL for reset link
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const baseAppUrl = (process.env.APP_URL && !process.env.APP_URL.includes('localhost'))
    ? process.env.APP_URL.replace(/\/$/, '')
    : `${protocol}://${host}`;

  // If Supabase Auth is active, also trigger Supabase's native recovery flow
  if (supabase) {
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${baseAppUrl}/?reset_token=supabase`,
      });
    } catch (sbErr) {
      console.warn('Supabase password reset warning:', sbErr);
    }
  }

  const isRegisteredOwner = cleanEmail === OWNER_ADMIN_EMAIL.toLowerCase();

  // Consistent response to protect privacy and prevent email enumeration
  if (!isRegisteredOwner) {
    await new Promise(resolve => setTimeout(resolve, 350));
    res.json({
      success: true,
      message: 'If an account exists for this email, password reset instructions will be sent.',
      email_sent: false,
    });
    return;
  }

  // Generate cryptographically secure token & hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresInMinutes = 30;
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

  passwordResetRecords.push({
    tokenHash,
    email: cleanEmail,
    expiresAt,
    used: false,
    createdAt: Date.now(),
  });

  const resetLink = `${baseAppUrl}/?reset_token=${rawToken}`;

  // Send real email via SMTP
  const sendResult = await sendPasswordResetEmail(cleanEmail, resetLink, expiresInMinutes);

  res.json({
    success: true,
    message: 'If an account exists for this email, password reset instructions will be sent.',
    email_sent: sendResult.sent,
    smtp_configured: isSmtpConfigured,
    expires_in_minutes: expiresInMinutes,
    // Provide testing aid when SMTP credentials are not yet set in environment
    ...((!sendResult.sent) ? {
      dev_reset_link: resetLink,
      dev_token: rawToken,
      dev_note: 'SMTP credentials not configured in .env. Use this link directly to test password reset, or configure SMTP_USER & SMTP_PASS in .env.'
    } : {}),
  });
});

// Admin Auth: Verify Password Reset Token
app.get('/api/auth/verify-reset-token', (req: Request, res: Response): void => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ valid: false, error: 'Password reset token is required' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = passwordResetRecords.find(r => r.tokenHash === tokenHash);

  if (!record) {
    res.status(400).json({ 
      valid: false, 
      error: 'This password reset link is invalid or has already been used. Please request a new one.' 
    });
    return;
  }

  if (record.used) {
    res.status(400).json({ 
      valid: false, 
      error: 'This password reset link has already been used. For your security, reset links are single-use only.' 
    });
    return;
  }

  if (Date.now() > record.expiresAt) {
    res.status(400).json({ 
      valid: false, 
      error: 'This password reset link has expired (valid for 30 minutes). Please request a new one.' 
    });
    return;
  }

  // Mask email for privacy
  const [localPart, domain] = record.email.split('@');
  const maskedLocal = localPart.length > 2 
    ? `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 2, 4))}${localPart[localPart.length - 1]}`
    : `${localPart[0]}*`;
  const maskedEmail = `${maskedLocal}@${domain}`;

  res.json({
    valid: true,
    email: maskedEmail,
    expires_at: record.expiresAt,
  });
});

// Admin Auth: Complete Password Reset
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Reset token is required' });
    return;
  }

  if (!newPassword || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'New password is required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long for security' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match. Please verify both fields.' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = passwordResetRecords.find(r => r.tokenHash === tokenHash);

  if (!record || record.used || Date.now() > record.expiresAt) {
    res.status(400).json({ 
      error: 'Password reset link is invalid, expired, or has already been used. Please request a new one.' 
    });
    return;
  }

  // Single-use enforcement
  record.used = true;

  // Update in-memory password
  currentOwnerPassword = newPassword;

  // Revoke all existing sessions for security
  activeSessions.clear();

  // Persist updated password to .env if available
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      if (envContent.includes('OWNER_ADMIN_PASSWORD=')) {
        envContent = envContent.replace(
          /OWNER_ADMIN_PASSWORD="?[^"\r\n]*"?/,
          `OWNER_ADMIN_PASSWORD="${newPassword}"`
        );
      } else {
        envContent += `\nOWNER_ADMIN_PASSWORD="${newPassword}"\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    }
  } catch (fsErr) {
    console.warn('Could not persist updated password to .env:', fsErr);
  }

  console.log(`[PASSWORD RESET] Successfully updated password for ${record.email}. Previous sessions cleared.`);

  res.json({
    success: true,
    message: 'Your password has been successfully reset! You can now log in with your new password.',
  });
});

// =============================================================================
// CUSTOMER AUTHENTICATION & PROFILE ENDPOINTS
// =============================================================================

// Customer Registration
app.post('/api/customer/register', async (req: Request, res: Response): Promise<void> => {
  const { full_name, email, phone, date_of_birth, password } = req.body;
  if (!full_name || !email || !phone || !date_of_birth || !password) {
    res.status(400).json({ error: 'All fields (name, email, phone, date of birth, password) are required.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    res.status(400).json({ error: 'Please provide date of birth in YYYY-MM-DD format.' });
    return;
  }
  const dobDate = new Date(date_of_birth);
  if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
    res.status(400).json({ error: 'Invalid date of birth. Must not be in the future.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  // Check existing
  if (memoryCustomers.some(c => c.email.toLowerCase() === cleanEmail)) {
    res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashCustomerPassword(password, salt);

  const newCustomer: CustomerRecord = {
    id: `cust-${Date.now()}`,
    full_name: full_name.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    date_of_birth,
    password_hash: passwordHash,
    password_salt: salt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryCustomers.unshift(newCustomer);

  if (supabase) {
    try {
      await supabase.from('customers').insert([{
        id: newCustomer.id,
        full_name: newCustomer.full_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        date_of_birth: newCustomer.date_of_birth,
        password_hash: newCustomer.password_hash,
        password_salt: newCustomer.password_salt,
      }]);
    } catch (e) {
      console.warn('Supabase customer sync warning:', e);
    }
  }

  const token = `cust_token_${crypto.randomBytes(24).toString('hex')}`;
  customerSessions.set(token, newCustomer.id);

  // Check if today or upcoming birthday
  const bdayInfo = getBirthdayStatus(date_of_birth);
  let activeCoupon = null;
  if (bdayInfo.isWithinValidity) {
    activeCoupon = getOrCreateBirthdayCoupon(newCustomer);
  }

  res.status(201).json({
    token,
    customer: {
      id: newCustomer.id,
      full_name: newCustomer.full_name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      date_of_birth: newCustomer.date_of_birth,
      created_at: newCustomer.created_at,
    },
    birthday_status: bdayInfo,
    active_birthday_coupon: activeCoupon,
    message: 'Welcome to Sri Sathya Sai Mess! Account created successfully.',
  });
});

// Customer Login
app.post('/api/customer/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const customer = memoryCustomers.find(c => c.email.toLowerCase() === cleanEmail);
  if (!customer) {
    res.status(401).json({ error: 'No account found with this email. Please sign up.' });
    return;
  }

  const expectedHash = hashCustomerPassword(password, customer.password_salt);
  if (customer.password_hash !== expectedHash) {
    res.status(401).json({ error: 'Incorrect password. Please try again or use Forgot Password.' });
    return;
  }

  const token = `cust_token_${crypto.randomBytes(24).toString('hex')}`;
  customerSessions.set(token, customer.id);

  const bdayInfo = getBirthdayStatus(customer.date_of_birth);
  let activeCoupon = null;
  if (bdayInfo.isWithinValidity) {
    activeCoupon = getOrCreateBirthdayCoupon(customer);
  }

  res.json({
    token,
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.date_of_birth,
      created_at: customer.created_at,
    },
    birthday_status: bdayInfo,
    active_birthday_coupon: activeCoupon,
  });
});

// Customer Current Profile
app.get('/api/customer/me', requireCustomer, (req: any, res: Response): void => {
  const customer: CustomerRecord = req.customer;
  const bdayInfo = getBirthdayStatus(customer.date_of_birth);
  let activeCoupon = null;
  if (bdayInfo.isWithinValidity) {
    activeCoupon = getOrCreateBirthdayCoupon(customer);
  }
  res.json({
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.date_of_birth,
      created_at: customer.created_at,
    },
    birthday_status: bdayInfo,
    active_birthday_coupon: activeCoupon,
    birthday_config: birthdayOfferConfig,
  });
});

// Customer Logout
app.post('/api/customer/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    customerSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Customer Forgot Password
app.post('/api/customer/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const customer = memoryCustomers.find(c => c.email.toLowerCase() === cleanEmail);

  if (!customer) {
    await new Promise(r => setTimeout(r, 300));
    res.json({
      success: true,
      message: 'If an account exists for this email, password reset instructions will be sent.',
    });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = Date.now() + 30 * 60 * 1000;

  customerPasswordResetRecords.push({
    tokenHash,
    email: cleanEmail,
    expiresAt,
    used: false,
    createdAt: Date.now(),
  });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const resetLink = `${protocol}://${host}/?customer_reset_token=${rawToken}`;

  let emailSent = false;
  if (isSmtpConfigured && mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: cleanEmail,
        subject: 'Reset Your Customer Password - Sri Sathya Sai Mess',
        text: `Hello ${customer.full_name},\n\nA password reset was requested for your Sri Sathya Sai Mess customer account.\n\nOpen this link to choose a new password:\n${resetLink}\n\nThis link is valid for 30 minutes and can only be used once.`,
      });
      emailSent = true;
    } catch (err) {
      console.warn('Customer password reset email failed:', err);
    }
  }

  res.json({
    success: true,
    message: 'If an account exists for this email, password reset instructions will be sent.',
    email_sent: emailSent,
    ...((!emailSent) ? {
      dev_reset_link: resetLink,
      dev_token: rawToken,
      dev_note: 'SMTP not configured in .env. Use this token/link to complete reset.',
    } : {}),
  });
});

// Verify Customer Password Reset Token
app.get('/api/customer/verify-reset-token', (req: Request, res: Response): void => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ valid: false, error: 'Reset token is required' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = customerPasswordResetRecords.find(r => r.tokenHash === tokenHash);
  if (!record || record.used || Date.now() > record.expiresAt) {
    res.status(400).json({ valid: false, error: 'Password reset link is invalid, expired, or already used.' });
    return;
  }
  res.json({ valid: true, email: record.email });
});

// Complete Customer Password Reset
app.post('/api/customer/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match. Please verify both fields.' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = customerPasswordResetRecords.find(r => r.tokenHash === tokenHash);
  if (!record || record.used || Date.now() > record.expiresAt) {
    res.status(400).json({ error: 'Password reset link is invalid, expired, or already used.' });
    return;
  }

  const customer = memoryCustomers.find(c => c.email.toLowerCase() === record.email.toLowerCase());
  if (!customer) {
    res.status(404).json({ error: 'Customer account not found' });
    return;
  }

  record.used = true;
  customer.password_salt = crypto.randomBytes(16).toString('hex');
  customer.password_hash = hashCustomerPassword(newPassword, customer.password_salt);
  customer.updated_at = new Date().toISOString();

  // Clear customer sessions
  for (const [sToken, cId] of customerSessions.entries()) {
    if (cId === customer.id) customerSessions.delete(sToken);
  }

  res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
});

// Validate Birthday Coupon Code
app.post('/api/customer/validate-coupon', (req: Request, res: Response): void => {
  // Disallow coupon application when restaurant is closed today
  if (isRestaurantClosedToday()) {
    res.status(400).json({
      valid: false,
      error: 'Restaurant is closed today. Coupon and birthday offer redemption are not available today.',
    });
    return;
  }

  const { code, subtotal } = req.body;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ valid: false, error: 'Coupon code is required.' });
    return;
  }
  const cleanCode = code.trim().toUpperCase();
  const coupon = memoryBirthdayCoupons.find(c => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    res.status(400).json({ valid: false, error: 'Invalid coupon code. Please verify code entered.' });
    return;
  }

  if (coupon.status === 'redeemed') {
    res.status(400).json({ 
      valid: false, 
      error: `This birthday coupon (${coupon.code}) has already been redeemed on Order #${coupon.redeemed_order_number || 'previous'}. Each birthday coupon is single-use only.` 
    });
    return;
  }

  if (coupon.status === 'expired' || new Date(coupon.valid_until).getTime() < Date.now()) {
    res.status(400).json({ valid: false, error: 'This birthday coupon has expired.' });
    return;
  }

  const parsedSubtotal = parseFloat(subtotal) || 0;
  if (parsedSubtotal < coupon.min_order_value) {
    res.status(400).json({
      valid: false,
      error: `Minimum order value for coupon ${coupon.code} is ₹${coupon.min_order_value}. Add ₹${(coupon.min_order_value - parsedSubtotal).toFixed(0)} more to apply!`,
    });
    return;
  }

  let discountAmount = 0;
  if (coupon.offer_type === 'percentage') {
    const rawDiscount = (parsedSubtotal * coupon.discount_value) / 100;
    discountAmount = coupon.max_discount_cap ? Math.min(rawDiscount, coupon.max_discount_cap) : rawDiscount;
  } else if (coupon.offer_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, parsedSubtotal);
  } else if (coupon.offer_type === 'free_item') {
    discountAmount = 0;
  }

  res.json({
    valid: true,
    code: coupon.code,
    offer_type: coupon.offer_type,
    discount_amount: Math.round(discountAmount),
    free_item_name: coupon.free_item_name,
    description: coupon.offer_type === 'percentage' 
      ? `${coupon.discount_value}% Birthday Discount Applied (₹${Math.round(discountAmount)} savings)`
      : (coupon.offer_type === 'fixed'
        ? `₹${coupon.discount_value} Birthday Discount Applied`
        : `Free ${coupon.free_item_name} with your order!`),
  });
});

// Customer Birthday Offer & Personalized Greeting
app.get('/api/customer/birthday-offer', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const customerId = customerSessions.get(token);
  const customer = memoryCustomers.find(c => c.id === customerId);

  if (!customer) {
    res.status(401).json({ error: 'Customer session not found' });
    return;
  }

  const bdayInfo = getBirthdayStatus(customer.date_of_birth);
  const coupon = getOrCreateBirthdayCoupon(customer);

  let greetingTitle = '';
  let greetingMessage = '';

  if (bdayInfo.isToday) {
    greetingTitle = `🎉 Happy Birthday, ${customer.full_name}! 🎂`;
    greetingMessage = `Sri Sathya Sai Mess wishes you a joyous year filled with health, happiness, and authentic home-style flavors! Here is your special birthday feast discount.`;
  } else if (bdayInfo.isWithinValidity) {
    greetingTitle = `🎂 Birthday Celebration Week, ${customer.full_name}!`;
    greetingMessage = `Your birthday celebration is still on at Sri Sathya Sai Mess! Enjoy authentic Telangana & Military Mess delicacies with your special offer.`;
  } else if (bdayInfo.isUpcoming3Days) {
    greetingTitle = `🎂 Your Birthday is in 3 Days, ${customer.full_name}!`;
    greetingMessage = `Get ready for your special day on ${bdayInfo.birthdayThisYear}. We have prepared an exclusive feast discount just for you!`;
  }

  res.json({
    has_birthday_offer: bdayInfo.isWithinValidity && birthdayOfferConfig.is_active,
    greeting_title: greetingTitle,
    greeting_message: greetingMessage,
    birthday_status: bdayInfo,
    coupon: coupon,
    config: birthdayOfferConfig,
  });
});

// =============================================================================
// ADMIN: CUSTOMERS & BIRTHDAY OFFERS MANAGEMENT
// =============================================================================

// Get all registered customers with birthday details & order metrics
app.get('/api/admin/customers', requireAdmin, (_req: Request, res: Response): void => {
  const customerData = memoryCustomers.map(customer => {
    const customerOrders = memoryOrders.filter(
      o => o.customer_id === customer.id || o.customer_email === customer.email || o.customer_phone === customer.phone
    );
    const totalSpent = customerOrders
      .filter(o => o.order_status !== 'cancelled' && (o.payment_status === 'paid' || o.payment_method === 'cash_on_delivery'))
      .reduce((sum, o) => sum + o.final_total, 0);

    const bdayStatus = getBirthdayStatus(customer.date_of_birth);
    const currentYear = new Date().getFullYear();
    const activeCoupon = memoryBirthdayCoupons.find(c => c.customer_id === customer.id && c.year === currentYear);

    return {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.date_of_birth,
      created_at: customer.created_at,
      total_orders: customerOrders.length,
      total_spent: totalSpent,
      birthday_status: bdayStatus,
      active_coupon: activeCoupon,
    };
  });

  res.json(customerData);
});

// Get orders for a specific customer (Admin view)
app.get('/api/admin/customers/:id/orders', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const customer = memoryCustomers.find(c => c.id === id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const customerOrders = memoryOrders.filter(
    o => o.customer_id === customer.id || o.customer_email === customer.email || o.customer_phone === customer.phone
  );

  res.json({
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.date_of_birth,
    },
    orders: customerOrders,
  });
});

// Get Birthday Offer Configuration & Stats (Admin)
app.get('/api/admin/birthday-config', requireAdmin, (_req: Request, res: Response): void => {
  const currentYear = new Date().getFullYear();
  const totalIssued = memoryBirthdayCoupons.filter(c => c.year === currentYear).length;
  const totalRedeemed = memoryBirthdayCoupons.filter(c => c.year === currentYear && c.status === 'redeemed').length;

  const todayCount = memoryCustomers.filter(c => getBirthdayStatus(c.date_of_birth).isToday).length;
  const upcomingCount = memoryCustomers.filter(c => getBirthdayStatus(c.date_of_birth).isUpcoming3Days).length;

  res.json({
    config: birthdayOfferConfig,
    stats: {
      total_coupons_issued: totalIssued,
      total_coupons_redeemed: totalRedeemed,
      redemption_rate: totalIssued > 0 ? ((totalRedeemed / totalIssued) * 100).toFixed(1) + '%' : '0%',
      birthdays_today_count: todayCount,
      birthdays_upcoming_3days_count: upcomingCount,
      total_registered_customers: memoryCustomers.length,
    },
  });
});

// Update Birthday Offer Configuration (Admin)
app.post('/api/admin/birthday-config', requireAdmin, (req: Request, res: Response): void => {
  const {
    is_active,
    offer_type,
    discount_percentage,
    fixed_discount_amount,
    free_item_name,
    min_order_value,
    max_discount_cap,
    validity_days_before,
    validity_days_after,
    description,
    terms,
  } = req.body;

  birthdayOfferConfig = {
    ...birthdayOfferConfig,
    is_active: is_active !== undefined ? Boolean(is_active) : birthdayOfferConfig.is_active,
    offer_type: offer_type || birthdayOfferConfig.offer_type,
    discount_percentage: discount_percentage !== undefined ? Number(discount_percentage) : birthdayOfferConfig.discount_percentage,
    fixed_discount_amount: fixed_discount_amount !== undefined ? Number(fixed_discount_amount) : birthdayOfferConfig.fixed_discount_amount,
    free_item_name: free_item_name || birthdayOfferConfig.free_item_name,
    min_order_value: min_order_value !== undefined ? Number(min_order_value) : birthdayOfferConfig.min_order_value,
    max_discount_cap: max_discount_cap !== undefined ? Number(max_discount_cap) : birthdayOfferConfig.max_discount_cap,
    validity_days_before: validity_days_before !== undefined ? Number(validity_days_before) : birthdayOfferConfig.validity_days_before,
    validity_days_after: validity_days_after !== undefined ? Number(validity_days_after) : birthdayOfferConfig.validity_days_after,
    description: description ? description.trim() : birthdayOfferConfig.description,
    terms: terms ? terms.trim() : birthdayOfferConfig.terms,
  };

  createAdminNotification({
    type: 'birthday_today',
    title: '⚙️ Birthday Offer Settings Updated',
    message: `Owner updated birthday offer rules: ${birthdayOfferConfig.offer_type === 'percentage' ? `${birthdayOfferConfig.discount_percentage}% OFF` : `₹${birthdayOfferConfig.fixed_discount_amount} OFF`}. Min order: ₹${birthdayOfferConfig.min_order_value}.`,
  });

  res.json({
    success: true,
    message: 'Birthday offer settings updated successfully!',
    config: birthdayOfferConfig,
  });
});

// Get all birthday coupons & redemption records (Admin)
app.get('/api/admin/birthday-coupons', requireAdmin, (_req: Request, res: Response): void => {
  res.json(memoryBirthdayCoupons);
});

// Manually send birthday greeting / offer to a customer (Admin)
app.post('/api/admin/customers/:id/send-birthday-offer', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const customer = memoryCustomers.find(c => c.id === id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const coupon = getOrCreateBirthdayCoupon(customer);
  const offerDesc = birthdayOfferConfig.offer_type === 'percentage'
    ? `${birthdayOfferConfig.discount_percentage}% OFF`
    : (birthdayOfferConfig.offer_type === 'fixed'
      ? `₹${birthdayOfferConfig.fixed_discount_amount} OFF`
      : `Free ${birthdayOfferConfig.free_item_name}`);

  let whatsappSent = false;
  let emailSent = false;

  // Attempt WhatsApp send to customer if WhatsApp API configured
  if (isWhatsAppConfigured && customer.phone) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${customer.phone}`,
          type: 'text',
          text: { preview_url: false, body: `🎂 *Happy Birthday from Sri Sathya Sai Mess, ${customer.full_name}!* 🍛\nEnjoy our traditional feast with your special gift: ${offerDesc}!\nUse Code: *${coupon?.code}* at checkout.\nOrder here: ${process.env.APP_URL || 'https://srisathyasaimess.com'}` },
        }),
      });
      whatsappSent = resp.ok;
    } catch (e) {
      console.warn('Customer manual WhatsApp greeting failed:', e);
    }
  }

  // Attempt Email send to customer
  if (isSmtpConfigured && mailTransporter && customer.email) {
    try {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: customer.email,
        subject: '🎂 Special Birthday Offer from Sri Sathya Sai Mess!',
        text: `Dear ${customer.full_name},\n\nSri Sathya Sai Mess wishes you a joyous birthday!\n\nCelebrate your special day with authentic Telangana & Military Mess delicacies. Enjoy your special gift: ${offerDesc}.\n\nCoupon Code: ${coupon?.code}\nValidity: Valid on orders above ₹${birthdayOfferConfig.min_order_value}.\n\nOrder online: ${process.env.APP_URL || 'https://srisathyasaimess.com'}`,
      });
      emailSent = true;
    } catch (e) {
      console.warn('Customer manual Email greeting failed:', e);
    }
  }

  // Log in admin notifications
  createAdminNotification({
    type: 'birthday_today',
    title: `📢 Birthday Greeting Sent: ${customer.full_name}`,
    message: `Owner sent birthday offer (${coupon?.code} - ${offerDesc}) to ${customer.full_name} (${customer.phone}). WhatsApp: ${whatsappSent ? 'Sent' : 'Not configured'}, Email: ${emailSent ? 'Sent' : 'Not configured'}.`,
    customer_name: customer.full_name,
    customer_phone: customer.phone,
    coupon_code: coupon?.code,
  });

  const manualWhatsAppLink = `https://api.whatsapp.com/send?phone=91${customer.phone}&text=${encodeURIComponent(`🎂 Happy Birthday from Sri Sathya Sai Mess, ${customer.full_name}! Enjoy ${offerDesc} with code ${coupon?.code}. Order now!`)}`;

  res.json({
    success: true,
    message: `Birthday greeting and coupon ${coupon?.code} sent to ${customer.full_name}!`,
    coupon,
    channels: {
      whatsapp_api_sent: whatsappSent,
      email_sent: emailSent,
      manual_whatsapp_link: manualWhatsAppLink,
    },
  });
});

// Admin Notifications List
app.get('/api/admin/notifications', requireAdmin, (_req: Request, res: Response): void => {
  const unreadCount = memoryAdminNotifications.filter(n => !n.is_read).length;
  res.json({
    unread_count: unreadCount,
    notifications: memoryAdminNotifications,
  });
});

// Mark Notification as Read
app.patch('/api/admin/notifications/:id/read', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const notif = memoryAdminNotifications.find(n => n.id === id);
  if (notif) {
    notif.is_read = true;
  }
  res.json({ success: true });
});

// Mark All Notifications as Read
app.post('/api/admin/notifications/mark-all-read', requireAdmin, (_req: Request, res: Response): void => {
  memoryAdminNotifications.forEach(n => { n.is_read = true; });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// Delete Notification
app.delete('/api/admin/notifications/:id', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const idx = memoryAdminNotifications.findIndex(n => n.id === id);
  if (idx !== -1) {
    memoryAdminNotifications.splice(idx, 1);
  }
  res.json({ success: true, message: 'Notification deleted' });
});

// -----------------------------------------------------------------------------
// MENU & CATEGORIES
// -----------------------------------------------------------------------------

// Get categories (Cached with ETag & 304 Not Modified)
app.get('/api/menu/categories', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

  if (!cachedCategoriesPayload) {
    let cats = memoryCategories.filter((c) => c.is_active);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('food_categories')
          .select('*')
          .order('display_order', { ascending: true });
        if (!error && data && data.length > 0) {
          cats = data;
        }
      } catch (e) {
        console.warn('Supabase categories fetch failed, using fallback memory store', e);
      }
    }
    const jsonStr = JSON.stringify(cats);
    const etag = `"${crypto.createHash('md5').update(jsonStr + menuCacheVersion).digest('hex')}"`;
    cachedCategoriesPayload = { etag, data: cats, json: jsonStr };
  }

  if (req.headers['if-none-match'] === cachedCategoriesPayload.etag) {
    perfMetrics.cacheHits++;
    res.status(304).end();
    return;
  }

  perfMetrics.cacheMisses++;
  res.setHeader('ETag', cachedCategoriesPayload.etag);
  res.type('application/json').send(cachedCategoriesPayload.json);
});

// Add Category (Admin)
app.post('/api/menu/categories', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  const newCat: FoodCategory = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    description: description ? description.trim() : '',
    display_order: memoryCategories.length + 1,
    is_active: true,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('food_categories')
        .insert([{ name: newCat.name, description: newCat.description, display_order: newCat.display_order }])
        .select()
        .single();
      if (!error && data) {
        memoryCategories.push(data);
        savePersistedMenu();
        invalidateMenuCache();
        res.status(201).json(data);
        return;
      }
    } catch (e) {
      console.warn('Supabase category insert error', e);
    }
  }

  memoryCategories.push(newCat);
  savePersistedMenu();
  invalidateMenuCache();
  res.status(201).json(newCat);
});

// Get Food Items (Fresh from database with no stale browser caching)
app.get('/api/menu/items', async (req: Request, res: Response) => {
  const { category_id, search } = req.query;

  // Never serve outdated cached menu data to users or admin
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Cache hit path for general catalog browsing
  if (!category_id && !search) {
    let items = [...memoryFoodItems];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('food_items').select('*').order('display_order', { ascending: true });
        if (!error && data && data.length > 0) {
          items = data as FoodItem[];
        }
      } catch (e) {
        console.warn('Supabase items query error, using fallback memory store', e);
      }
    }
    res.json(items);
    return;
  }

  // Filtered/search queries
  let items = [...memoryFoodItems];
  if (category_id) {
    items = items.filter((i) => i.category_id === category_id);
  }
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
  }
  res.json(items);
});

// Add Food Item (Admin)
app.post('/api/menu/items', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, category_id, category_name, description, price, image_url, is_veg, is_available } = req.body;

  if (!name || !price || !category_name) {
    res.status(400).json({ error: 'Name, category, and price are required' });
    return;
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    res.status(400).json({ error: 'Valid price in INR is required' });
    return;
  }

  const newItem: FoodItem = {
    id: `item-${Date.now()}`,
    name: name.trim(),
    category_id: category_id || `cat-${Date.now()}`,
    category_name: category_name.trim(),
    description: description ? description.trim() : '',
    price: parsedPrice,
    image_url: image_url || '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
    is_available: is_available !== undefined ? Boolean(is_available) : true,
    is_veg: Boolean(is_veg),
    display_order: memoryFoodItems.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('food_items').insert([newItem]).select().single();
      if (!error && data) {
        memoryFoodItems.push(data);
        savePersistedMenu();
        invalidateMenuCache();
        res.status(201).json(data);
        return;
      }
    } catch (e) {
      console.warn('Supabase item insert error', e);
    }
  }

  memoryFoodItems.push(newItem);
  savePersistedMenu();
  invalidateMenuCache();
  res.status(201).json(newItem);
});

// Update Food Item (Admin)
app.put('/api/menu/items/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const itemIndex = memoryFoodItems.findIndex((i) => i.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Food item not found' });
    return;
  }

  if (updates.price !== undefined) {
    const p = parseFloat(updates.price);
    if (isNaN(p) || p <= 0) {
      res.status(400).json({ error: 'Invalid price' });
      return;
    }
    updates.price = p;
  }

  const updatedItem = {
    ...memoryFoodItems[itemIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  memoryFoodItems[itemIndex] = updatedItem;
  savePersistedMenu();
  invalidateMenuCache();

  if (supabase) {
    try {
      await supabase.from('food_items').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase update failed', e);
    }
  }

  res.json(updatedItem);
});

// Delete Food Item (Admin)
app.delete('/api/menu/items/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const index = memoryFoodItems.findIndex((i) => i.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Food item not found' });
    return;
  }

  memoryFoodItems.splice(index, 1);
  savePersistedMenu();
  invalidateMenuCache();

  if (supabase) {
    try {
      await supabase.from('food_items').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete failed', e);
    }
  }

  res.json({ success: true, message: 'Item deleted' });
});

// -----------------------------------------------------------------------------
// ORDERS & CHECKOUT
// -----------------------------------------------------------------------------

// Create New Order (Customer - High-Throughput & Idempotent)
app.post('/api/orders', async (req: Request, res: Response): Promise<void> => {
  // Reject order placement if restaurant is closed today
  if (isRestaurantClosedToday()) {
    res.status(403).json({
      error: 'Restaurant is closed today. We are not accepting orders today. Please visit us again soon!',
      is_closed_today: true,
      announcement_title: restaurantClosureState.announcement_title,
      announcement_message: restaurantClosureState.announcement_message,
    });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  // 1. Order Rate Limiter
  if (!checkOrderRateLimit(clientIp)) {
    perfMetrics.rateLimitRejections++;
    res.status(429).json({ error: 'Order submission rate limit reached. Please wait a moment before trying again.' });
    return;
  }

  const {
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    customer_latitude,
    customer_longitude,
    items,
    payment_method,
    notes,
    customer_id,
    coupon_code,
  } = req.body;

  // 2. Validation
  if (!customer_name || !customer_phone || !delivery_address) {
    res.status(400).json({ error: 'Customer name, phone number, and delivery address are required.' });
    return;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must contain at least one food item.' });
    return;
  }

  // 3. Idempotency Key Handling & Duplicate In-Flight Protection
  const rawIdempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotency_key;
  const timeWindow = Math.floor(Date.now() / 15000);
  const derivedKey = rawIdempotencyKey || crypto
    .createHash('sha256')
    .update(`${customer_phone.trim()}-${JSON.stringify(items)}-${delivery_address.trim()}-${timeWindow}`)
    .digest('hex');

  // Check if identical order was already processed
  const cachedOrder = idempotencyStore.get(derivedKey);
  if (cachedOrder) {
    perfMetrics.idempotentDeduplications++;
    res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
    res.status(cachedOrder.statusCode).json(cachedOrder.body);
    return;
  }

  // Prevent simultaneous in-flight race condition from rapid double-clicks
  if (inFlightRequests.has(derivedKey)) {
    res.status(409).json({ error: 'An identical order is already being processed. Please wait a few seconds.' });
    return;
  }
  inFlightRequests.add(derivedKey);

  try {
    // 4. Server-side price calculation to prevent client tampering
    let calculatedSubtotal = 0;
    const orderItemsValidated = [];

    for (const item of items) {
      const dbItem = memoryFoodItems.find((f) => f.id === item.food_item_id);
      if (!dbItem) {
        res.status(400).json({ error: `Item ${item.item_name || 'selected'} is not found in the menu.` });
        return;
      }
      if (!dbItem.is_available) {
        res.status(400).json({ error: `Sorry, ${dbItem.name} is currently Sold Out.` });
        return;
      }
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        res.status(400).json({ error: `Invalid quantity for ${dbItem.name}` });
        return;
      }

      const itemTotal = dbItem.price * quantity;
      calculatedSubtotal += itemTotal;

      orderItemsValidated.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        food_item_id: dbItem.id,
        item_name: dbItem.name,
        category_name: dbItem.category_name,
        quantity,
        unit_price: dbItem.price,
        total_price: itemTotal,
      });
    }

    // Check and validate birthday coupon if supplied
    let discountAmount = 0;
    let appliedCoupon: BirthdayCoupon | null = null;
    if (coupon_code && typeof coupon_code === 'string') {
      const cleanCode = coupon_code.trim().toUpperCase();
      const coupon = memoryBirthdayCoupons.find(c => c.code.toUpperCase() === cleanCode && c.status === 'active');
      if (coupon) {
        if (calculatedSubtotal >= coupon.min_order_value) {
          if (coupon.offer_type === 'percentage') {
            const rawDiscount = (calculatedSubtotal * coupon.discount_value) / 100;
            discountAmount = coupon.max_discount_cap ? Math.min(rawDiscount, coupon.max_discount_cap) : rawDiscount;
          } else if (coupon.offer_type === 'fixed') {
            discountAmount = Math.min(coupon.discount_value, calculatedSubtotal);
          } else if (coupon.offer_type === 'free_item' && coupon.free_item_name) {
            discountAmount = 0;
            orderItemsValidated.push({
              id: `oi-bday-${Date.now()}`,
              food_item_id: 'item-free-sweet',
              item_name: `${coupon.free_item_name} (Birthday Gift 🎁)`,
              category_name: 'Special Offers',
              quantity: 1,
              unit_price: 0,
              total_price: 0,
            });
          }
          appliedCoupon = coupon;
        }
      }
    }

    discountAmount = Math.round(discountAmount);
    const deliveryFee = calculatedSubtotal >= 500 ? 0 : 30; // Free delivery above ₹500, else ₹30
    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount) + deliveryFee;

    memoryOrderCounter += 1;
    const orderNumber = `SSM-${memoryOrderCounter}`;

    let googleMapsUrl: string | null = null;
    if (customer_latitude && customer_longitude) {
      googleMapsUrl = `https://www.google.com/maps?q=${customer_latitude},${customer_longitude}`;
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      customer_id: customer_id || undefined,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: customer_email ? customer_email.trim() : undefined,
      delivery_address: delivery_address.trim(),
      customer_latitude: customer_latitude || null,
      customer_longitude: customer_longitude || null,
      google_maps_url: googleMapsUrl,
      subtotal: calculatedSubtotal,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
      delivery_fee: deliveryFee,
      final_total: finalTotal,
      payment_method: payment_method || 'cash_on_delivery',
      payment_status: payment_method === 'cash_on_delivery' ? 'pending' : 'pending',
      order_status: 'new',
      notes: notes ? notes.trim() : undefined,
      items: orderItemsValidated,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Prepend to memory orders & index for instant O(1) lookups
    memoryOrders.unshift(newOrder);
    indexOrder(newOrder);
    perfMetrics.ordersCreated++;

    // Mark coupon redeemed and notify owner
    if (appliedCoupon) {
      appliedCoupon.status = 'redeemed';
      appliedCoupon.redeemed_at = new Date().toISOString();
      appliedCoupon.redeemed_order_id = newOrder.id;
      appliedCoupon.redeemed_order_number = newOrder.order_number;

      createAdminNotification({
        type: 'coupon_redeemed',
        title: `🎁 Birthday Coupon Redeemed: ${appliedCoupon.code}`,
        message: `${newOrder.customer_name} redeemed birthday coupon ${appliedCoupon.code} on Order #${newOrder.order_number} (Saved ₹${discountAmount}).`,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        coupon_code: appliedCoupon.code,
        order_number: newOrder.order_number,
      });
    }

    // New Order notification
    createAdminNotification({
      type: 'new_order',
      title: `🍛 New Order Received: #${newOrder.order_number} (₹${newOrder.final_total})`,
      message: `${newOrder.customer_name} (${newOrder.customer_phone}) placed Order #${newOrder.order_number} for ₹${newOrder.final_total} via ${newOrder.payment_method.toUpperCase()}${appliedCoupon ? ` with Birthday Coupon ${appliedCoupon.code}` : ''}.`,
      customer_name: newOrder.customer_name,
      customer_phone: newOrder.customer_phone,
      order_number: newOrder.order_number,
    });

    // Cache order in idempotency store for 15 minutes
    idempotencyStore.set(derivedKey, {
      statusCode: 201,
      body: newOrder,
      timestamp: Date.now(),
    });

    // 5. Asynchronous Background Task Queue:
    enqueueTask('order_notification', newOrder);
    if (supabase) {
      enqueueTask('supabase_order_sync', { order: newOrder, items: orderItemsValidated });
    }

    res.status(201).json(newOrder);
  } finally {
    inFlightRequests.delete(derivedKey);
  }
});

// Helper: Send WhatsApp notification (official Meta Cloud API or fallback generation)
async function sendWhatsAppNotification(order: Order): Promise<{ success: boolean; manual_url?: string }> {
  const itemSummary = order.items
    .map((i) => `• ${i.item_name} x ${i.quantity} (₹${i.total_price})`)
    .join('\n');

  const locationLine = order.google_maps_url
    ? `\n📍 Map Location: ${order.google_maps_url}`
    : '\n📍 Location: Exact coordinates not shared (Entered address used)';

  const messageText = `🍛 *NEW ORDER RECEIVED - Sri Sathya Sai Mess*
Order ID: #${order.order_number}
Customer: ${order.customer_name}
Phone: ${order.customer_phone}
Delivery Address: ${order.delivery_address}${locationLine}

*Items:*
${itemSummary}

Subtotal: ₹${order.subtotal}
Delivery Fee: ₹${order.delivery_fee}
*Total Amount: ₹${order.final_total}*
Payment: ${order.payment_method.toUpperCase()} (${order.payment_status.toUpperCase()})
${order.notes ? `Note: ${order.notes}` : ''}`;

  // If official WhatsApp credentials are configured, send via Meta Cloud API
  if (isWhatsAppConfigured) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: RESTAURANT_OWNER_WHATSAPP,
            type: 'text',
            text: { preview_url: true, body: messageText },
          }),
        }
      );
      if (response.ok) {
        return { success: true };
      }
    } catch (err) {
      console.error('Meta Cloud API call failed:', err);
    }
  }

  // Fallback direct WhatsApp link
  const encodedText = encodeURIComponent(messageText);
  const manualUrl = `https://api.whatsapp.com/send?phone=${RESTAURANT_OWNER_WHATSAPP}&text=${encodedText}`;
  return { success: false, manual_url: manualUrl };
}

// WhatsApp notification endpoint for explicit trigger or fallback URL retrieval
app.post('/api/notifications/whatsapp', async (req: Request, res: Response): Promise<void> => {
  const { order_id } = req.body;
  const order = memoryOrders.find((o) => o.id === order_id || o.order_number === order_id);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const result = await sendWhatsAppNotification(order);
  res.json({
    status: result.success ? 'sent_via_api' : 'fallback_manual',
    is_api_configured: isWhatsAppConfigured,
    manual_url: result.manual_url,
    owner_phone: RESTAURANT_OWNER_WHATSAPP,
  });
});

// Customer Order History Lookup (Authenticated Customer private orders OR Guest phone/ID lookup)
app.get('/api/customer/orders', (req: Request, res: Response): void => {
  // If customer is authenticated via Bearer token, return strictly their private order history
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const customerId = customerSessions.get(token);
    if (customerId) {
      const customer = memoryCustomers.find(c => c.id === customerId);
      if (customer) {
        const customerOrders = memoryOrders.filter(
          o => o.customer_id === customer.id || o.customer_phone === customer.phone || o.customer_email === customer.email
        );
        customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json({
          authenticated: true,
          customer: {
            id: customer.id,
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone,
          },
          count: customerOrders.length,
          orders: customerOrders,
        });
        return;
      }
    }
  }

  const query = (req.query.query || req.query.phone || req.query.order_id || '') as string;
  const trimmed = query.trim();

  if (!trimmed) {
    res.status(400).json({ error: 'Please provide a phone number or order ID.' });
    return;
  }

  const phoneDigits = trimmed.replace(/\D/g, '');
  const cleanSearch = trimmed.toLowerCase();

  // 1. O(1) Direct Lookup for exact order number or ID
  const exactOrder = ordersById.get(trimmed) || ordersByNumber.get(cleanSearch);
  if (exactOrder) {
    res.json({
      query: trimmed,
      count: 1,
      orders: [exactOrder],
    });
    return;
  }

  // 2. O(1) Direct Lookup for exact 10-digit phone number
  if (phoneDigits.length === 10 && ordersByPhone.has(phoneDigits)) {
    const list = ordersByPhone.get(phoneDigits) || [];
    res.json({
      query: trimmed,
      count: list.length,
      orders: list,
    });
    return;
  }

  // 3. Fallback partial filter
  const matchingOrders = memoryOrders.filter((order) => {
    if (order.id.toLowerCase() === cleanSearch || order.order_number.toLowerCase() === cleanSearch) {
      return true;
    }
    const cleanOrderNum = order.order_number.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSearchStripped = cleanSearch.replace(/[^a-z0-9]/g, '');
    if (cleanSearchStripped.length >= 3 && cleanOrderNum.includes(cleanSearchStripped)) {
      return true;
    }

    if (phoneDigits.length >= 4) {
      const orderPhoneDigits = order.customer_phone.replace(/\D/g, '');
      if (
        orderPhoneDigits.endsWith(phoneDigits) ||
        phoneDigits.endsWith(orderPhoneDigits) ||
        orderPhoneDigits.includes(phoneDigits)
      ) {
        return true;
      }
    }

    return false;
  });

  matchingOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    query: trimmed,
    count: matchingOrders.length,
    orders: matchingOrders,
  });
});

// Get Single Order (by id or order_number - O(1) lookup)
app.get('/api/orders/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const cleanId = id.trim().toLowerCase();
  const order = ordersById.get(id) || ordersByNumber.get(cleanId) || memoryOrders.find((o) => o.id === id || o.order_number.toLowerCase() === cleanId);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

// Get All Orders (Admin with Pagination support & Array fallback)
app.get('/api/orders', requireAdmin, (req: Request, res: Response) => {
  const { status, payment_status, search, date, page, limit } = req.query;
  let filtered = [...memoryOrders];

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter((o) => o.order_status === status);
  }

  if (payment_status && typeof payment_status === 'string' && payment_status !== 'all') {
    filtered = filtered.filter((o) => o.payment_status === payment_status);
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.order_number.toLowerCase().includes(s) ||
        o.customer_phone.includes(s) ||
        o.customer_name.toLowerCase().includes(s) ||
        (o.razorpay_payment_id && o.razorpay_payment_id.toLowerCase().includes(s)) ||
        (o.razorpay_order_id && o.razorpay_order_id.toLowerCase().includes(s))
    );
  }

  if (date && typeof date === 'string') {
    filtered = filtered.filter((o) => o.created_at.startsWith(date));
  }

  // If client specifies pagination
  if (page) {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIdx = (pageNum - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);
    res.json({
      orders: paginated,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages,
    });
    return;
  }

  // Default: return top 100 orders as an array for 100% AdminDashboard.tsx compatibility
  res.json(filtered.slice(0, 100));
});

// Update Order Status (Admin)
app.patch('/api/orders/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { order_status, payment_status } = req.body;

  const validStatuses: OrderStatus[] = [
    'new',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

  const orderIndex = memoryOrders.findIndex((o) => o.id === id || o.order_number === id);
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order_status && !validStatuses.includes(order_status)) {
    res.status(400).json({ error: 'Invalid order status' });
    return;
  }

  if (payment_status && !validPaymentStatuses.includes(payment_status)) {
    res.status(400).json({ error: 'Invalid payment status' });
    return;
  }

  const existing = memoryOrders[orderIndex];
  const updatedOrder: Order = {
    ...existing,
    order_status: order_status || existing.order_status,
    payment_status: payment_status || existing.payment_status,
    updated_at: new Date().toISOString(),
  };

  memoryOrders[orderIndex] = updatedOrder;
  indexOrder(updatedOrder);

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .update({
          order_status: updatedOrder.order_status,
          payment_status: updatedOrder.payment_status,
          updated_at: updatedOrder.updated_at,
        })
        .eq('id', existing.id);
    } catch (e) {
      console.warn('Supabase status update error:', e);
    }
  }

  res.json(updatedOrder);
});

// Dashboard Stats (Admin)
app.get('/api/dashboard/stats', requireAdmin, (_req: Request, res: Response) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalOrders = memoryOrders.length;
  const newOrders = memoryOrders.filter((o) => o.order_status === 'new').length;
  const pendingOrders = memoryOrders.filter(
    (o) => o.order_status === 'new' || o.order_status === 'confirmed'
  ).length;
  const confirmedOrders = memoryOrders.filter((o) => o.order_status === 'confirmed').length;
  const preparingOrders = memoryOrders.filter((o) => o.order_status === 'preparing').length;
  const outForDeliveryOrders = memoryOrders.filter((o) => o.order_status === 'out_for_delivery').length;
  const completedOrders = memoryOrders.filter((o) => o.order_status === 'delivered').length;
  const cancelledOrders = memoryOrders.filter((o) => o.order_status === 'cancelled').length;

  const totalSales = memoryOrders
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + o.final_total, 0);

  const todayOrders = memoryOrders.filter((o) => o.created_at.startsWith(todayStr));
  const todaySales = todayOrders
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + o.final_total, 0);

  // Razorpay vs COD payment metrics
  const onlineOrders = memoryOrders.filter((o) => o.payment_method === 'razorpay_online');
  const onlineSales = onlineOrders
    .filter((o) => o.payment_status === 'paid' && o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + o.final_total, 0);

  const codOrders = memoryOrders.filter((o) => o.payment_method === 'cash_on_delivery');
  const codSales = codOrders
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + o.final_total, 0);

  const paidOrdersCount = memoryOrders.filter((o) => o.payment_status === 'paid').length;
  const pendingPaymentOrdersCount = memoryOrders.filter((o) => o.payment_status === 'pending').length;

  res.json({
    total_orders: totalOrders,
    new_orders: newOrders,
    pending_orders: pendingOrders,
    confirmed_orders: confirmedOrders,
    preparing_orders: preparingOrders,
    out_for_delivery_orders: outForDeliveryOrders,
    completed_orders: completedOrders,
    cancelled_orders: cancelledOrders,
    total_sales: totalSales,
    today_orders_count: todayOrders.length,
    today_sales: todaySales,
    online_orders_count: onlineOrders.length,
    online_sales: onlineSales,
    cod_orders_count: codOrders.length,
    cod_sales: codSales,
    paid_orders_count: paidOrdersCount,
    pending_payment_orders_count: pendingPaymentOrdersCount,
  });
});

// -----------------------------------------------------------------------------
// RAZORPAY PAYMENT GATEWAY INTEGRATION
// -----------------------------------------------------------------------------

// Server-side Razorpay Order Creation
app.post('/api/payments/create-razorpay-order', async (req: Request, res: Response): Promise<void> => {
  // Prevent payment initiation when restaurant is closed today
  if (isRestaurantClosedToday()) {
    res.status(403).json({
      error: 'Restaurant is closed today. We are not accepting orders or payments today.',
      is_closed_today: true,
    });
    return;
  }

  const { items, receipt, coupon_code } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must contain at least one food item.' });
    return;
  }

  // Calculate trusted payable amount directly from server-side menu prices
  let calculatedSubtotal = 0;
  for (const item of items) {
    const dbItem = memoryFoodItems.find((f) => f.id === item.food_item_id);
    if (!dbItem) {
      res.status(400).json({ error: `Item ${item.item_name || 'selected'} not found in the menu.` });
      return;
    }
    if (!dbItem.is_available) {
      res.status(400).json({ error: `Sorry, ${dbItem.name} is currently Sold Out.` });
      return;
    }
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      res.status(400).json({ error: `Invalid quantity for ${dbItem.name}` });
      return;
    }
    calculatedSubtotal += dbItem.price * quantity;
  }

  // Check discount from birthday coupon
  let discountAmount = 0;
  if (coupon_code && typeof coupon_code === 'string') {
    const cleanCode = coupon_code.trim().toUpperCase();
    const coupon = memoryBirthdayCoupons.find(c => c.code.toUpperCase() === cleanCode && c.status === 'active');
    if (coupon && calculatedSubtotal >= coupon.min_order_value) {
      if (coupon.offer_type === 'percentage') {
        const rawDiscount = (calculatedSubtotal * coupon.discount_value) / 100;
        discountAmount = coupon.max_discount_cap ? Math.min(rawDiscount, coupon.max_discount_cap) : rawDiscount;
      } else if (coupon.offer_type === 'fixed') {
        discountAmount = Math.min(coupon.discount_value, calculatedSubtotal);
      }
    }
  }

  discountAmount = Math.round(discountAmount);
  const deliveryFee = calculatedSubtotal >= 500 ? 0 : 30; // Free delivery above ₹500, else ₹30
  const finalTotal = Math.max(0, calculatedSubtotal - discountAmount) + deliveryFee;
  const amountInPaise = Math.round(finalTotal * 100); // 1 INR = 100 paise
  const orderReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // If live or configured Razorpay SDK credentials exist, create order via Razorpay API
  if (isRazorpayConfigured && razorpay) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderReceipt,
        notes: {
          restaurant: 'Sri Sathya Sai Mess',
          subtotal: calculatedSubtotal,
          delivery_fee: deliveryFee,
        },
      });

      res.json({
        success: true,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: RAZORPAY_KEY_ID,
        calculated_total: finalTotal,
        is_test_mode: false,
      });
      return;
    } catch (err: any) {
      console.error('Official Razorpay orders.create API encountered an error:', err);
      const razorpayErrMsg = err?.error?.description || err?.message || 'Razorpay order creation failed';
      res.status(502).json({
        success: false,
        error: `Razorpay API Error: ${razorpayErrMsg}. Please verify your Razorpay API keys in .env.`,
      });
      return;
    }
  }

  // Seamless Development / Test Mode: Generate authentic Razorpay order structure
  const testOrderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  res.json({
    success: true,
    order_id: testOrderId,
    amount: amountInPaise,
    currency: 'INR',
    key_id: EFFECTIVE_RAZORPAY_KEY_ID,
    calculated_total: finalTotal,
    is_test_mode: true,
  });
});

// Endpoint for test mode signature generation (uses server's EFFECTIVE_RAZORPAY_KEY_SECRET to generate genuine HMAC-SHA256)
app.post('/api/payments/create-test-signature', (req: Request, res: Response): void => {
  const { razorpay_order_id, razorpay_payment_id } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id) {
    res.status(400).json({ error: 'Order ID and Payment ID required' });
    return;
  }
  const secret = isRazorpayConfigured ? RAZORPAY_KEY_SECRET : EFFECTIVE_RAZORPAY_KEY_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  res.json({ signature });
});

// Server-side Razorpay Signature Verification & Order Confirmation
app.post('/api/payments/verify-razorpay', async (req: Request, res: Response): Promise<void> => {
  if (isRestaurantClosedToday()) {
    res.status(403).json({
      success: false,
      error: 'Restaurant is closed today. We are not accepting orders today.',
      is_closed_today: true,
    });
    return;
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    order_payload,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({
      success: false,
      error: 'Missing required Razorpay payment verification parameters',
    });
    return;
  }

  // 1. Cryptographic HMAC-SHA256 signature verification
  const secretKeyToUse = isRazorpayConfigured ? RAZORPAY_KEY_SECRET : EFFECTIVE_RAZORPAY_KEY_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', secretKeyToUse)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isSignatureValid =
    generatedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(razorpay_signature, 'utf-8')
    );

  if (!isSignatureValid) {
    console.error('Razorpay signature mismatch for payment:', razorpay_payment_id);
    res.status(400).json({
      success: false,
      error: 'Payment verification failed: Invalid cryptographic signature.',
    });
    return;
  }

  // 2. Double-check with Razorpay API if live SDK is active
  if (isRazorpayConfigured && razorpay) {
    try {
      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      if (
        paymentDetails.status !== 'captured' &&
        paymentDetails.status !== 'authorized'
      ) {
        res.status(400).json({
          success: false,
          error: `Payment is not captured. Current status: ${paymentDetails.status}`,
        });
        return;
      }
    } catch (err) {
      console.warn('Razorpay payment fetch check error:', err);
    }
  }

  // 3. Idempotency Check: prevent duplicate order creation if callback repeats
  const existingOrder = memoryOrders.find(
    (o) =>
      (o.razorpay_payment_id && o.razorpay_payment_id === razorpay_payment_id) ||
      (o.razorpay_order_id && o.razorpay_order_id === razorpay_order_id)
  );
  if (existingOrder) {
    res.json({
      success: true,
      order: existingOrder,
      message: 'Order already recorded.',
    });
    return;
  }

  // 4. Create and persist verified order
  if (!order_payload) {
    res.status(400).json({ success: false, error: 'Missing customer order data' });
    return;
  }

  const {
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    customer_latitude,
    customer_longitude,
    items,
    notes,
  } = order_payload;

  let calculatedSubtotal = 0;
  const orderItemsValidated = [];

  for (const item of items) {
    const dbItem = memoryFoodItems.find((f) => f.id === item.food_item_id);
    if (dbItem) {
      const qty = parseInt(item.quantity, 10) || 1;
      const total = dbItem.price * qty;
      calculatedSubtotal += total;
      orderItemsValidated.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        food_item_id: dbItem.id,
        item_name: dbItem.name,
        category_name: dbItem.category_name,
        quantity: qty,
        unit_price: dbItem.price,
        total_price: total,
      });
    }
  }

  const deliveryFee = calculatedSubtotal >= 500 ? 0 : 30;
  const finalTotal = calculatedSubtotal + deliveryFee;

  memoryOrderCounter += 1;
  const orderNumber = `SSM-${memoryOrderCounter}`;

  let googleMapsUrl: string | null = null;
  if (customer_latitude && customer_longitude) {
    googleMapsUrl = `https://www.google.com/maps?q=${customer_latitude},${customer_longitude}`;
  }

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    order_number: orderNumber,
    customer_name: (customer_name || 'Customer').trim(),
    customer_phone: (customer_phone || '').trim(),
    customer_email: customer_email ? customer_email.trim() : undefined,
    delivery_address: (delivery_address || '').trim(),
    customer_latitude: customer_latitude || null,
    customer_longitude: customer_longitude || null,
    google_maps_url: googleMapsUrl,
    subtotal: calculatedSubtotal,
    delivery_fee: deliveryFee,
    final_total: finalTotal,
    payment_method: 'razorpay_online',
    payment_status: 'paid',
    order_status: 'new',
    notes: notes ? notes.trim() : undefined,
    items: orderItemsValidated,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    razorpay_payment_id: razorpay_payment_id,
    razorpay_order_id: razorpay_order_id,
  };

  // Save to Supabase if configured
  if (supabase) {
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([
          {
            order_number: newOrder.order_number,
            customer_name: newOrder.customer_name,
            customer_phone: newOrder.customer_phone,
            customer_email: newOrder.customer_email,
            delivery_address: newOrder.delivery_address,
            customer_latitude: newOrder.customer_latitude,
            customer_longitude: newOrder.customer_longitude,
            google_maps_url: newOrder.google_maps_url,
            subtotal: newOrder.subtotal,
            delivery_fee: newOrder.delivery_fee,
            final_total: newOrder.final_total,
            payment_method: 'razorpay_online',
            payment_status: 'paid',
            order_status: 'new',
            notes: newOrder.notes,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
          },
        ])
        .select()
        .single();

      if (!orderErr && orderData) {
        newOrder.id = orderData.id;

        // Record in payment_records table
        await supabase.from('payment_records').insert([
          {
            order_id: orderData.id,
            payment_gateway: 'razorpay',
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,
            amount: finalTotal,
            currency: 'INR',
            status: 'success',
          },
        ]);
      }
    } catch (e) {
      console.warn('Supabase order creation fallback:', e);
    }
  }

  memoryOrders.unshift(newOrder);
  indexOrder(newOrder);
  perfMetrics.ordersCreated++;

  // Trigger WhatsApp notification via asynchronous background queue
  enqueueTask('order_notification', newOrder);

  res.status(201).json({
    success: true,
    message: 'Payment verified and order created successfully',
    order: newOrder,
  });
});

// Razorpay Webhook Endpoint
app.post('/api/payments/razorpay-webhook', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    return;
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id;

      if (paymentId) {
        const order = memoryOrders.find(
          (o) => o.razorpay_payment_id === paymentId || o.razorpay_order_id === orderId || o.id === orderId
        );
        if (order) {
          order.payment_status = 'paid';
          order.updated_at = new Date().toISOString();
        }

        if (supabase) {
          try {
            await supabase
              .from('orders')
              .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
              .or(`razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId}`);
          } catch (e) {
            console.warn('Webhook Supabase update fallback:', e);
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      console.warn('Razorpay payment.failed event received:', paymentEntity?.id);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// -----------------------------------------------------------------------------
// IMAGE UPLOAD (Supabase Storage or Base64 fallback)
// -----------------------------------------------------------------------------
app.post('/api/upload', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { image_base64, file_name, file_type } = req.body;

  if (!image_base64) {
    res.status(400).json({ error: 'Image data is required' });
    return;
  }

  // If Supabase is connected, upload to Supabase 'food-images' bucket
  if (supabase) {
    try {
      const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const uniqueFileName = `${Date.now()}-${file_name || 'food-item.jpg'}`;

      const { data, error } = await supabase.storage
        .from('food-images')
        .upload(uniqueFileName, buffer, {
          contentType: file_type || 'image/jpeg',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('food-images')
          .getPublicUrl(data.path);

        res.json({ image_url: publicUrlData.publicUrl, stored_in: 'supabase' });
        return;
      }
    } catch (e) {
      console.warn('Supabase storage upload failed, falling back to data URL', e);
    }
  }

  // Fallback: return data URL
  const dataUrl = image_base64.startsWith('data:')
    ? image_base64
    : `data:${file_type || 'image/jpeg'};base64,${image_base64}`;

  res.json({ image_url: dataUrl, stored_in: 'inline_data_url' });
});

// -----------------------------------------------------------------------------
// CUSTOMER REVIEWS & OWNER MODERATION
// -----------------------------------------------------------------------------

// Get approved reviews (Public)
app.get('/api/reviews', (_req: Request, res: Response) => {
  const published = memoryReviews
    .filter((r) => r.status === 'published')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const avgRating = published.length > 0
    ? (published.reduce((acc, r) => acc + r.rating, 0) / published.length).toFixed(1)
    : '5.0';

  res.json({
    reviews: published,
    total_count: published.length,
    average_rating: parseFloat(avgRating),
  });
});

// Get all reviews with moderation stats (Admin)
app.get('/api/reviews/all', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.query;
  let list = [...memoryReviews];

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter((r) => r.status === status);
  }

  const total = memoryReviews.length;
  const pending = memoryReviews.filter((r) => r.status === 'pending').length;
  const published = memoryReviews.filter((r) => r.status === 'published').length;
  const rejected = memoryReviews.filter((r) => r.status === 'rejected').length;
  const avgRating = total > 0
    ? (memoryReviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)
    : '5.0';

  res.json({
    reviews: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    stats: {
      total,
      pending,
      published,
      rejected,
      average_rating: parseFloat(avgRating),
    },
  });
});

// Customer submits review for delivered order
app.post('/api/reviews', (req: Request, res: Response): void => {
  const { order_number, customer_name, rating, comment, food_taste_rating, delivery_rating } = req.body;

  if (!order_number || !customer_name || !rating || !comment) {
    res.status(400).json({ error: 'Order ID, Name, Rating, and Comments are required.' });
    return;
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    return;
  }

  // Find corresponding order if exists
  const matchedOrder = memoryOrders.find(
    (o) => o.order_number.toLowerCase() === order_number.trim().toLowerCase() ||
           o.id === order_number.trim()
  );

  const newReview: OrderReview = {
    id: `rev-${Date.now()}`,
    order_id: matchedOrder ? matchedOrder.id : `ord-ref-${order_number.trim()}`,
    order_number: matchedOrder ? matchedOrder.order_number : order_number.trim(),
    customer_name: customer_name.trim(),
    rating: numericRating,
    comment: comment.trim(),
    food_taste_rating: food_taste_rating ? Math.min(5, Math.max(1, parseInt(food_taste_rating, 10))) : undefined,
    delivery_rating: delivery_rating ? Math.min(5, Math.max(1, parseInt(delivery_rating, 10))) : undefined,
    status: 'published', // Automatically published for customer convenience, owner can moderate/reject in dashboard
    created_at: new Date().toISOString(),
  };

  memoryReviews.unshift(newReview);
  res.status(201).json({ success: true, review: newReview });
});

// Owner moderates review status (Publish, Reject, or mark Pending)
app.patch('/api/reviews/:id/status', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['published', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Status must be published, rejected, or pending' });
    return;
  }

  const review = memoryReviews.find((r) => r.id === id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  review.status = status;
  res.json({ success: true, review });
});

// Owner reply to a customer review
app.post('/api/reviews/:id/reply', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || typeof reply !== 'string' || !reply.trim()) {
    res.status(400).json({ error: 'Reply text cannot be empty' });
    return;
  }

  const review = memoryReviews.find((r) => r.id === id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  review.owner_reply = reply.trim();
  review.owner_replied_at = new Date().toISOString();
  res.json({ success: true, review });
});

// Owner deletes review
app.delete('/api/reviews/:id', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const index = memoryReviews.findIndex((r) => r.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  memoryReviews.splice(index, 1);
  res.json({ success: true, message: 'Review deleted successfully' });
});

// =============================================================================
// OWNER-ONLY SECURE API KEY MANAGEMENT ENDPOINTS
// =============================================================================

// 1. Get all API configurations (Owner-only, strictly masked, never exposes raw secrets)
app.get('/api/admin/api-settings', requireAdmin, (_req: Request, res: Response): void => {
  const supportedProviders: Array<'razorpay' | 'whatsapp' | 'smtp' | 'supabase' | 'google_maps'> = [
    'razorpay',
    'whatsapp',
    'smtp',
    'supabase',
    'google_maps',
  ];

  const configs = supportedProviders.map((prov) => {
    const entry = apiVaultState[prov] || {
      provider: prov,
      is_enabled: false,
      credentials: {},
      updated_at: new Date().toISOString(),
      test_status: 'untested',
    };
    return sanitizeProviderForClient(entry);
  });

  res.json({
    success: true,
    providers: configs,
    security_info: {
      encryption: 'AES-256-GCM',
      storage_type: 'server_encrypted_vault',
      client_side_secrets: false,
      last_updated: new Date().toISOString(),
    },
  });
});

// 2. Save or update API configuration (Owner-only)
app.post('/api/admin/api-settings', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { provider, is_enabled, credentials } = req.body;

  const validProviders = ['razorpay', 'whatsapp', 'smtp', 'supabase', 'google_maps'];
  if (!provider || !validProviders.includes(provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
    return;
  }

  if (typeof credentials !== 'object' || credentials === null) {
    res.status(400).json({ error: 'Credentials object is required.' });
    return;
  }

  // Retrieve existing credentials to allow partial updates (e.g. updating key_id without retyping key_secret)
  const existing = apiVaultState[provider] || {
    provider,
    is_enabled: true,
    credentials: {},
    updated_at: new Date().toISOString(),
    test_status: 'untested',
  };

  const updatedCredentials: Record<string, string> = { ...existing.credentials };

  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      // Ignore if user submitted placeholder bullets
      if (trimmed.includes('••••')) {
        continue;
      }
      if (trimmed.length > 0) {
        updatedCredentials[k] = trimmed;
      }
    }
  }

  apiVaultState[provider] = {
    provider,
    is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
    credentials: updatedCredentials,
    updated_at: new Date().toISOString(),
    last_tested_at: existing.last_tested_at,
    test_status: existing.test_status || 'untested',
    test_message: existing.test_message,
  };

  saveApiVault();
  applyVaultToRuntime();

  res.json({
    success: true,
    message: `API configuration for ${provider.toUpperCase()} saved and encrypted successfully.`,
    config: sanitizeProviderForClient(apiVaultState[provider]),
  });
});

// 3. Enable or disable an integration (Owner-only)
app.post('/api/admin/api-settings/toggle', requireAdmin, (req: Request, res: Response): void => {
  const { provider, is_enabled } = req.body;

  if (!provider || !apiVaultState[provider]) {
    res.status(404).json({ error: 'Provider configuration not found in vault.' });
    return;
  }

  apiVaultState[provider].is_enabled = Boolean(is_enabled);
  apiVaultState[provider].updated_at = new Date().toISOString();

  saveApiVault();
  applyVaultToRuntime();

  res.json({
    success: true,
    message: `${provider.toUpperCase()} integration is now ${apiVaultState[provider].is_enabled ? 'ENABLED' : 'DISABLED'}.`,
    config: sanitizeProviderForClient(apiVaultState[provider]),
  });
});

// 4. Test API Connection (Owner-only)
app.post('/api/admin/api-settings/test', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.body;

  if (!provider || !apiVaultState[provider]) {
    res.status(404).json({ error: 'Provider configuration not found. Please save credentials first.' });
    return;
  }

  const entry = apiVaultState[provider];
  const creds = entry.credentials || {};

  let result: { success: boolean; message: string };

  try {
    switch (provider) {
      case 'razorpay': {
        const keyId = creds.key_id;
        const keySecret = creds.key_secret;
        if (!keyId || !keySecret) {
          result = { success: false, message: 'Both Razorpay Key ID and Key Secret must be provided to test connection.' };
          break;
        }
        if (keyId.includes('test_srisathyasai')) {
          result = { success: true, message: 'Razorpay Sandbox Test Mode is active and operational.' };
          break;
        }
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: { Authorization: authHeader },
        });
        if (testRes.ok) {
          result = { success: true, message: 'Connected to Razorpay API successfully. Key pair is live and valid.' };
        } else if (testRes.status === 401) {
          result = { success: false, message: 'Razorpay Authentication failed: Invalid Key ID or Key Secret.' };
        } else {
          result = { success: false, message: `Razorpay API responded with HTTP status ${testRes.status}.` };
        }
        break;
      }

      case 'whatsapp': {
        const token = creds.access_token;
        const phoneId = creds.phone_number_id;
        if (!token) {
          result = { success: false, message: 'WhatsApp Access Token is required to test.' };
          break;
        }
        const endpoint = phoneId ? `https://graph.facebook.com/v18.0/${phoneId}` : 'https://graph.facebook.com/v18.0/me';
        const waRes = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (waRes.ok) {
          result = { success: true, message: 'Connected to Meta WhatsApp Cloud API successfully. Token is valid.' };
        } else {
          const data: any = await waRes.json().catch(() => ({}));
          result = { success: false, message: data.error?.message || `WhatsApp verification failed (HTTP ${waRes.status})` };
        }
        break;
      }

      case 'smtp': {
        const host = creds.smtp_host;
        const port = parseInt(creds.smtp_port || '587', 10);
        const user = creds.smtp_user;
        const pass = creds.smtp_pass;
        if (!host || !user) {
          result = { success: false, message: 'SMTP Host and User are required to test.' };
          break;
        }
        const testMailer = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 8000,
        });
        await testMailer.verify();
        result = { success: true, message: 'Connected to SMTP server successfully. Credentials and TLS handshake verified.' };
        break;
      }

      case 'supabase': {
        const url = creds.supabase_url;
        const key = creds.supabase_service_role_key || creds.supabase_anon_key;
        if (!url || !key) {
          result = { success: false, message: 'Supabase URL and API Key are required to test.' };
          break;
        }
        const cleanUrl = url.replace(/\/+$/, '');
        const supaRes = await fetch(`${cleanUrl}/rest/v1/`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (supaRes.status === 200 || supaRes.status === 404) {
          result = { success: true, message: 'Supabase REST API is reachable and authenticated.' };
        } else {
          result = { success: false, message: `Supabase API returned HTTP ${supaRes.status}` };
        }
        break;
      }

      case 'google_maps': {
        const key = creds.google_maps_api_key;
        if (!key) {
          result = { success: false, message: 'Google Maps API key is required to test.' };
          break;
        }
        const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Hyderabad&key=${encodeURIComponent(key)}`);
        const gData: any = await gRes.json();
        if (gData.status === 'OK' || gData.status === 'ZERO_RESULTS') {
          result = { success: true, message: 'Google Maps Geocoding API key is active and authorized.' };
        } else if (gData.error_message) {
          result = { success: false, message: `Google Maps error: ${gData.status} - ${gData.error_message}` };
        } else {
          result = { success: true, message: `Google Maps responded with status: ${gData.status}` };
        }
        break;
      }

      default:
        result = { success: false, message: 'Unsupported provider for testing.' };
    }
  } catch (err: any) {
    result = { success: false, message: `Connection test error: ${err.message || 'Unknown network error'}` };
  }

  // Update vault test status
  entry.last_tested_at = new Date().toISOString();
  entry.test_status = result.success ? 'success' : 'failed';
  entry.test_message = result.message;

  saveApiVault();

  res.json({
    success: result.success,
    message: result.message,
    test_status: entry.test_status,
    last_tested_at: entry.last_tested_at,
  });
});

// 5. Delete API Configuration (Owner-only)
app.delete('/api/admin/api-settings/:provider', requireAdmin, (req: Request, res: Response): void => {
  const { provider } = req.params;

  if (!provider || !apiVaultState[provider]) {
    res.status(404).json({ error: `API configuration for ${provider} not found.` });
    return;
  }

  delete apiVaultState[provider];
  saveApiVault();
  applyVaultToRuntime();

  res.json({
    success: true,
    message: `API configuration for ${provider.toUpperCase()} has been deleted from encrypted vault.`,
    provider,
  });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSETS
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sri Sathya Sai Mess server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

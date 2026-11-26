import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type GatewayEnvironment = 'test' | 'live';

export interface RazorpayEnvironmentCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  source: 'env' | 'firestore' | 'mixed' | 'none';
}

export interface CallerIdentity {
  uid: string;
  email: string;
  displayName?: string;
  isMasterAdmin: boolean;
  studioId?: string | null;
  role?: string;
}

export const MASTER_ADMIN_EMAIL = 'jarsaniya.abhay@gmail.com';
const DEFAULT_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'studio-os-live-2026';

let cachedAdminApp: any = null;
let cachedFirestore: any = null;
let adminInitAttempted = false;

function getEncryptionKey(): Buffer {
  const seed =
    process.env.STUDIO_OS_SECRET_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    `${DEFAULT_PROJECT_ID}-razorpay-vault-v1`;
  return crypto.scryptSync(seed, 'studio-os-razorpay-salt', 32);
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload || !payload.includes(':')) return '';
  try {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function maskSecret(value?: string | null): string {
  if (!value || value.trim().length === 0) return '';
  const clean = value.trim();
  if (clean.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(12, clean.length - 4))}${clean.slice(-4)}`;
}

export function isMaskedPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const clean = value.trim();
  return clean.length === 0 || clean.includes('•') || clean.startsWith('****');
}

export function getFirebaseAdmin(): { app: any; db: any; auth: any } | null {
  if (cachedAdminApp && cachedFirestore) {
    return {
      app: cachedAdminApp,
      db: cachedFirestore,
      auth: cachedAdminApp.auth()
    };
  }
  if (adminInitAttempted && !cachedAdminApp) {
    return null;
  }
  adminInitAttempted = true;

  try {
    const admin = require('firebase-admin');
    if (admin.apps && admin.apps.length > 0) {
      cachedAdminApp = admin.app();
      cachedFirestore = cachedAdminApp.firestore();
      return { app: cachedAdminApp, db: cachedFirestore, auth: cachedAdminApp.auth() };
    }

    let serviceAccount: any = null;
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawJson) {
      try {
        serviceAccount = JSON.parse(rawJson);
      } catch {
        const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      serviceAccount = {
        projectId: DEFAULT_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    }

    if (serviceAccount) {
      cachedAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || serviceAccount.projectId || DEFAULT_PROJECT_ID
      });
      cachedFirestore = cachedAdminApp.firestore();
      return { app: cachedAdminApp, db: cachedFirestore, auth: cachedAdminApp.auth() };
    }

    return null;
  } catch (err) {
    console.warn('[RazorpayServer] Firebase Admin init skipped:', (err as any)?.message);
    return null;
  }
}

export async function verifyFirebaseCaller(req: any): Promise<CallerIdentity | null> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) return null;

  const adminCtx = getFirebaseAdmin();
  if (adminCtx) {
    try {
      const decoded = await adminCtx.auth.verifyIdToken(token);
      const uid = decoded.uid;
      const email = (decoded.email || '').toLowerCase();
      let role = '';
      let studioId: string | null = null;
      let isMasterAdmin = email === MASTER_ADMIN_EMAIL;

      const [userDoc, adminDoc] = await Promise.all([
        adminCtx.db.collection('users').doc(uid).get(),
        adminCtx.db.collection('masterAdmins').doc(uid).get()
      ]);

      if (adminDoc.exists && adminDoc.data()?.isActive !== false) {
        isMasterAdmin = isMasterAdmin || email === MASTER_ADMIN_EMAIL;
      }
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        role = data.role || data.accountType || '';
        studioId = data.studioId || null;
        if (role === 'platform_master_admin' && email === MASTER_ADMIN_EMAIL) {
          isMasterAdmin = true;
        }
      }

      return {
        uid,
        email,
        displayName: decoded.name || email,
        isMasterAdmin,
        studioId,
        role
      };
    } catch {
      return null;
    }
  }

  // Fallback token verification via Google Identity Toolkit REST API when service account env is absent
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    const email = (user.email || '').toLowerCase();
    return {
      uid: user.localId,
      email,
      displayName: user.displayName || email,
      isMasterAdmin: email === MASTER_ADMIN_EMAIL,
      studioId: null,
      role: email === MASTER_ADMIN_EMAIL ? 'platform_master_admin' : 'studio_owner'
    };
  } catch {
    return null;
  }
}

export async function getGatewaySettings(): Promise<Record<string, any>> {
  const adminCtx = getFirebaseAdmin();
  const defaults = {
    gateway: 'razorpay',
    enabled: false,
    environment: (process.env.RAZORPAY_ENVIRONMENT === 'live' ? 'live' : 'test') as GatewayEnvironment,
    currency: 'INR',
    defaultPaymentMode: 'upi_autopay',
    upiAutopayEnabled: true,
    oneTimeEnabled: true,
    maxAutopayRetries: 3,
    gracePeriodDays: 7,
    autoRetryEnabled: true
  };

  if (!adminCtx) return defaults;

  try {
    const snap = await adminCtx.db.collection('platformPaymentSettings').doc('razorpay').get();
    if (snap.exists) {
      return { ...defaults, ...snap.data() };
    }
  } catch (err) {
    console.warn('[RazorpayServer] Settings read fallback:', (err as any)?.message);
  }
  return defaults;
}

export async function resolveCredentials(env: GatewayEnvironment): Promise<RazorpayEnvironmentCredentials> {
  const prefix = env === 'live' ? 'RAZORPAY_LIVE_' : 'RAZORPAY_TEST_';
  let envKeyId = process.env[`${prefix}KEY_ID`] || '';
  let envKeySecret = process.env[`${prefix}KEY_SECRET`] || '';
  let envWebhookSecret = process.env[`${prefix}WEBHOOK_SECRET`] || '';

  // Also check single-environment generic variables matching key prefix (rzp_test_ / rzp_live_)
  const genericKeyId = process.env.RAZORPAY_KEY_ID || '';
  if (!envKeyId && genericKeyId) {
    const matchesEnv =
      (env === 'live' && genericKeyId.startsWith('rzp_live_')) ||
      (env === 'test' && genericKeyId.startsWith('rzp_test_'));
    if (matchesEnv) {
      envKeyId = genericKeyId;
      envKeySecret = envKeySecret || process.env.RAZORPAY_KEY_SECRET || '';
      envWebhookSecret = envWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    }
  }

  let fsKeyId = '';
  let fsKeySecret = '';
  let fsWebhookSecret = '';

  const adminCtx = getFirebaseAdmin();
  if (adminCtx) {
    try {
      const secretDoc = await adminCtx.db.collection('platformPaymentSecrets').doc(env).get();
      if (secretDoc.exists) {
        const d = secretDoc.data() || {};
        fsKeyId = d.keyId || '';
        fsKeySecret = d.keySecretEncrypted ? decryptSecret(d.keySecretEncrypted) : '';
        fsWebhookSecret = d.webhookSecretEncrypted ? decryptSecret(d.webhookSecretEncrypted) : '';
      }
    } catch (err) {
      console.warn('[RazorpayServer] Secret vault read notice:', (err as any)?.message);
    }
  }

  const keyId = envKeyId || fsKeyId;
  const keySecret = envKeySecret || fsKeySecret;
  const webhookSecret = envWebhookSecret || fsWebhookSecret;

  const hasEnv = Boolean(envKeyId || envKeySecret || envWebhookSecret);
  const hasFs = Boolean(fsKeyId || fsKeySecret || fsWebhookSecret);
  const source = hasEnv && hasFs ? 'mixed' : hasEnv ? 'env' : hasFs ? 'firestore' : 'none';

  return { keyId, keySecret, webhookSecret, source };
}

export async function razorpayRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  creds: { keyId: string; keySecret: string },
  body?: Record<string, any>
): Promise<{ ok: boolean; status: number; data?: T; error?: string; code?: string }> {
  if (!creds.keyId || !creds.keySecret) {
    return {
      ok: false,
      status: 400,
      error: 'Razorpay API Key ID and Key Secret are not configured for the active environment.'
    };
  }

  const authToken = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
  const url = `https://api.razorpay.com/v1${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const json: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status,
        error: json?.error?.description || json?.error?.reason || `Razorpay API error (${resp.status})`,
        code: json?.error?.code
      };
    }

    return { ok: true, status: resp.status, data: json as T };
  } catch (err: any) {
    return {
      ok: false,
      status: 502,
      error: err?.message || 'Unable to reach Razorpay API.'
    };
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature.trim(), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export function verifyRazorpayCheckoutSignature(params: {
  orderId?: string;
  subscriptionId?: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { orderId, subscriptionId, paymentId, signature, keySecret } = params;
  if (!paymentId || !signature || !keySecret) return false;

  const payload = subscriptionId
    ? `${paymentId}|${subscriptionId}`
    : orderId
      ? `${orderId}|${paymentId}`
      : '';
  if (!payload) return false;

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature.trim(), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export function computeNextExpiryIso(
  baseIso: string,
  cycle: 'monthly' | 'quarterly' | 'yearly'
): string {
  const d = new Date(baseIso || Date.now());
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else if (cycle === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export async function readRawRequestBody(req: IncomingMessage): Promise<Buffer> {
  if (typeof (req as any).body === 'string') {
    return Buffer.from((req as any).body, 'utf8');
  }
  if (Buffer.isBuffer((req as any).body)) {
    return (req as any).body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
  }
  return Buffer.concat(chunks);
}

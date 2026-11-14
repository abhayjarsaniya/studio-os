# STUDIO OS — ENVIRONMENT VARIABLES & SECRETS SPECIFICATION

**Phase:** 11 — Responsive Testing, Quality Assurance & Production Preparation  
**Security Policy:** Never commit secrets to Git. Never expose backend API keys or secrets via Vite client-side `VITE_` variables.

---

## 1. Client-Side Environment Variables (`.env.production`)

Client-side variables are exposed to the browser via Vite's `import.meta.env`. They must only contain public identifiers:

```bash
# Application Environment Mode
VITE_APP_ENV=production
VITE_DEV_MODE=false

# Studio OS App URL
VITE_APP_URL=https://app.studioos.com
VITE_PLATFORM_URL=https://platform.studioos.com

# Firebase Client Configuration (Safe for frontend exposure)
VITE_FIREBASE_API_KEY=AIzaSyA1234567890abcdefghijklmnopqrst
VITE_FIREBASE_AUTH_DOMAIN=studio-os-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studio-os-prod
VITE_FIREBASE_STORAGE_BUCKET=studio-os-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef

# Payment Gateway Public Key (Client-side checkout modal)
VITE_RAZORPAY_KEY_ID=rzp_live_abcdef12345678

# Telemetry / Error Monitoring DSN (Public ingest endpoint)
VITE_SENTRY_DSN=https://abcdef123456@o123456.ingest.sentry.io/123456
```

---

## 2. Server-Side Environment Variables (Cloud Functions / Cloud Run)

Server-side secrets must be configured via Google Cloud Secret Manager or Firebase Functions Secrets. **Never prefix these with `VITE_`**:

```bash
# Firebase Admin Credentials
FIREBASE_CONFIG={...}

# Payment Gateway Secret Keys
RAZORPAY_KEY_SECRET=live_secret_key_abcdef1234567890
RAZORPAY_WEBHOOK_SECRET=whsec_abcdef1234567890abcdef1234567890

# Platform Super Admin System Secrets
PLATFORM_MASTER_ENCRYPTION_KEY=enc_32_byte_hex_key_here
SUPPORT_ACCESS_TOKEN_SECRET=token_secret_here

# Automated Email & SMS Gateway Keys
RESEND_API_KEY=re_live_abcdef123456
FAST2SMS_API_KEY=f2s_live_abcdef123456
```

---

## 3. Environment Validation Script

A deployment pre-flight validation check ensures all mandatory client keys are present:

```ts
const REQUIRED_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET'
];

REQUIRED_VARS.forEach(v => {
  if (!import.meta.env[v]) {
    throw new Error(`[Deployment Configuration Error]: Missing required environment variable "${v}"`);
  }
});
```

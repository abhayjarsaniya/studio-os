# STUDIO OS — PRODUCTION DEPLOYMENT GUIDE

**Phase:** 11 — Responsive Testing, Quality Assurance & Production Preparation  
**Target Hosting Platforms:** Vercel (Frontend SPA) + Firebase (Cloud Firestore & Auth)  

---

## 1. Pre-Deployment Verification Checklist

Before triggering a production build or deploy:
- [x] Run `npx vitest run` (182 / 182 tests passing across 10 suites).
- [x] Run `npm run build` (`tsc && vite build` passing with 0 errors).
- [x] Verify `.env.production` contains valid production keys with no test tokens.
- [x] Deploy updated Firestore rules (`firebase deploy --only firestore:rules`).
- [x] Deploy updated Firestore composite indexes (`firebase deploy --only firestore:indexes`).
- [x] Deploy Storage rules (`firebase deploy --only storage`).

---

## 2. Frontend Deployment to Vercel

### 1. Build & Output Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: `20.x` or higher

### 2. SPA Route Rewrites (`vercel.json`)
The project includes `vercel.json` to handle client-side routing fallback:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This guarantees that direct navigation to nested URLs (such as `#/platform/studios` or `/app/finance`) will not return 404 errors on browser refresh.

### 3. Deployment CLI
Deploy directly via Vercel CLI:
```bash
vercel --prod
```

---

## 3. Post-Deployment Smoke Tests

Execute these verification checks immediately following deployment:
1. **Root Load**: Open `https://app.studioos.com` — verify dashboard renders with zero console errors.
2. **Platform Portal Access**: Open `https://app.studioos.com/#/platform/dashboard` as Platform Super Admin — verify SaaS metrics (MRR, active studios).
3. **Tenant Switcher**: Switch between Studio A and Studio B — verify isolation of customer and invoice records.
4. **PDF Engine**: Generate a quotation and invoice — verify correct Indian Rupee (`₹`) symbol rendering and GST tax breakdown.
5. **WhatsApp Click-to-Chat**: Click a WhatsApp link — verify valid `wa.me/<digits>` URI format without invalid characters.
6. **Error Boundary**: Trigger a simulated error — verify user-friendly recovery screen without exposed stack traces.

---

## 4. Rollback Procedure

If a critical issue occurs post-release:
1. **Instant Vercel Rollback**: Open Vercel Project Dashboard $\rightarrow$ Deployments $\rightarrow$ Select prior healthy deployment $\rightarrow$ Click **"Instant Rollback"**.
2. **Firestore Rules Rollback**:
   ```bash
   git checkout <last-healthy-tag> firestore.rules
   firebase deploy --only firestore:rules --project studio-os-prod
   ```
3. Issue incident post-mortem in error monitoring system.

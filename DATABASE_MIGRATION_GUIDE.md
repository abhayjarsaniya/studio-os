# STUDIO OS — DATABASE SCHEMA MIGRATION & ONBOARDING GUIDE

**Phase:** 11 — Responsive Testing, Quality Assurance & Production Preparation  
**Target:** Safe schema upgrades, historical data preservation, demo data segregation  

---

## 1. Principles of Non-Destructive Migration

Studio OS adheres strictly to non-destructive schema evolution:
1. **Never Drop Fields**: Obsolete fields are marked deprecated; new schemas accept them as optional.
2. **Backwards Compatibility**: Schema parsers use smart fallbacks for optional or newly introduced properties (e.g., `dueDays` defaulting to 14 if `dueDate` is omitted).
3. **Deterministic Idempotency**: Migration scripts can be run multiple times without creating duplicate records or altering existing primary keys.
4. **Historical Pricing Preservation**: When SaaS subscription plan prices increase, the existing studio subscriptions store immutable agreed pricing (`agreedPrice` and `planVersion`), ensuring subscribers are never unexpectedly charged higher rates.

---

## 2. Real Studio Tenant Onboarding Process

When onboarding a new photography studio onto Studio OS:

### 1. Studio Creation Script
```ts
import { studioService } from './services/studioService';
import { platformSubscriptionManager } from './services/platformSubscriptionManager';
import { roleService } from './services/roleService';

export function onboardStudio(params: {
  studioName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  planId?: string;
}) {
  // 1. Provision Studio Tenant Profile
  const studio = studioService.createStudio({
    name: params.studioName,
    title: params.ownerName,
    email: params.ownerEmail,
    phone: params.ownerPhone,
    city: params.city
  });

  // 2. Initialize Default 12 Studio Roles & RBAC Matrix
  roleService.restoreDefaultRoles(studio.id);

  // 3. Initialize SaaS Subscription (₹500/mo Standard Plan with 14-day free trial)
  platformSubscriptionManager.initializeTrialSubscription(
    studio.id,
    params.planId || 'plan_standard_500',
    14
  );

  return studio;
}
```

---

## 3. Demo Data vs. Production Data Segregation

1. **Demo Studio Identifiers**:
   - `studio_royal_001`: Royal Weddings Studio (Flagship Mumbai enterprise demo).
   - `studio_creative_002`: Creative Wedding Studio (Destination Goa beach shoot demo).
2. **Demo Account Guarding**:
   - Demo studios carry explicit metadata flag `isDemoStudio: true`.
   - Production onboarding scripts generate random UUID studio identifiers (`studio_prod_<timestamp>_<hash>`) that cannot collide with demo records.
   - Demo records are quarantined from real multi-tenant billing analytics and will never be billed real currency.

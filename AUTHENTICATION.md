# Studio OS – Authentication & Identity Architecture

## 1. Overview

Studio OS enforces a strict **three-tier account hierarchy** powered by Firebase Authentication and server-controlled membership resolution:

1. **Master Admin**: Platform Owner (unlimited studio oversight, billing, global RBAC).
2. **Studio Owner**: Photography Studio Business Owner (complete studio operations).
3. **Employee**: Studio Team Member / Photographer / Editor / Drone Pilot.

---

## 2. Strict Two-Field Login Form

Users log in using **only two fields**:
- **Field 1**: Email or Username
- **Field 2**: Password

There is no manual Studio ID or Tenant Slug input.

### Automatic Studio Identification Workflow:
1. User enters Email or Username + Password.
2. `firebaseAuthService` resolves Username to registered email.
3. Authenticates against Firebase Auth (`signInWithEmailAndPassword`) and verifies cryptographically hashed credentials.
4. Identifies the user's active tenant (`account.studioId`).
5. Loads studio profile, branches, and authorized role permissions.
6. Mounts the designated workspace dashboard without role-switching controls.

---

## 3. Pre-Configured Demo Credentials

| Role | Username / Email | Password | Assigned Studio | Dashboard Route |
|---|---|---|---|---|
| **Master Admin** | `masteradmin@studioos.internal` | `MasterAdmin@2026` | Platform Global | `/master/dashboard` |
| **Studio Owner** | `aarav@royalframes.in` (or `aarav_ahm`) | `StudioOwner@123` | SHREEJI STUDIO | `/` (Owner CRM) |
| **Lead Photographer** | `kabir@royalframes.in` (or `kabir_pho`) | `ChangeMe@123` | SHREEJI STUDIO | `/tasks` |
| **Cinematographer** | `priya@royalframes.in` (or `priya_cin`) | `ChangeMe@123` | SHREEJI STUDIO | `/tasks` |

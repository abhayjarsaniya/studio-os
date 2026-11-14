# Studio OS – Development Mode & Preview Architecture

## 1. No-Login Development Preview Guarantee

During development, Studio OS runs with authentication bypass enabled:
- No login or registration screen is forced upon launching.
- The app immediately boots into a verified demo studio.
- Two distinct photography studios (**Studio A: Royal Photography** and **Studio B: Creative Wedding Studio**) are accessible via the **Studio Switcher**.
- Switching studios instantly changes the active tenant context and swaps out all customers, events, branches, team members, and tasks with 100% data isolation.

---

## 2. Testing Roles Without Passwords

The **Role Switcher** allows you to test the experience from different perspectives:
1. **Studio Founder / Creative Director** (Full access, billing, settings)
2. **Studio Operations Manager** (Logistics, budgets, timelines)
3. **Senior Lead Photographer** (On-location shoot milestones, gear lists)
4. **Lead Cinematographer & Drone Pilot** (Multi-cam setups, drone permits)
5. **Head of Color Grading** (Post-production tasks, review recuts)
6. **Client Relations & Bookings** (WhatsApp templates, client reminders)

---

## 3. Automated Verification

Run the automated test suite at any time:
```bash
npm test
```
or
```bash
npx vitest run
```
This runs 10 automated test suites verifying:
- Studio A sees only its own customers.
- Studio B sees only its own customers.
- Studio A sees only its own events.
- Studio B sees only its own events.
- Studio switching works without cross-tenant leaks.
- Event and customer creation correctly binds to the active tenant ID.
- Services throw an exception if called without an explicit `studioId`.
- Audit logs are partitioned by tenant.

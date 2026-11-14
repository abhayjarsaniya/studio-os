# STUDIO OS — KNOWN ISSUES & LIMITATIONS REGISTER

**Phase:** 11 — Responsive Testing, Quality Assurance & Production Preparation  
**Tracking Status:** 0 Critical Blockers | 0 High Severity Bugs | Low-Impact Operational Polish  

---

## 1. Resolved Issues in Phase 11
The following issues identified during the comprehensive Phase 11 audit were fixed and validated with automated regression tests:
- Fixed missing `dueDate` fallback in `invoiceService.createInvoice`.
- Fixed `SubEventMemberAssignment` payload normalization in `subEventService.assignMember`.
- Fixed `SalaryProfile` initialization defaults in `salaryService.saveSalaryProfile`.
- Fixed error message sanitization in `errorMonitorService` to scrub tokens and emails.
- Added React root `ErrorBoundary` to prevent unhandled UI render crashes.
- Added Rollup code splitting in `vite.config.ts` to reduce bundle sizes.
- Added `vercel.json` SPA route rewrite rules.

---

## 2. Minor Operational Limitations & Non-Blocking Notes

### 1. Browser Print Dialog Differences
- **Description**: While PDF generation uses standardized A4 print styles and margins, different browsers (e.g. Safari vs Chrome on iOS/Android) render print dialog headers (page URL and timestamp) according to user browser settings.
- **Impact**: Low. Users can toggle "Headers and Footers" off in the native print dialog for clean output.

### 2. Large File Attachment Upload Bandwidth
- **Description**: On mid-range 3G/4G mobile connections in remote destination wedding venues (e.g. remote palace shoots), uploading multi-gigabyte RAW image previews should be done via background queue rather than immediate UI blocking.
- **Workaround**: The application displays loading indicators and recommends high-speed broadband or offline preview caching for RAW files over 100 MB.

### 3. WhatsApp Desktop App Fallback
- **Description**: The generated `wa.me/<digits>?text=...` URI opens WhatsApp Web on desktop browsers and the native WhatsApp mobile app on smartphones. If WhatsApp Web is not already signed in on desktop, the user must scan the QR code once.
- **Impact**: Standard WhatsApp platform behavior.

---

## 3. Release Readiness Certification
No remaining issue compromises tenant data separation, billing calculation accuracy, security privileges, or system uptime. Studio OS is ready for live deployment.

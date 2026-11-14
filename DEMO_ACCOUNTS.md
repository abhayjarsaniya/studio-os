# STUDIO OS — MASTER DEMO ACCOUNTS & CREDENTIALS SHEET
**Phase 12: Super Admin Control Center, Multi-Studio Management & Advanced Access Control**

---

## 1. PLATFORM SUPER ADMIN (SaaS Control Center)

The Platform Super Admin operates above individual studio tenants and possesses master authority over all 5 studios, tenant lifecycles (Hide, Suspend, Unhide, Reactivate, Archive), platform-wide global feature killswitches, studio-level feature overrides, and global studio event inspection.

| Parameter | Details |
|---|---|
| **Role** | `PLATFORM_SUPER_ADMIN` |
| **Email** | `admin@studioos.platform` |
| **Password** | `SuperAdmin@2026` |
| **Access URL** | `#/platform/dashboard` |
| **Direct Links** | `#/platform/studios` • `#/platform/events` • `#/platform/features` • `#/platform/subscriptions` |
| **Capabilities** | View all 5 studios, Hide/Unhide tenants, Inspect all 120 global events & crew call sheets, Override feature access per studio |

---

## 2. THE FIVE GUJARAT DEMO STUDIOS & OWNERS

Studio OS includes 5 independent Gujarat-based photography studios with realistic regional branding, diverse specializations, dedicated branches, and realistic event portfolios (24 distinct events per studio = 120 events total).

| Studio ID | Studio Name & City | Specialization | Studio Owner | Owner Email | Temporary Password |
|---|---|---|---|---|---|
| `studio_royal_frames_001` | **Royal Frames Photography**<br>Ahmedabad (SG Highway) | Luxury Weddings & High-end Heritage Visuals | **Aarav Patel** | `aarav@royalframes.in` | `StudioOS@2026` |
| `studio_moments_002` | **Moments Studio**<br>Surat (Ghod Dod Road) | Weddings, Family Portraits & Maternity | **Krunal Shah** | `krunal@momentsstudio.in` | `StudioOS@2026` |
| `studio_pixelcraft_003` | **PixelCraft Photography**<br>Vadodara (Alkapuri) | Commercial, Fashion, Architecture & Products | **Rohan Desai** | `rohan@pixelcraft.in` | `StudioOS@2026` |
| `studio_shutter_stories_004` | **Shutter Stories**<br>Rajkot (Kalawad Road) | Saurashtra Traditional & Cultural Weddings | **Meet Joshi** | `meet@shutterstories.in` | `StudioOS@2026` |
| `studio_golden_hour_005` | **Golden Hour Studio**<br>Gandhinagar (Kudasan / GIFT City) | Destination Weddings & Corporate Conclaves | **Dhruv Trivedi** | `dhruv@goldenhour.in` | `StudioOS@2026` |

*Note: For backwards compatibility with test suites from Phases 1–11, `studio_royal_001` (Kabir Sharma) and `studio_creative_002` (Zoya Akhtar) remain fully operational and accessible.*

---

## 3. PROVISIONED EMPLOYEE LOGIN ACCOUNTS

Every studio team member has provisioned login credentials with `mustChangePassword: true` on initial authentication.

### Demo Studio 1: Royal Frames Photography (Ahmedabad)
- **Studio Owner:** `aarav_ahm` (`aarav@royalframes.in`) • Password: `StudioOS@2026`
- **Lead Candid Photographer:** `pooja_ahm` (`pooja.ahmedabad@example.com`) • Password: `StudioOS@2026`
- **Cinematographer & Drone:** `vikram_ahm` (`vikram.ahmedabad@example.com`) • Password: `StudioOS@2026`
- **Senior Colorist / Editor:** `neha_ahm` (`neha.ahmedabad@example.com`) • Password: `StudioOS@2026`
- **Studio Operations Manager:** `amit_ahm` (`amit.ahmedabad@example.com`) • Password: `StudioOS@2026`

### Demo Studio 2: Moments Studio (Surat)
- **Studio Owner:** `krunal_sur` (`krunal@momentsstudio.in`) • Password: `StudioOS@2026`
- **Lead Photographer:** `pooja_sur` (`pooja.surat@example.com`) • Password: `StudioOS@2026`
- **Cinematographer:** `vikram_sur` (`vikram.surat@example.com`) • Password: `StudioOS@2026`
- **Video Editor:** `neha_sur` (`neha.surat@example.com`) • Password: `StudioOS@2026`
- **Studio Manager:** `amit_sur` (`amit.surat@example.com`) • Password: `StudioOS@2026`

### Demo Studio 3: PixelCraft Photography (Vadodara)
- **Studio Owner:** `rohan_vad` (`rohan@pixelcraft.in`) • Password: `StudioOS@2026`
- **Commercial Lead:** `pooja_vad` (`pooja.vadodara@example.com`) • Password: `StudioOS@2026`
- **Cinematographer:** `vikram_vad` (`vikram.vadodara@example.com`) • Password: `StudioOS@2026`
- **Senior Retoucher:** `neha_vad` (`neha.vadodara@example.com`) • Password: `StudioOS@2026`
- **Client Relations:** `amit_vad` (`amit.vadodara@example.com`) • Password: `StudioOS@2026`

### Demo Studio 4: Shutter Stories (Rajkot)
- **Studio Owner:** `meet_raj` (`meet@shutterstories.in`) • Password: `StudioOS@2026`
- **Traditional Photographer:** `pooja_raj` (`pooja.rajkot@example.com`) • Password: `StudioOS@2026`
- **Cinematographer:** `vikram_raj` (`vikram.rajkot@example.com`) • Password: `StudioOS@2026`
- **Video Editor:** `neha_raj` (`neha.rajkot@example.com`) • Password: `StudioOS@2026`
- **Studio Manager:** `amit_raj` (`amit.rajkot@example.com`) • Password: `StudioOS@2026`

### Demo Studio 5: Golden Hour Studio (Gandhinagar)
- **Studio Owner:** `dhruv_gan` (`dhruv@goldenhour.in`) • Password: `StudioOS@2026`
- **Lead Photographer:** `pooja_gan` (`pooja.gandhinagar@example.com`) • Password: `StudioOS@2026`
- **Cinematographer & Drone:** `vikram_gan` (`vikram.gandhinagar@example.com`) • Password: `StudioOS@2026`
- **Editor & Colorist:** `neha_gan` (`neha.gandhinagar@example.com`) • Password: `StudioOS@2026`
- **Operations Manager:** `amit_gan` (`amit.gandhinagar@example.com`) • Password: `StudioOS@2026`

---

## 4. EXTERNAL SUPPLIERS & COLLABORATORS (17 Categories)

Studio OS supports 17 specialized supplier and partner categories. Registered suppliers receive restricted portal visibility to check call times and venue directions without accessing customer personal numbers or studio financial margins.

### 17 Supplier Categories Covered:
1. `drone_pilots` — Drone Pilots & Aerial Cinematography
2. `traditional_videographers` — Traditional Videographers
3. `cinematic_videographers` — Cinematic Videographers
4. `traditional_photographers` — Traditional Photographers
5. `candid_photographers` — Candid Photographers
6. `crane_jib_operators` — Crane / Jib Operators
7. `led_wall_live_screening` — LED Wall & Live Screening
8. `sound_audio_engineers` — Sound & Audio Engineers
9. `lighting_technicians` — Lighting Technicians
10. `album_printers_bookbinders` — Album Printers & Bookbinders
11. `frame_manufacturers` — Frame Manufacturers
12. `video_editors_external` — External Video Editors
13. `photo_retouchers_external` — External Photo Retouchers
14. `makeup_artists_stylists` — Makeup Artists & Stylists
15. `event_decorators_prop_providers` — Event Decorators & Prop Providers
16. `transport_vehicle_rentals` — Transport & Vehicle Rentals
17. `equipment_rental_houses` — Equipment Rental Houses

### Sample Pre-Configured Suppliers:
- **Aerial Drones:** Harshil Soni (`harshilsoni@supplier.in`) • Rate: ₹12,000/day
- **Album Craft Printers:** Dharmesh Panchal (`dharmeshpanchal@supplier.in`) • Rate: ₹18,000/album
- **Acoustic Audio Engineers:** Jayesh Dave (`jayeshdave@supplier.in`) • Rate: ₹8,500/day
- **Lumina Grand LED Walls:** Ketan Mistry (`ketanmistry@supplier.in`) • Rate: ₹25,000/day
- **Sunbeam Traditional Lens:** Ramesh Vaghela (`rameshvaghela@supplier.in`) • Rate: ₹7,000/day
- **Prism External Editors:** Bhavin Bhatt (`bhavinbhatt@supplier.in`) • Rate: ₹15,000/event

---

## 5. PRIVACY & ACCESS CONTROL ARCHITECTURE

1. **Customer Name Masking by Default:**
   - For all non-owner roles (photographers, editors, assistants, external crew), customer names are projected as `Client #001`, `Client #014`, etc.
   - Customer phone numbers, personal emails, residential addresses, and consultation notes are redacted.
   - Studio Owners can configure exceptions in `#/app/settings`.

2. **Owner-Only Financial Confidentiality:**
   - Quotation prices, tax invoice figures, payment collections, studio revenue, net profits, employee salary profiles, and supplier payouts are shielded from ordinary team members.

3. **5-Tier Precedence Engine:**
   - `Global Platform Killswitch` > `Studio-Specific Platform Override` > `Subscription Plan Entitlement` > `Studio Owner Module Visibility` > `User Role RBAC`.

4. **Team Summary WhatsApp Click-to-Chat:**
   - Pre-formatted daily crew call sheet and event brief.
   - Auto-scrubbed of personal customer details and internal finances.
   - One-click launch via official `https://wa.me/?text=...` URI.

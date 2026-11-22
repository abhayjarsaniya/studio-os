/**
 * Rate Limiting & Brute-Force Protection Service for Studio OS
 * Prevents credential-stuffing and brute-force attacks on login endpoints.
 */

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes window
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

class RateLimitService {
  private attempts: Map<string, AttemptRecord> = new Map();

  private getStorageKey(key: string): string {
    return `studio_os_ratelimit_${key.toLowerCase().trim()}`;
  }

  private loadRecord(key: string): AttemptRecord | null {
    const mem = this.attempts.get(key.toLowerCase().trim());
    if (mem) return mem;

    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(this.getStorageKey(key));
        if (item) {
          const parsed = JSON.parse(item) as AttemptRecord;
          this.attempts.set(key.toLowerCase().trim(), parsed);
          return parsed;
        }
      } catch {
        // Fallback to in-memory
      }
    }
    return null;
  }

  private saveRecord(key: string, record: AttemptRecord): void {
    this.attempts.set(key.toLowerCase().trim(), record);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(record));
      } catch {
        // Ignore storage errors
      }
    }
  }

  private clearRecord(key: string): void {
    this.attempts.delete(key.toLowerCase().trim());
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(key));
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Check if an identifier is currently rate-limited
   */
  checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number; message?: string } {
    if (!identifier) return { allowed: true };
    const cleanKey = identifier.toLowerCase().trim();
    const record = this.loadRecord(cleanKey);
    if (!record) return { allowed: true };

    const now = Date.now();

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        waitSeconds,
        message: `Too many failed login attempts for "${identifier}". Please wait ${waitSeconds} seconds before trying again.`
      };
    }

    // Check if window expired
    if (now - record.firstAttemptAt > WINDOW_MS && !record.lockedUntil) {
      this.clearRecord(cleanKey);
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(identifier: string): { isBlocked: boolean; remainingAttempts: number; waitSeconds?: number } {
    if (!identifier) return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
    const cleanKey = identifier.toLowerCase().trim();
    const now = Date.now();
    let record = this.loadRecord(cleanKey);

    if (!record || (now - record.firstAttemptAt > WINDOW_MS && (!record.lockedUntil || record.lockedUntil <= now))) {
      record = {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now
      };
    } else {
      record.count += 1;
      record.lastAttemptAt = now;
    }

    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      this.saveRecord(cleanKey, record);
      const waitSeconds = Math.ceil(LOCKOUT_MS / 1000);
      return {
        isBlocked: true,
        remainingAttempts: 0,
        waitSeconds
      };
    }

    this.saveRecord(cleanKey, record);
    return {
      isBlocked: false,
      remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.count)
    };
  }

  /**
   * Reset attempts on successful login
   */
  resetAttempts(identifier: string): void {
    if (!identifier) return;
    this.clearRecord(identifier);
  }

  /**
   * Clear all records (testing/admin only)
   */
  clearAll(): void {
    this.attempts.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('studio_os_ratelimit_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  }
}

export const rateLimitService = new RateLimitService();

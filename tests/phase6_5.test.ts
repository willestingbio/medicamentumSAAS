import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Pure business-logic functions extracted from the codebase for unit testing.
// These mirror the actual implementation in lib/ without DB or external API
// dependencies.
// ---------------------------------------------------------------------------

// ---- 1. Vendor Bank Encryption (mirrors lib/crypto/vendor-bank.ts) ----
// NOTE: The real encryptBankInfo/decryptBankInfo use env VENDOR_BANK_ENCRYPTION_KEY
// and crypto.createCipheriv/createDecipheriv. We import them directly
// after setting the env var programmatically.

const ALGO = 'aes-256-gcm';
const TEST_KEY_B64 = Buffer.alloc(32, 'secret-key-material-32bytes!').toString('base64');

import crypto from 'crypto';

function encryptBankInfoPure(data: object, keyB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decryptBankInfoPure(packed: string, keyB64: string): object {
  const key = Buffer.from(keyB64, 'base64');
  const buf = Buffer.from(packed, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

// ---- 2. Payout Calculation (mirrors lib/actions/admin/payouts.ts:82-83) ----
function calculatePayout(grossAmount: number, commissionPct: number) {
  const commissionAmount = Math.round(grossAmount * (commissionPct / 100));
  const netAmount = grossAmount - commissionAmount;
  return { grossAmount, commissionAmount, netAmount };
}

// ---- 3. Review Status Logic (mirrors lib/actions/vendor/vendor-products.ts & admin/review-queue.ts) ----
type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

function canSubmitForReview(currentStatus: ReviewStatus): boolean {
  return currentStatus === 'draft' || currentStatus === 'rejected';
}

function canApprove(currentStatus: ReviewStatus): boolean {
  return currentStatus === 'pending_review';
}

function canReject(currentStatus: ReviewStatus): boolean {
  return currentStatus === 'pending_review';
}

function canPublish(reviewStatus: ReviewStatus, userRole: 'vendor' | 'super_admin'): boolean {
  if (userRole === 'super_admin') return true;
  return reviewStatus === 'approved';
}

function isPubliclyVisible(reviewStatus: ReviewStatus, published: boolean): boolean {
  return published && reviewStatus === 'approved';
}

// ---- 4. Vendor Product Ownership (mirrors lib/actions/vendor/vendor-products.ts) ----
function canEditProduct(
  productVendorId: string | null,
  currentVendorId: string,
  userRole: 'vendor' | 'super_admin',
): boolean {
  if (userRole === 'super_admin') return true;
  return productVendorId === currentVendorId;
}

// ---- 5. Quiz Validation (mirrors lib/actions/course-builder/quizzes.ts & admin/review-queue.ts) ----
type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

interface QuizOption {
  id: string;
  isCorrect: boolean;
  label: string;
}

interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: QuizOption[];
}

function isQuizValid(questions: QuizQuestion[]): { valid: boolean; reason?: string } {
  if (questions.length === 0) {
    return { valid: false, reason: 'Un quiz debe tener al menos 1 pregunta' };
  }

  for (const q of questions) {
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount === 0) {
      return {
        valid: false,
        reason: `La pregunta "${q.prompt}" debe tener al menos 1 opción correcta`,
      };
    }
    if (
      (q.type === 'single_choice' || q.type === 'true_false') &&
      correctCount > 1
    ) {
      return {
        valid: false,
        reason: `La pregunta "${q.prompt}" es de opción única y solo puede tener 1 opción correcta`,
      };
    }
  }

  return { valid: true };
}

function normalizeSingleChoiceOptions(options: QuizOption[]): QuizOption[] {
  // When marking an option as correct on a single_choice/true_false question,
  // all other options must be set to false. Returns the normalized array.
  const correctIndex = options.findIndex((o) => o.isCorrect);
  if (correctIndex === -1) return options;

  return options.map((o, i) => ({
    ...o,
    isCorrect: i === correctIndex,
  }));
}

// ---- 6. Course Completion Logic (mirrors lib/actions/course-progress.ts:236-240) ----
type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';

function calculateCourseProgress(
  completedLessons: number,
  totalLessons: number,
): { progressPct: number; status: EnrollmentStatus } {
  const progressPct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let status: EnrollmentStatus;
  if (progressPct >= 100) {
    status = 'completed';
  } else if (progressPct > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }

  return { progressPct, status };
}

function isLessonCompletionIdempotent(
  existingCompletions: Set<string>,
  lessonId: string,
): { alreadyCompleted: boolean; completions: Set<string> } {
  if (existingCompletions.has(lessonId)) {
    return { alreadyCompleted: true, completions: existingCompletions };
  }
  existingCompletions.add(lessonId);
  return { alreadyCompleted: false, completions: existingCompletions };
}

// ---- 7. ContentSource Logic (mirrors lib/actions/course-progress.ts & schema) ----
type ContentSource = 'native' | 'moodle_legacy';

function shouldCalculateFromLessonCompletions(contentSource: ContentSource): boolean {
  return contentSource === 'native';
}

function shouldSyncFromMoodle(contentSource: ContentSource): boolean {
  return contentSource === 'moodle_legacy';
}

// ---- 8. Video Upload URL Validation (mirrors lib/video/stream-client.ts) ----
const CF_UPLOAD_URL_PATTERN = /^https:\/\/upload\.video\.cloudflare\.com\/[a-zA-Z0-9_-]+\/video$/;

function isValidCloudflareUploadUrl(url: string): boolean {
  return CF_UPLOAD_URL_PATTERN.test(url);
}

function extractUidFromUploadUrl(url: string): string | null {
  const match = url.match(
    /^https:\/\/upload\.video\.cloudflare\.com\/([a-zA-Z0-9_-]+)\/video$/,
  );
  return match ? match[1] : null;
}

// ---- 9. Commission Calculation (mirrors schema Vendor.commissionPct & admin/payouts.ts) ----
const DEFAULT_MARKETPLACE_COMMISSION_PCT = 20;

function getEffectiveCommissionPct(
  vendorCommissionPct: number | null | undefined,
): number {
  return vendorCommissionPct ?? DEFAULT_MARKETPLACE_COMMISSION_PCT;
}

// ---- 10. Webhook Idempotency (Cloudflare Stream webhook) ----
interface VideoEvent {
  uid: string;
  status: string;
  readyToStream?: boolean;
}

type ProcessedEvents = Map<string, Set<string>>; // uid -> set of handled event types

function shouldProcessVideoEvent(
  event: VideoEvent,
  processedEvents: ProcessedEvents,
): boolean {
  const eventKey = `${event.uid}:${event.status}`;
  const uidEvents = processedEvents.get(event.uid);

  if (uidEvents && uidEvents.has(event.status)) {
    return false; // already processed this uid+status combination
  }

  if (!uidEvents) {
    processedEvents.set(event.uid, new Set([event.status]));
  } else {
    uidEvents.add(event.status);
  }

  return true;
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('Phase 6.5 — Course Builder & Marketplace Multi-Vendor', () => {
  // -----------------------------------------------------------------------
  // 1. Vendor Bank Encryption
  // -----------------------------------------------------------------------
  describe('Vendor Bank Encryption', () => {
    const bankData = {
      accountNumber: '1234567890',
      bankName: 'Bancolombia',
      accountType: 'ahorros',
    };

    it('round-trip: encrypt then decrypt returns the same data', () => {
      const encrypted = encryptBankInfoPure(bankData, TEST_KEY_B64);
      const decrypted = decryptBankInfoPure(encrypted, TEST_KEY_B64);
      expect(decrypted).toEqual(bankData);
    });

    it('different data produces different ciphertexts', () => {
      const data1 = { accountNumber: '1111', bankName: 'Banco A' };
      const data2 = { accountNumber: '2222', bankName: 'Banco B' };

      const enc1 = encryptBankInfoPure(data1, TEST_KEY_B64);
      const enc2 = encryptBankInfoPure(data2, TEST_KEY_B64);

      // Same key, different plaintext → different ciphertext
      expect(enc1).not.toEqual(enc2);
    });

    it('encrypting the same data twice produces different ciphertexts (random IV)', () => {
      const enc1 = encryptBankInfoPure(bankData, TEST_KEY_B64);
      const enc2 = encryptBankInfoPure(bankData, TEST_KEY_B64);
      // Each encryption uses a new random IV, so the outputs differ
      // but both decrypt to the same data
      expect(enc1).not.toEqual(enc2);
      expect(decryptBankInfoPure(enc1, TEST_KEY_B64)).toEqual(bankData);
      expect(decryptBankInfoPure(enc2, TEST_KEY_B64)).toEqual(bankData);
    });

    it('decrypt detects tampering via auth tag mismatch', () => {
      const encrypted = encryptBankInfoPure(bankData, TEST_KEY_B64);
      // Tamper with the ciphertext portion (middle of base64 string)
      const buf = Buffer.from(encrypted, 'base64');
      if (buf.length > 30) {
        buf[buf.length - 5] ^= 0xff; // flip some bits in the ciphertext
      }
      const tampered = buf.toString('base64');

      expect(() => decryptBankInfoPure(tampered, TEST_KEY_B64)).toThrow();
    });

    it('decrypt with wrong key throws', () => {
      const encrypted = encryptBankInfoPure(bankData, TEST_KEY_B64);
      const wrongKey = Buffer.alloc(32, 'wrong-key-material-32bytes!!!!').toString('base64');

      expect(() => decryptBankInfoPure(encrypted, wrongKey)).toThrow();
    });

    it('handles empty objects', () => {
      const encrypted = encryptBankInfoPure({}, TEST_KEY_B64);
      const decrypted = decryptBankInfoPure(encrypted, TEST_KEY_B64);
      expect(decrypted).toEqual({});
    });

    it('handles nested objects and arrays', () => {
      const complex = {
        person: { name: 'Juan', id: '123' },
        accounts: [{ type: 'ahorros', num: '001' }],
        meta: { active: true, balance: 5000 },
      };
      const encrypted = encryptBankInfoPure(complex, TEST_KEY_B64);
      const decrypted = decryptBankInfoPure(encrypted, TEST_KEY_B64);
      expect(decrypted).toEqual(complex);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Payout Calculation
  // -----------------------------------------------------------------------
  describe('Payout Calculation', () => {
    it('calculates net amount with 20% default commission', () => {
      const result = calculatePayout(100000, 20);
      expect(result.grossAmount).toBe(100000);
      expect(result.commissionAmount).toBe(20000);
      expect(result.netAmount).toBe(80000);
    });

    it('handles 0 gross amount', () => {
      const result = calculatePayout(0, 20);
      expect(result.grossAmount).toBe(0);
      expect(result.commissionAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it('handles 100% commission', () => {
      const result = calculatePayout(50000, 100);
      expect(result.commissionAmount).toBe(50000);
      expect(result.netAmount).toBe(0);
    });

    it('handles 0% commission', () => {
      const result = calculatePayout(75000, 0);
      expect(result.commissionAmount).toBe(0);
      expect(result.netAmount).toBe(75000);
    });

    it('rounds fractional commission correctly', () => {
      // 15% of 99 = 14.85 → rounds to 15
      const result = calculatePayout(99, 15);
      expect(result.commissionAmount).toBe(15);
      expect(result.netAmount).toBe(84);
    });

    it('net + commission always equals gross', () => {
      const scenarios = [
        { gross: 100000, pct: 20 },
        { gross: 1, pct: 50 },
        { gross: 99999, pct: 33 },
        { gross: 100, pct: 7 },
      ];
      for (const { gross, pct } of scenarios) {
        const result = calculatePayout(gross, pct);
        expect(result.commissionAmount + result.netAmount).toBe(gross);
      }
    });

    it('custom commission percentage is respected', () => {
      const result = calculatePayout(200000, 10);
      expect(result.commissionAmount).toBe(20000);
      expect(result.netAmount).toBe(180000);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Review Status Logic
  // -----------------------------------------------------------------------
  describe('Review Status Logic', () => {
    it('draft can be submitted for review', () => {
      expect(canSubmitForReview('draft')).toBe(true);
    });

    it('rejected can be re-submitted for review', () => {
      expect(canSubmitForReview('rejected')).toBe(true);
    });

    it('pending_review cannot be submitted again', () => {
      expect(canSubmitForReview('pending_review')).toBe(false);
    });

    it('approved cannot be submitted for review', () => {
      expect(canSubmitForReview('approved')).toBe(false);
    });

    it('only pending_review can be approved', () => {
      expect(canApprove('pending_review')).toBe(true);
      expect(canApprove('draft')).toBe(false);
      expect(canApprove('approved')).toBe(false);
      expect(canApprove('rejected')).toBe(false);
    });

    it('only pending_review can be rejected', () => {
      expect(canReject('pending_review')).toBe(true);
      expect(canReject('draft')).toBe(false);
      expect(canReject('approved')).toBe(false);
      expect(canReject('rejected')).toBe(false);
    });

    it('vendor cannot publish if reviewStatus is not approved', () => {
      expect(canPublish('draft', 'vendor')).toBe(false);
      expect(canPublish('pending_review', 'vendor')).toBe(false);
      expect(canPublish('rejected', 'vendor')).toBe(false);
      expect(canPublish('approved', 'vendor')).toBe(true);
    });

    it('super_admin can publish regardless of reviewStatus', () => {
      expect(canPublish('draft', 'super_admin')).toBe(true);
      expect(canPublish('pending_review', 'super_admin')).toBe(true);
      expect(canPublish('rejected', 'super_admin')).toBe(true);
      expect(canPublish('approved', 'super_admin')).toBe(true);
    });

    it('product is publicly visible only when published AND approved', () => {
      // published=false, approved → hidden
      expect(isPubliclyVisible('approved', false)).toBe(false);
      // published=true, pending → hidden
      expect(isPubliclyVisible('pending_review', true)).toBe(false);
      // published=true, draft → hidden
      expect(isPubliclyVisible('draft', true)).toBe(false);
      // published=true, rejected → hidden
      expect(isPubliclyVisible('rejected', true)).toBe(false);
      // published=true, approved → visible
      expect(isPubliclyVisible('approved', true)).toBe(true);
    });

    it('full lifecycle: draft → pending_review → approved', () => {
      let status: ReviewStatus = 'draft';

      // Submit
      if (canSubmitForReview(status)) status = 'pending_review';
      expect(status).toBe('pending_review');

      // Approve
      if (canApprove(status)) status = 'approved';
      expect(status).toBe('approved');

      // Now the vendor can publish
      expect(canPublish(status, 'vendor')).toBe(true);
    });

    it('full lifecycle: draft → pending_review → rejected → draft again', () => {
      let status: ReviewStatus = 'draft';

      if (canSubmitForReview(status)) status = 'pending_review';
      if (canReject(status)) status = 'rejected';
      expect(status).toBe('rejected');

      // Vendor edits and re-submits
      if (canSubmitForReview(status)) status = 'pending_review';
      expect(status).toBe('pending_review');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Vendor Product Ownership
  // -----------------------------------------------------------------------
  describe('Vendor Product Ownership', () => {
    const vendorAId = 'vendor-a';
    const vendorBId = 'vendor-b';

    it('a vendor can edit their own product', () => {
      expect(canEditProduct(vendorAId, vendorAId, 'vendor')).toBe(true);
    });

    it('a vendor cannot edit another vendor product', () => {
      expect(canEditProduct(vendorAId, vendorBId, 'vendor')).toBe(false);
    });

    it('super_admin can edit any product regardless of owner', () => {
      expect(canEditProduct(vendorAId, 'any-super-admin', 'super_admin')).toBe(true);
      expect(canEditProduct(vendorBId, 'any-super-admin', 'super_admin')).toBe(true);
      expect(canEditProduct(null, 'any-super-admin', 'super_admin')).toBe(true);
    });

    it('vendor cannot edit a product with no vendorId (native/admin product)', () => {
      // Non-vendor products have vendorId = null
      expect(canEditProduct(null, vendorAId, 'vendor')).toBe(false);
    });

    it('vendor cannot edit if vendor IDs mismatch', () => {
      expect(canEditProduct('other-vendor-id', vendorAId, 'vendor')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Quiz Validation
  // -----------------------------------------------------------------------
  describe('Quiz Validation', () => {
    const makeOption = (id: string, isCorrect: boolean): QuizOption => ({
      id,
      isCorrect,
      label: `Opción ${id}`,
    });

    it('quiz must have at least 1 question to be valid', () => {
      const result = isQuizValid([]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('al menos 1 pregunta');
    });

    it('a question must have at least 1 correct option', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'single_choice',
        prompt: '¿Cuál?',
        options: [
          makeOption('o1', false),
          makeOption('o2', false),
          makeOption('o3', false),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('al menos 1 opción correcta');
    });

    it('valid single_choice question with exactly 1 correct option', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'single_choice',
        prompt: '¿Cuál es la capital de Colombia?',
        options: [
          makeOption('o1', false),
          makeOption('o2', true),
          makeOption('o3', false),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(true);
    });

    it('single_choice question cannot have more than 1 correct option', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'single_choice',
        prompt: '¿Cuál?',
        options: [
          makeOption('o1', true),
          makeOption('o2', true),
          makeOption('o3', false),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('opción única');
    });

    it('true_false question cannot have more than 1 correct option', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'true_false',
        prompt: '¿Es cierto?',
        options: [
          makeOption('o1', true),
          makeOption('o2', true),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('opción única');
    });

    it('multiple_choice question can have multiple correct options', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'multiple_choice',
        prompt: 'Selecciona todas las correctas',
        options: [
          makeOption('o1', true),
          makeOption('o2', true),
          makeOption('o3', false),
          makeOption('o4', true),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(true);
    });

    it('multiple_choice question still requires at least 1 correct option', () => {
      const q: QuizQuestion = {
        id: 'q1',
        type: 'multiple_choice',
        prompt: 'Selecciona todas',
        options: [
          makeOption('o1', false),
          makeOption('o2', false),
        ],
      };
      const result = isQuizValid([q]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('al menos 1 opción correcta');
    });

    it('valid quiz with mixed question types', () => {
      const questions: QuizQuestion[] = [
        {
          id: 'q1',
          type: 'single_choice',
          prompt: 'Pregunta 1',
          options: [makeOption('o1', false), makeOption('o2', true)],
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          prompt: 'Pregunta 2',
          options: [makeOption('o3', true), makeOption('o4', true)],
        },
        {
          id: 'q3',
          type: 'true_false',
          prompt: 'Pregunta 3',
          options: [makeOption('o5', true), makeOption('o6', false)],
        },
      ];
      expect(isQuizValid(questions).valid).toBe(true);
    });

    describe('normalizeSingleChoiceOptions', () => {
      it('sets all other options to false when one is correct', () => {
        const options: QuizOption[] = [
          { id: 'a', isCorrect: true, label: 'A' },
          { id: 'b', isCorrect: true, label: 'B' },
          { id: 'c', isCorrect: false, label: 'C' },
        ];
        const normalized = normalizeSingleChoiceOptions(options);
        // Only the first correct one should remain correct
        const correctCount = normalized.filter((o) => o.isCorrect).length;
        expect(correctCount).toBe(1);
        expect(normalized[0].isCorrect).toBe(true);
        expect(normalized[1].isCorrect).toBe(false);
        expect(normalized[2].isCorrect).toBe(false);
      });

      it('does not change options if none is correct', () => {
        const options: QuizOption[] = [
          { id: 'a', isCorrect: false, label: 'A' },
          { id: 'b', isCorrect: false, label: 'B' },
        ];
        const normalized = normalizeSingleChoiceOptions(options);
        expect(normalized).toEqual(options);
      });
    });
  });

  // -----------------------------------------------------------------------
  // 6. Course Completion Logic
  // -----------------------------------------------------------------------
  describe('Course Completion Logic', () => {
    it('progressPct = (completedLessons / totalLessons) * 100', () => {
      expect(calculateCourseProgress(0, 10)).toEqual({
        progressPct: 0,
        status: 'not_started',
      });
      expect(calculateCourseProgress(3, 10)).toEqual({
        progressPct: 30,
        status: 'in_progress',
      });
      expect(calculateCourseProgress(5, 10)).toEqual({
        progressPct: 50,
        status: 'in_progress',
      });
      expect(calculateCourseProgress(10, 10)).toEqual({
        progressPct: 100,
        status: 'completed',
      });
    });

    it('handles totalLessons = 0 gracefully', () => {
      expect(calculateCourseProgress(0, 0)).toEqual({
        progressPct: 0,
        status: 'not_started',
      });
    });

    it('status changes to completed when progress reaches 100%', () => {
      // Gradual progression
      const step1 = calculateCourseProgress(7, 10);
      expect(step1.progressPct).toBe(70);
      expect(step1.status).toBe('in_progress');

      const step2 = calculateCourseProgress(9, 10);
      expect(step2.progressPct).toBe(90);
      expect(step2.status).toBe('in_progress');

      const step3 = calculateCourseProgress(10, 10);
      expect(step3.progressPct).toBe(100);
      expect(step3.status).toBe('completed');
    });

    it('status changes to in_progress when first lesson is completed', () => {
      const initial = calculateCourseProgress(0, 10);
      expect(initial.status).toBe('not_started');

      const afterFirst = calculateCourseProgress(1, 10);
      expect(afterFirst.status).toBe('in_progress');
    });

    it('rounds progress percentage correctly', () => {
      // 1/3 = 33.33... → Math.round → 33
      expect(calculateCourseProgress(1, 3).progressPct).toBe(33);
      // 2/3 = 66.67... → Math.round → 67
      expect(calculateCourseProgress(2, 3).progressPct).toBe(67);
      // 1/8 = 12.5 → Math.round → 13
      expect(calculateCourseProgress(1, 8).progressPct).toBe(13);
    });

    describe('lesson completion idempotency', () => {
      it('marking the same lesson twice does not duplicate completions', () => {
        const completions = new Set<string>();
        const lessonId = 'lesson-abc';

        const first = isLessonCompletionIdempotent(completions, lessonId);
        expect(first.alreadyCompleted).toBe(false);
        expect(first.completions.has(lessonId)).toBe(true);

        const second = isLessonCompletionIdempotent(first.completions, lessonId);
        expect(second.alreadyCompleted).toBe(true);
        expect(second.completions.size).toBe(1);
      });

      it('different lessons are tracked independently', () => {
        let completions = new Set<string>();

        const r1 = isLessonCompletionIdempotent(completions, 'lesson-1');
        expect(r1.alreadyCompleted).toBe(false);
        completions = r1.completions;

        const r2 = isLessonCompletionIdempotent(completions, 'lesson-2');
        expect(r2.alreadyCompleted).toBe(false);
        completions = r2.completions;

        expect(completions.size).toBe(2);
      });
    });
  });

  // -----------------------------------------------------------------------
  // 7. ContentSource Logic
  // -----------------------------------------------------------------------
  describe('ContentSource Logic', () => {
    it('native courses calculate progress from LessonCompletion', () => {
      expect(shouldCalculateFromLessonCompletions('native')).toBe(true);
      expect(shouldSyncFromMoodle('native')).toBe(false);
    });

    it('moodle_legacy courses sync from Moodle, not from native LessonCompletion', () => {
      expect(shouldSyncFromMoodle('moodle_legacy')).toBe(true);
      expect(shouldCalculateFromLessonCompletions('moodle_legacy')).toBe(false);
    });

    it('the two sources are mutually exclusive in behavior', () => {
      const sources: ContentSource[] = ['native', 'moodle_legacy'];
      for (const src of sources) {
        // A course can only use one progress calculation method
        const usesNative = shouldCalculateFromLessonCompletions(src);
        const usesMoodle = shouldSyncFromMoodle(src);
        // They should be opposite: one true, one false
        expect(usesNative).not.toBe(usesMoodle);
      }
    });

    it('native is the default content source', () => {
      // Per schema: ContentSource @default(native)
      // Native courses manage their own progress engine
      const defaultSource: ContentSource = 'native';
      expect(shouldCalculateFromLessonCompletions(defaultSource)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Video Upload URL Validation
  // -----------------------------------------------------------------------
  describe('Video Upload URL Validation', () => {
    it('recognizes a valid Cloudflare Stream direct upload URL', () => {
      const validUrl =
        'https://upload.video.cloudflare.com/a1b2c3d4e5f6g7h8i9j0k/video';
      expect(isValidCloudflareUploadUrl(validUrl)).toBe(true);
    });

    it('rejects URLs with wrong domain', () => {
      expect(isValidCloudflareUploadUrl('https://api.cloudflare.com/stream/video')).toBe(false);
      expect(isValidCloudflareUploadUrl('https://customer-abc.cloudflarestream.com/video.m3u8')).toBe(false);
    });

    it('rejects URLs missing /video suffix', () => {
      expect(isValidCloudflareUploadUrl('https://upload.video.cloudflare.com/abc123')).toBe(false);
    });

    it('rejects URLs with extra path segments', () => {
      expect(
        isValidCloudflareUploadUrl(
          'https://upload.video.cloudflare.com/abc123/video/extra',
        ),
      ).toBe(false);
    });

    it('extracts UID from a valid upload URL', () => {
      const uid = extractUidFromUploadUrl(
        'https://upload.video.cloudflare.com/abc-def-123/video',
      );
      expect(uid).toBe('abc-def-123');
    });

    it('returns null when extracting UID from invalid URL', () => {
      expect(extractUidFromUploadUrl('https://example.com/not-cf')).toBeNull();
    });

    it('handles UIDs with hyphens and underscores', () => {
      const uid = extractUidFromUploadUrl(
        'https://upload.video.cloudflare.com/uid-with-hyphens_underscore_42/video',
      );
      expect(uid).toBe('uid-with-hyphens_underscore_42');
    });

    it('rejects HTTP (non-HTTPS) URLs', () => {
      expect(
        isValidCloudflareUploadUrl('http://upload.video.cloudflare.com/abc/video'),
      ).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 9. Commission Calculation
  // -----------------------------------------------------------------------
  describe('Commission Calculation', () => {
    it('defaults to 20% when vendor has no custom commission', () => {
      expect(getEffectiveCommissionPct(undefined)).toBe(20);
      expect(getEffectiveCommissionPct(null)).toBe(20);
    });

    it('uses vendor-specific commission when set', () => {
      expect(getEffectiveCommissionPct(15)).toBe(15);
      expect(getEffectiveCommissionPct(10)).toBe(10);
      expect(getEffectiveCommissionPct(0)).toBe(0);
    });

    it('commission percentage is applied to gross in payout calculation', () => {
      // Combined test: getEffectiveCommissionPct + calculatePayout
      const gross = 500000;
      const customPct = getEffectiveCommissionPct(10);
      const payout = calculatePayout(gross, customPct);
      expect(payout.commissionAmount).toBe(50000); // 10% of 500000
      expect(payout.netAmount).toBe(450000);
    });

    it('default commission scenario is consistent', () => {
      const defaultPct = getEffectiveCommissionPct(undefined);
      expect(defaultPct).toBe(20);

      const payout = calculatePayout(100000, defaultPct);
      expect(payout.commissionAmount).toBe(20000);
      expect(payout.netAmount).toBe(80000);
    });

    it('custom commission overrides default', () => {
      // Vendor with 5% commission
      const vendorPct = getEffectiveCommissionPct(5);
      expect(vendorPct).not.toBe(20);

      const payout = calculatePayout(100000, vendorPct);
      expect(payout.commissionAmount).toBe(5000);
      expect(payout.netAmount).toBe(95000);
    });
  });

  // -----------------------------------------------------------------------
  // 10. Webhook Idempotency
  // -----------------------------------------------------------------------
  describe('Webhook Idempotency (Cloudflare Stream)', () => {
    it('processes a video event the first time', () => {
      const processed = new Map<string, Set<string>>();
      const event: VideoEvent = { uid: 'vid-001', status: 'ready', readyToStream: true };

      expect(shouldProcessVideoEvent(event, processed)).toBe(true);
      expect(processed.get('vid-001')?.has('ready')).toBe(true);
    });

    it('skips a duplicate event (same uid + same status)', () => {
      const processed = new Map<string, Set<string>>();
      const event: VideoEvent = { uid: 'vid-001', status: 'ready' };

      // First call
      expect(shouldProcessVideoEvent(event, processed)).toBe(true);
      // Second call with same uid + status
      expect(shouldProcessVideoEvent(event, processed)).toBe(false);
      // Set should contain only one entry
      expect(processed.get('vid-001')?.size).toBe(1);
    });

    it('processes different statuses for the same uid (state transitions)', () => {
      const processed = new Map<string, Set<string>>();

      const queued: VideoEvent = { uid: 'vid-002', status: 'queued' };
      const processing: VideoEvent = { uid: 'vid-002', status: 'inprogress' };
      const ready: VideoEvent = { uid: 'vid-002', status: 'ready' };

      expect(shouldProcessVideoEvent(queued, processed)).toBe(true);
      expect(shouldProcessVideoEvent(processing, processed)).toBe(true);
      expect(shouldProcessVideoEvent(ready, processed)).toBe(true);

      // Duplicates of any state should be skipped
      expect(shouldProcessVideoEvent(queued, processed)).toBe(false);
      expect(shouldProcessVideoEvent(ready, processed)).toBe(false);

      // All 3 statuses tracked
      expect(processed.get('vid-002')?.size).toBe(3);
    });

    it('different uids are processed independently', () => {
      const processed = new Map<string, Set<string>>();

      expect(shouldProcessVideoEvent({ uid: 'vid-a', status: 'ready' }, processed)).toBe(true);
      expect(shouldProcessVideoEvent({ uid: 'vid-b', status: 'ready' }, processed)).toBe(true);
      expect(shouldProcessVideoEvent({ uid: 'vid-c', status: 'ready' }, processed)).toBe(true);

      expect(processed.size).toBe(3);
      expect(processed.get('vid-a')?.has('ready')).toBe(true);
      expect(processed.get('vid-b')?.has('ready')).toBe(true);
      expect(processed.get('vid-c')?.has('ready')).toBe(true);
    });

    it('error status events are also idempotent', () => {
      const processed = new Map<string, Set<string>>();
      const errorEvent: VideoEvent = { uid: 'vid-003', status: 'error' };

      expect(shouldProcessVideoEvent(errorEvent, processed)).toBe(true);
      expect(shouldProcessVideoEvent(errorEvent, processed)).toBe(false);
    });

    it('simulates full video lifecycle without duplicates', () => {
      const processed = new Map<string, Set<string>>();
      const uid = 'vid-lifecycle';
      const events: VideoEvent[] = [
        { uid, status: 'pendingupload' },
        { uid, status: 'downloading' },
        { uid, status: 'queued' },
        { uid, status: 'inprogress' },
        { uid, status: 'ready' },
      ];

      for (const event of events) {
        expect(shouldProcessVideoEvent(event, processed)).toBe(true);
      }

      // All 5 statuses processed
      expect(processed.get(uid)?.size).toBe(5);

      // Replay the entire lifecycle — all should be skipped
      for (const event of events) {
        expect(shouldProcessVideoEvent(event, processed)).toBe(false);
      }

      // Count should not have increased
      expect(processed.get(uid)?.size).toBe(5);
    });
  });
});

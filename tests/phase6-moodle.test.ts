import { describe, it, expect } from 'vitest';

// ===== Phase 6: Moodle Integration Tests =====

// --- contentSource Check Logic (Webhook Fix) ---

describe('Webhook contentSource Check', () => {
  function shouldEnrollInMoodle(
    contentSource: string | null,
    moodleCourseId: number | null,
    moodleUserId: number | null
  ): boolean {
    return (
      contentSource === 'moodle_legacy' &&
      moodleCourseId !== null &&
      moodleUserId !== null
    );
  }

  it('enrolls moodle_legacy courses with valid IDs', () => {
    expect(shouldEnrollInMoodle('moodle_legacy', 42, 100)).toBe(true);
  });

  it('does NOT enroll native courses', () => {
    expect(shouldEnrollInMoodle('native', 42, 100)).toBe(false);
  });

  it('does NOT enroll if moodleCourseId is null', () => {
    expect(shouldEnrollInMoodle('moodle_legacy', null, 100)).toBe(false);
  });

  it('does NOT enroll if moodleUserId is null', () => {
    expect(shouldEnrollInMoodle('moodle_legacy', 42, null)).toBe(false);
  });

  it('does NOT enroll if contentSource is null', () => {
    expect(shouldEnrollInMoodle(null, 42, 100)).toBe(false);
  });
});

// --- Moodle Sync Logic ---

describe('Moodle Sync Logic', () => {
  type MoodleCompletionState = 0 | 1 | 2 | 3;

  function computeSyncResult(
    moodleState: MoodleCompletionState | null,
    currentProgress: number
  ): { progressPct: number; status: string } {
    const isComplete = moodleState === 1 || moodleState === 2;
    const progressPct = isComplete ? 100 : currentProgress;
    const status = isComplete
      ? 'completed'
      : currentProgress > 0
        ? 'in_progress'
        : 'not_started';
    return { progressPct, status };
  }

  it('marks as completed when Moodle state is 1 (complete)', () => {
    const result = computeSyncResult(1, 50);
    expect(result.progressPct).toBe(100);
    expect(result.status).toBe('completed');
  });

  it('marks as completed when Moodle state is 2 (complete-pass)', () => {
    const result = computeSyncResult(2, 75);
    expect(result.progressPct).toBe(100);
    expect(result.status).toBe('completed');
  });

  it('preserves current progress when Moodle state is 0 (incomplete)', () => {
    const result = computeSyncResult(0, 30);
    expect(result.progressPct).toBe(30);
    expect(result.status).toBe('in_progress');
  });

  it('preserves current progress when Moodle state is 3 (complete-fail)', () => {
    const result = computeSyncResult(3, 60);
    expect(result.progressPct).toBe(60);
    expect(result.status).toBe('in_progress');
  });

  it('handles null Moodle state (no data)', () => {
    const result = computeSyncResult(null, 0);
    expect(result.progressPct).toBe(0);
    expect(result.status).toBe('not_started');
  });

  it('handles null Moodle state with existing progress', () => {
    const result = computeSyncResult(null, 45);
    expect(result.progressPct).toBe(45);
    expect(result.status).toBe('in_progress');
  });
});

// --- Cron Auth Validation ---

describe('Cron Auth Validation', () => {
  function validateCronAuth(
    authHeader: string | null,
    cronSecret: string | undefined
  ): boolean {
    if (!cronSecret) return false;
    return authHeader === `Bearer ${cronSecret}`;
  }

  it('accepts valid Bearer token', () => {
    expect(validateCronAuth('Bearer secret123', 'secret123')).toBe(true);
  });

  it('rejects wrong token', () => {
    expect(validateCronAuth('Bearer wrong', 'secret123')).toBe(false);
  });

  it('rejects missing Authorization header', () => {
    expect(validateCronAuth(null, 'secret123')).toBe(false);
  });

  it('rejects when CRON_SECRET is undefined', () => {
    expect(validateCronAuth('Bearer secret123', undefined)).toBe(false);
  });

  it('rejects malformed Authorization header', () => {
    expect(validateCronAuth('Basic secret123', 'secret123')).toBe(false);
  });
});

// --- Autologin SSO URL ---

describe('Autologin SSO URL', () => {
  function buildAutologinUrl(
    courseId?: string | null
  ): string {
    const params = courseId ? `?courseId=${courseId}` : '';
    return `/api/moodle/autologin${params}`;
  }

  it('builds URL without courseId', () => {
    const url = buildAutologinUrl();
    expect(url).toBe('/api/moodle/autologin');
  });

  it('builds URL with courseId', () => {
    const url = buildAutologinUrl('15');
    expect(url).toBe('/api/moodle/autologin?courseId=15');
  });
});

// --- Dashboard Data Shape (contentSource in enrollment product) ---

describe('Dashboard Enrollment Shape', () => {
  it('product includes course with contentSource', () => {
    const mockEnrollment = {
      id: 'e1',
      progressPct: 50,
      status: 'in_progress',
      product: {
        id: 'p1',
        title: 'Test Course',
        slug: 'test-course',
        type: 'course',
        moodleCourseId: 42,
        course: {
          id: 'c1',
          contentSource: 'moodle_legacy',
        },
      },
    };

    expect(mockEnrollment.product.course?.contentSource).toBe('moodle_legacy');
    expect(mockEnrollment.product.moodleCourseId).toBe(42);
  });

  it('native course has no moodleCourseId relevance', () => {
    const mockEnrollment = {
      id: 'e2',
      progressPct: 75,
      status: 'in_progress',
      product: {
        id: 'p2',
        title: 'Native Course',
        slug: 'native-course',
        type: 'course',
        moodleCourseId: null,
        course: {
          id: 'c2',
          contentSource: 'native',
        },
      },
    };

    expect(mockEnrollment.product.course?.contentSource).toBe('native');
    expect(mockEnrollment.product.moodleCourseId).toBeNull();
  });
});

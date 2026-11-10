export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'ALREADY_PAID'
  | 'NOT_PAID'
  | 'INSUFFICIENT_FUNDS'
  | 'NEGATIVE_BALANCE'
  | 'OVERLAP'
  | 'PERIOD_REQUIRED'
  | 'INVALID_BACKUP'
  | 'UNKNOWN';

/** An expected, user-facing failure. `message` is always Arabic and safe to show. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Codes that are not real failures, just "nothing to do" (e.g. double tap). */
export const INFO_ERROR_CODES: ReadonlySet<ErrorCode> = new Set(['ALREADY_PAID', 'NOT_PAID']);

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.name === 'ConstraintError') {
    return 'تعذر الحفظ لأن هذه البيانات مسجلة من قبل.';
  }
  return 'حدث خطأ غير متوقع. حاول مرة أخرى، وإذا تكرر الأمر صدّر نسخة احتياطية.';
}

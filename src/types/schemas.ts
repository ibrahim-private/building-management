import { z } from 'zod';

/**
 * Single source of truth for entity shapes.
 * TypeScript types are inferred from these schemas, and the same schemas
 * validate backup files on import.
 *
 * Money is ALWAYS an integer in the smallest unit (piastres: 1 EGP = 100).
 */

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح');
const idSchema = z.string().min(1);
const timestampSchema = z.string().min(1);
const minorAmount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const unitTypeSchema = z.enum(['facility', 'apartment']);
export const paymentStatusSchema = z.enum(['paid', 'unpaid']);
export const periodStatusSchema = z.enum(['active', 'closed']);
export const transactionTypeSchema = z.enum(['opening', 'collection', 'expense', 'manual_in', 'manual_out']);

export const unitSchema = z.object({
  id: idSchema,
  type: unitTypeSchema,
  number: z.string().min(1),
  name: z.string(),
  notes: z.string(),
  status: z.enum(['active', 'archived']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const financialPeriodSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  status: periodStatusSchema,
  /** Default contribution used for units added after the period was created. */
  defaultAmount: minorAmount,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const obligationSchema = z.object({
  id: idSchema,
  unitId: idSchema,
  periodId: idSchema,
  amount: minorAmount,
  status: paymentStatusSchema,
  paidAt: isoDateSchema.optional(),
  transactionId: idSchema.optional(),
  /** Period-specific note (belongs to this unit in this period only). */
  periodNote: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const expenseSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  amount: minorAmount,
  notes: z.string(),
  date: isoDateSchema,
  periodId: idSchema.nullable(),
  status: paymentStatusSchema,
  transactionId: idSchema.optional(),
  archived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const transactionSchema = z.object({
  id: idSchema,
  type: transactionTypeSchema,
  /** Always positive. Direction is derived from `type`. */
  amount: minorAmount,
  date: isoDateSchema,
  description: z.string(),
  unitId: idSchema.optional(),
  expenseId: idSchema.optional(),
  obligationId: idSchema.optional(),
  periodId: idSchema.nullable().optional(),
  createdAt: timestampSchema,
});

export const appSettingsSchema = z.object({
  setupCompleted: z.boolean(),
  theme: z.enum(['light', 'dark']),
  primaryColor: z.enum(['emerald', 'teal', 'blue', 'violet']),
  defaultDurationDays: z.number().int().min(1).max(366),
  autoCreatePeriods: z.boolean(),
  pendingReviewPeriodId: idSchema.nullable(),
});

export const dataSnapshotSchema = z.object({
  units: z.array(unitSchema),
  periods: z.array(financialPeriodSchema),
  obligations: z.array(obligationSchema),
  expenses: z.array(expenseSchema),
  transactions: z.array(transactionSchema),
  settings: appSettingsSchema,
});

export type UnitType = z.infer<typeof unitTypeSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PeriodStatus = z.infer<typeof periodStatusSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type FinancialPeriod = z.infer<typeof financialPeriodSchema>;
export type Obligation = z.infer<typeof obligationSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type DataSnapshot = z.infer<typeof dataSnapshotSchema>;

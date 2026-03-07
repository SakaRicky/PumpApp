/** Mirrored from Prisma schema for use in API and web without Prisma dependency. */

export const UserType = {
  SYSTEM_USER: "SYSTEM_USER",
} as const;

export type UserType = (typeof UserType)[keyof typeof UserType];

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
  SALE: "SALE",
  PUMPIST: "PUMPIST",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ShiftStatus = {
  PLANNED: "PLANNED",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  RECONCILED: "RECONCILED",
} as const;

export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

export const ShopSalesSource = {
  SHIFT_SUMMARY_ENTRY: "SHIFT_SUMMARY_ENTRY",
  TRANSACTIONAL_SYSTEM_TOTAL: "TRANSACTIONAL_SYSTEM_TOTAL",
  MANUAL: "MANUAL",
} as const;

export type ShopSalesSource = (typeof ShopSalesSource)[keyof typeof ShopSalesSource];

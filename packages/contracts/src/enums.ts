export const JobStatus = {
  SCHEDULED: 'SCHEDULED',
  EN_ROUTE: 'EN_ROUTE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  VERIFIED: 'VERIFIED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobType = {
  INSPECTION: 'INSPECTION',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
  TURNOVER: 'TURNOVER',
  OTHER: 'OTHER',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const PropertyKind = {
  RESIDENTIAL: 'RESIDENTIAL',
  HOSPITALITY: 'HOSPITALITY',
  COMMERCIAL: 'COMMERCIAL',
} as const;
export type PropertyKind = (typeof PropertyKind)[keyof typeof PropertyKind];

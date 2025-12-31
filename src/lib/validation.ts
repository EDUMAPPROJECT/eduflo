import { z } from 'zod';

/**
 * Validation schemas for user input
 * These provide server-side equivalent validation on the client
 * (actual server-side validation happens via RLS and database constraints)
 */

// Common field validators
const stringField = (maxLength: number) => 
  z.string().max(maxLength, { message: `최대 ${maxLength}자까지 입력 가능합니다` });

const requiredStringField = (maxLength: number) => 
  z.string()
    .min(1, { message: '필수 입력 항목입니다' })
    .max(maxLength, { message: `최대 ${maxLength}자까지 입력 가능합니다` });

// Consultation form validation
export const consultationSchema = z.object({
  student_name: requiredStringField(100),
  student_grade: stringField(50).optional().nullable(),
  message: stringField(1000).optional().nullable(),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

// Seminar application validation
export const seminarApplicationSchema = z.object({
  student_name: requiredStringField(100),
  student_grade: stringField(50).optional().nullable(),
  message: stringField(500).optional().nullable(),
  attendee_count: z.number()
    .min(1, { message: '최소 1명 이상이어야 합니다' })
    .max(10, { message: '최대 10명까지 가능합니다' }),
});

export type SeminarApplicationInput = z.infer<typeof seminarApplicationSchema>;

// Academy profile validation
export const academyProfileSchema = z.object({
  name: requiredStringField(200),
  description: stringField(2000).optional().nullable(),
  profile_image: z.string().url().optional().nullable().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(20, { message: '최대 20개의 태그만 추가할 수 있습니다' }),
});

export type AcademyProfileInput = z.infer<typeof academyProfileSchema>;

// Teacher validation
export const teacherSchema = z.object({
  name: requiredStringField(100),
  subject: stringField(100).optional().nullable(),
  bio: stringField(1000).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type TeacherInput = z.infer<typeof teacherSchema>;

// Class validation
export const classSchema = z.object({
  name: requiredStringField(200),
  target_grade: stringField(50).optional().nullable(),
  schedule: stringField(200).optional().nullable(),
  fee: z.number()
    .min(0, { message: '수강료는 0 이상이어야 합니다' })
    .max(100000000, { message: '수강료가 너무 큽니다' })
    .optional()
    .nullable(),
  description: stringField(2000).optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
});

export type ClassInput = z.infer<typeof classSchema>;

// Post validation
export const postSchema = z.object({
  title: requiredStringField(200),
  content: stringField(5000).optional().nullable(),
  category: z.enum(['news', 'notice', 'event', 'review']),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type PostInput = z.infer<typeof postSchema>;

// Seminar validation
export const seminarSchema = z.object({
  title: requiredStringField(200),
  description: stringField(2000).optional().nullable(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '유효한 날짜를 입력하세요' }),
  location: stringField(200).optional().nullable(),
  capacity: z.number()
    .min(1, { message: '최소 1명 이상이어야 합니다' })
    .max(1000, { message: '최대 1000명까지 가능합니다' }),
  target_grade: stringField(50).optional().nullable(),
  subject: stringField(100).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type SeminarInput = z.infer<typeof seminarSchema>;

/**
 * Helper function to safely validate and parse input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Return the first error message
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message || '유효하지 않은 입력입니다' };
}

/**
 * Centralized error logging utility
 * Only logs detailed errors in development mode
 */

type ErrorContext = string;

export const logError = (context: ErrorContext, error: unknown): void => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  // In production, you could send to a monitoring service like Sentry
  // Example: Sentry.captureException(error, { tags: { context } });
};

/**
 * Maps known error patterns to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  'permission denied': '권한이 없습니다',
  'duplicate key': '이미 존재하는 데이터입니다',
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
  'User already registered': '이미 가입된 이메일입니다',
  'network': '네트워크 오류가 발생했습니다',
  'timeout': '요청 시간이 초과되었습니다',
};

/**
 * Get a user-friendly error message
 */
export const getUserFriendlyMessage = (error: unknown, defaultMessage: string = '오류가 발생했습니다'): string => {
  if (error instanceof Error) {
    for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }
  }
  return defaultMessage;
};

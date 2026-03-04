import { lazy, ComponentType } from "react";

/**
 * 동적 import 실패 시 재시도하는 lazy wrapper.
 * "Failed to fetch dynamically imported module" 오류 완화용.
 * (배포 후 캐시 불일치, 일시적 네트워크 오류 등)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  });
}
/**
 * 휴대폰 번호 입력 시 자동으로 '-'를 삽입합니다.
 * 010-1234-5678, 010-123-4567, 02-123-4567, 031-123-4567 등 지원
 */
export function formatPhoneWithDash(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.startsWith("010")) {
    if (digits.length <= 7) return `010-${digits.slice(3)}`;
    return `010-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.startsWith("02")) {
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** 포맷된 휴대폰 번호에서 숫자만 추출 */
export function getDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

// 사업자등록번호 유효성 검증 및 포맷팅 유틸리티

/**
 * 사업자등록번호 형식: XXX-XX-XXXXX (10자리)
 * 검증 알고리즘: 가중치를 적용한 체크섬 검증
 */

// 하이픈을 제거하고 숫자만 추출
export const extractNumbers = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

// 사업자등록번호 포맷팅 (XXX-XX-XXXXX)
export const formatBusinessNumber = (value: string): string => {
  const numbers = extractNumbers(value);
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 5) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  }
};

// 사업자등록번호 유효성 검증
export const validateBusinessNumber = (value: string): { isValid: boolean; error?: string } => {
  const numbers = extractNumbers(value);
  
  // 길이 검증
  if (numbers.length === 0) {
    return { isValid: false, error: '사업자등록번호를 입력해주세요' };
  }
  
  if (numbers.length !== 10) {
    return { isValid: false, error: '사업자등록번호는 10자리입니다' };
  }
  
  // 체크섬 검증 알고리즘
  // 가중치: 1, 3, 7, 1, 3, 7, 1, 3, 5
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const digits = numbers.split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  // 9번째 자리 특수 처리 (5를 곱한 후 10으로 나눈 몫을 더함)
  sum += Math.floor((digits[8] * 5) / 10);
  
  // 체크섬 계산
  const checksum = (10 - (sum % 10)) % 10;
  
  if (checksum !== digits[9]) {
    return { isValid: false, error: '유효하지 않은 사업자등록번호입니다' };
  }
  
  return { isValid: true };
};

// 사업자등록번호 입력 핸들러 (자동 포맷팅)
export const handleBusinessNumberInput = (
  value: string,
  onChange: (formatted: string) => void
): void => {
  const numbers = extractNumbers(value);
  
  // 최대 10자리까지만 허용
  if (numbers.length <= 10) {
    onChange(formatBusinessNumber(numbers));
  }
};

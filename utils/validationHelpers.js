/**
 * 입력 검증 헬퍼
 */

/**
 * 페이징 파라미터 파싱 및 검증
 * @param {Object} query - 쿼리 파라미터
 * @returns {Object} { limit, offset }
 */
const parsePaging = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset ?? '0', 10) || 0, 0);
  
  return { limit, offset };
};

/**
 * 날짜 파라미터 검증 (ISO 8601)
 * @param {string} dateStr - 날짜 문자열
 * @returns {Date|null} 파싱된 날짜 또는 null
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  
  return date;
};

/**
 * 이메일 형식 검증
 * @param {string} email - 이메일 주소
 * @returns {boolean} 유효성 여부
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 강도 검증
 * @param {string} password - 비밀번호
 * @returns {Object} { isValid, errors }
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('비밀번호는 8자 이상이어야 합니다.');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 문자열 길이 검증
 * @param {string} value - 검증할 값
 * @param {number} min - 최소 길이
 * @param {number} max - 최대 길이
 * @returns {boolean} 유효성 여부
 */
const validateStringLength = (value, min, max) => {
  if (!value || typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
};

/**
 * 숫자 범위 검증
 * @param {number} value - 검증할 값
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {boolean} 유효성 여부
 */
const validateNumberRange = (value, min, max) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= min && num <= max;
};

module.exports = {
  parsePaging,
  parseDate,
  isValidEmail,
  validatePassword,
  validateStringLength,
  validateNumberRange
}; 
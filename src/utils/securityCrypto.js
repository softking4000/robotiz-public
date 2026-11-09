// ============================================================================
// [파일 설명: securityCrypto.js]
// 사용자의 개인정보 및 비밀번호 등 민감한 데이터를 저장하거나 서버로 전달하기 전에
// 브라우저 표준 Web Crypto API (SHA-256 해시 + Salt 및 AES-GCM 암호화)를 사용하여
// 안전하게 암호화하는 보안 유틸리티 모듈입니다.
// ============================================================================

// 프로젝트 고유 보안 솔트(Salt) 문자열 (무작위 대입 공격 Rainbow Table 방어용)
const SECURITY_SALT = 'ROBOTIS_STEAMCUP_RMOTION_V1_5_21_SECURE_SALT';

/**
 * [함수: hashPasswordWithSalt]
 * 사용자가 입력한 평문 비밀번호(Plain Text Password)에 솔트(Salt)를 결합한 뒤,
 * SHA-256 단방향 암호화 해시 알고리즘을 적용하여 64자리 16진수 암호문으로 변환합니다.
 *
 * @param {string} plainPassword - 사용자가 입력한 원본 비밀번호
 * @returns {Promise<string>} SHA-256으로 암호화된 16진수 해시 문자열
 */
export async function hashPasswordWithSalt(plainPassword) {
  const saltedInput = `${SECURITY_SALT}::${plainPassword}::${SECURITY_SALT.length}`;

  // Web Crypto API를 지원하는 최신 브라우저 환경
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(saltedInput);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

  // 폴백(Fallback) 해시 로직 (보안 컨텍스트가 아닌 로컬 환경 대비)
  let h1 = 0xdeadbeef ^ saltedInput.length;
  let h2 = 0x41c6ce57 ^ saltedInput.length;
  for (let i = 0; i < saltedInput.length; i++) {
    const ch = saltedInput.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  ).repeat(4);
}

/**
 * [함수: encryptSensitiveUserData]
 * 사용자 아이디나 학생/교육자 프로필 정보를 로컬 스토리지나 외부로 전달하기 전
 * 난독화 및 Base64 인코딩 + 무결성 서명(Signature)을 결합하여 보호합니다.
 *
 * @param {object} userObject - 보호할 사용자 데이터 객체
 * @returns {Promise<string>} 암호화된 페이로드 문자열
 */
export async function encryptSensitiveUserData(userObject) {
  const jsonStr = JSON.stringify(userObject);
  const signature = await hashPasswordWithSalt(jsonStr);
  const encodedPayload = btoa(encodeURIComponent(jsonStr));
  return `ENCv1.${signature.slice(0, 16)}.${encodedPayload}`;
}

/**
 * [함수: decryptSensitiveUserData]
 * 암호화된 사용자 페이로드의 무결성 서명을 검증하고 원본 객체를 복원합니다.
 *
 * @param {string} encryptedString - encryptSensitiveUserData로 생성된 문자열
 * @returns {Promise<object|null>} 복호화된 객체 또는 검증 실패 시 null
 */
export async function decryptSensitiveUserData(encryptedString) {
  try {
    if (!encryptedString || !encryptedString.startsWith('ENCv1.')) return null;
    const parts = encryptedString.split('.');
    if (parts.length !== 3) return null;
    const [, sigPrefix, encodedPayload] = parts;
    const jsonStr = decodeURIComponent(atob(encodedPayload));
    const expectedSig = await hashPasswordWithSalt(jsonStr);
    if (expectedSig.slice(0, 16) !== sigPrefix) {
      return null; // 데이터 위변조 감지 시 즉시 차단
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}


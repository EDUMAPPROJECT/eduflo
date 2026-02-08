/**
 * Firebase 클라이언트 (전화번호 인증용)
 * .env에 다음 변수를 설정하세요:
 * VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
 * VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBuSVsN4PKPGVzVosUNUww0X3TGaAf_uPQ",
  authDomain: "eduflo-9ca09.firebaseapp.com",
  projectId: "eduflo-9ca09",
  storageBucket: "eduflo-9ca09.firebasestorage.app",
  messagingSenderId: "539790105779",
  appId: "1:539790105779:web:7f4c839bde1346a2dee4c6",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

// 개발 시에만 reCAPTCHA 검증 비활성화 (테스트 전화번호 사용 시). 프로덕션에서는 사용 금지.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APP_VERIFICATION_DISABLED === "true") {
  (firebaseAuth as unknown as { settings: { appVerificationDisabledForTesting?: boolean } }).settings ??= {};
  (firebaseAuth as unknown as { settings: { appVerificationDisabledForTesting?: boolean } }).settings.appVerificationDisabledForTesting = true;
}

export { app };

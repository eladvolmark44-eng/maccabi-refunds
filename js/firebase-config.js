// ============================================================
// הגדרות Firebase - יש למלא כאן את הפרטים מפרויקט ה-Firebase שלכם
// (Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration)
// הוראות מלאות ב-README.md
// ============================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBg7EG3KifJvY93xOU1JbHWVcZWccr3ck",
  authDomain: "maccabi-haifa-refund.firebaseapp.com",
  projectId: "maccabi-haifa-refund",
  storageBucket: "maccabi-haifa-refund.firebasestorage.app",
  messagingSenderId: "449281311840",
  appId: "1:449281311840:web:f9c0cb385b2fbf3b12af05",
  measurementId: "G-070KXSNZZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCzauzpFZFDtb_a2ITrgcTK7l8I03X8AAs",
  authDomain: "sa-hos-app.firebaseapp.com",
  projectId: "sa-hos-app",
  storageBucket: "sa-hos-app.firebasestorage.app",
  messagingSenderId: "275073314510",
  appId: "1:275073314510:web:f6ddf8196dbb9f58ad2a9f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

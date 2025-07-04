// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCigfC9SYs8RGwRmF4dAnNJ_qyCu_bFSig",
  authDomain: "squash-72502.firebaseapp.com",
  databaseURL: "https://squash-72502-default-rtdb.firebaseio.com",
  projectId: "squash-72502",
  storageBucket: "squash-72502.firebasestorage.app",
  messagingSenderId: "592036326649",
  appId: "1:592036326649:web:54d1a65a5d2da819504628",
  measurementId: "G-1W5NH4GCW0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const analytics = getAnalytics(app);

export { database, analytics };
export default app;
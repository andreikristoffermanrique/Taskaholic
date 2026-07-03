import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHnGOreWDN3NJdUBnucfpJKH_wZuXdQn4", 
  authDomain: "taskaholic-ef3a5.firebaseapp.com",
  projectId: "taskaholic-ef3a5",
  storageBucket: "taskaholic-ef3a5.firebasestorage.app",
  messagingSenderId: "334738698957",
  appId: "1:334738698957:web:5ae37f728fea3983716f84"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
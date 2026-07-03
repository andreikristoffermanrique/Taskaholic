import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const profileNameDisplay = document.getElementById("profile-name-display");
const profileEmailDisplay = document.getElementById("profile-email-display");

onAuthStateChanged(auth, (user) => {
    if (user) {
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        const emailToDisplay = user.email;

        if (profileNameDisplay) {
            profileNameDisplay.textContent = nameToDisplay;
        }
        if (profileEmailDisplay) {
            profileEmailDisplay.textContent = emailToDisplay;
        }
        
    } else {
        window.location.href = "login.html";
    }
});
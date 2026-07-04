import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Stops the page from refreshing

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Grab the pink error box elements from the HTML
    const errorBox = document.getElementById('login-error-msg');
    const errorText = document.getElementById('login-error-text');

    // 1. Manual check for empty fields (No browser pop-ups!)
    if (!email || !password) {
        errorText.textContent = "Please fill in all fields.";
        errorBox.style.display = 'block';
        if (!email) emailInput.style.borderColor = '#C24275';
        if (!password) passwordInput.style.borderColor = '#C24275';
        return; // Stop the script here so Firebase doesn't run with empty data
    }

    // 2. Firebase Authentication
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userName = user.displayName || "Student";

        // Optional: Save user to localStorage so the Dashboard knows who logged in
        localStorage.setItem('currentUser', JSON.stringify({ email: user.email, name: userName }));

        // SUCCESS! No annoying pop-up alerts. Just instantly redirect to the Dashboard.
        window.location.href = "Dashboard.html";

    } catch (error) {
        // FAILED! No pop-up alerts. Just show the pink text box.
        errorText.textContent = "Invalid email or password.";
        errorBox.style.display = 'block';
        emailInput.style.borderColor = '#C24275';
        passwordInput.style.borderColor = '#C24275';
    }
});
import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const nameInput = document.getElementById("register-name");
    const emailInput = document.getElementById("register-email");
    const passwordInput = document.getElementById("register-password");
    const confirmInput = document.getElementById("register-confirm");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    // 1. Check for empty fields (Replaces HTML validation)
    if (!name || !email || !password || !confirmPassword) {
        let emptyFields = [];
        if (!name) emptyFields.push("register-name");
        if (!email) emptyFields.push("register-email");
        if (!password) emptyFields.push("register-password");
        if (!confirmPassword) emptyFields.push("register-confirm");
        
        window.showRegisterError("Please fill in all fields.", emptyFields);
        return; 
    }

    // 2. Strict Domain Check (Replaces the alert popup!)
    if (!email.endsWith("@gbox.adnu.edu.ph")) {
        window.showRegisterError("Please use your valid @gbox.adnu.edu.ph account.", ["register-email"]);
        return; 
    }

    // 3. Password Match Check (Replaces the alert popup!)
    if (password !== confirmPassword) {
        window.showRegisterError("Passwords do not match.", ["register-password", "register-confirm"]);
        return; 
    }

    // 4. Firebase Authentication
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: name
        });

        // SUCCESS! NO annoying alerts. Just perfectly redirects them to login.
        window.location.href = "login.html"; 
        
    } catch (error) {
        // FAILED! Cleanly intercept Firebase errors and show in the pink box
        let errorMsg = "Registration failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMsg = "This email is already in use.";
        } else if (error.code === 'auth/weak-password') {
            errorMsg = "Password should be at least 6 characters.";
        }
        window.showRegisterError(errorMsg, ["register-email", "register-password", "register-confirm"]);
    }
});
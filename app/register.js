import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm").value;

    if (!email.endsWith("@gbox.adnu.edu.ph")) {
        alert("Registration is restricted. Please use your valid @gbox.adnu.edu.ph account.");
        return; 
    }

    if (password !== confirmPassword) {
        alert("Oops! Your passwords do not match.");
        return; 
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: name
        });

        alert("Welcome to Taskaholic, " + name + "!");
        window.location.href = "login.html"; 
        
    } catch (error) {
        alert("Registration Error: " + error.message);
    }
});
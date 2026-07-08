import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Get all the toggles
const taskDueToggle = document.getElementById("pref-task-due");
const sharedDueToggle = document.getElementById("pref-shared-due");
const invitesToggle = document.getElementById("pref-invites");
const announcementsToggle = document.getElementById("pref-announcements");

onAuthStateChanged(auth, async (user) => { 
    if (user) {
        await loadPreferences(user.uid);
        setupToggleListeners(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// 1. Load existing preferences from Firebase
async function loadPreferences(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && userDocSnap.data().notificationPrefs) {
            const prefs = userDocSnap.data().notificationPrefs;
            
            // Update the UI to match the database
            if (taskDueToggle) taskDueToggle.checked = prefs.taskDue !== false;
            if (sharedDueToggle) sharedDueToggle.checked = prefs.sharedDue !== false;
            if (invitesToggle) invitesToggle.checked = prefs.invites !== false;
            if (announcementsToggle) announcementsToggle.checked = prefs.announcements !== false;
        }
    } catch (error) {
        console.error("Error loading preferences:", error);
    }
}

// 2. Save to Firebase whenever a toggle is clicked
function setupToggleListeners(uid) {
    const toggles = [taskDueToggle, sharedDueToggle, invitesToggle, announcementsToggle];
    
    toggles.forEach(toggle => {
        if (!toggle) return;
        
        toggle.addEventListener("change", async () => {
            const newPrefs = {
                taskDue: taskDueToggle.checked,
                sharedDue: sharedDueToggle.checked,
                invites: invitesToggle.checked,
                announcements: announcementsToggle.checked
            };
            
            // Save to the 'users' collection using setDoc with merge: true
            try {
                const userDocRef = doc(db, "users", uid);
                await setDoc(userDocRef, { notificationPrefs: newPrefs }, { merge: true });
                console.log("Preferences updated successfully!");
            } catch (error) {
                console.error("Error saving preferences:", error);
                // Optionally revert the toggle if the save failed
                toggle.checked = !toggle.checked; 
            }
        });
    });
}
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const profileNameDisplay = document.getElementById("profile-name-display");
const profileEmailDisplay = document.getElementById("profile-email-display");

// Task Counter DOM targets
const totalTasksEl = document.getElementById("total-tasks-count");
const dueTodayEl = document.getElementById("due-today-count");
const overdueEl = document.getElementById("overdue-count");
const completedEl = document.getElementById("completed-count");

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        const emailToDisplay = user.email;

        if (profileNameDisplay) profileNameDisplay.textContent = nameToDisplay;
        if (profileEmailDisplay) profileEmailDisplay.textContent = emailToDisplay;

        // Real-Time Total Workload Query Calculation Block
        try {
            const taskQuery = query(collection(db, "tasks"), where("userId", "==", user.uid));
            const snapshot = await getDocs(taskQuery);

            let totalCount = 0;
            let dueTodayCount = 0;
            let overdueCount = 0;
            let completedCount = 0;

            // Get today's local date string (YYYY-MM-DD)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const systemToday = `${year}-${month}-${day}`;

            snapshot.forEach((doc) => {
                const data = doc.data();
                totalCount++;

                // Safe check for status values (handles string types or boolean true/false flags)
                const statusString = data.status ? String(data.status).toLowerCase().trim() : "";
                const isCompletedBoolean = data.completed === true;

                // FIXED: Direct case-insensitive matching for "completed"
                if (statusString === "completed" || isCompletedBoolean) {
                    completedCount++;
                } else {
                    if (data.dueDate) {
                        // Extract date block component format: YYYY-MM-DD
                        const taskDueDate = data.dueDate.split('T')[0].trim();

                        if (taskDueDate === systemToday) {
                            dueTodayCount++;
                        } else if (taskDueDate < systemToday) {
                            overdueCount++;
                        }
                    }
                }
            });

            // Safely inject calculations down into document display metrics
            if (totalTasksEl) totalTasksEl.textContent = totalCount;
            if (dueTodayEl) dueTodayEl.textContent = dueTodayCount;
            if (overdueEl) overdueEl.textContent = overdueCount;
            if (completedEl) completedEl.textContent = completedCount;

        } catch (error) {
            console.error("Failed executing calculations query profile data elements: ", error);
        }
        
    } else {
        window.location.href = "login.html";
    }
});
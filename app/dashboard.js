import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");

onAuthStateChanged(auth, async (user) => { 
    if (user) {
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        if (userNameDisplay) userNameDisplay.textContent = nameToDisplay;
        
        try {
            const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);

            const tableBody = document.getElementById("deadlines-tbody");
            
            // 1. Initialize counters
            let total = 0;
            let todayCount = 0;
            let overdueCount = 0;
            let completedCount = 0;

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (tableBody) {
                tableBody.innerHTML = ""; 
                
                querySnapshot.forEach((doc) => {
                    const task = doc.data();
                    
                    // 2. Perform Math
                    total++;
                    if (task.status === "completed") {
                        completedCount++;
                    } else {
                        // Only count due/overdue for non-completed tasks
                        if (task.deadline === today) {
                            todayCount++;
                        } else if (task.deadline && task.deadline < today) {
                            overdueCount++;
                        }
                    }

                    // 3. Draw Table Row
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>
                            <div style="font-weight: bold; color: #000; font-size: 14px;">${task.title}</div>
                            <div style="font-size: 11px; color: gray;">${task.category || "Task"}</div>
                        </td>
                        <td style="vertical-align: middle;">
                            ${task.deadline || "No Date"}
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }

            // 4. Update the Dashboard Cards
            if (document.getElementById("total-tasks")) document.getElementById("total-tasks").textContent = total;
            if (document.getElementById("due-today-tasks")) document.getElementById("due-today-tasks").textContent = todayCount;
            if (document.getElementById("overdue-tasks")) document.getElementById("overdue-tasks").textContent = overdueCount;
            if (document.getElementById("completed-tasks")) document.getElementById("completed-tasks").textContent = completedCount;

            // 5. Update Progress Overview Chart Text
            // Updates the central text inside your progress circle widget dynamically
            const chartTotalText = document.querySelector(".Progress .total-num, #total-progress-text, .progress-overview-text strong"); 
            if (chartTotalText) {
                chartTotalText.textContent = total;
            } else {
                // Fallback check: If your text container uses a generic identifier, target it here
                const textContainers = document.querySelectorAll("h1, div, span");
                textContainers.forEach(el => {
                    if (el.textContent.trim() === "0" && el.nextElementSibling && el.nextElementSibling.textContent.trim() === "Total") {
                        el.textContent = total;
                    }
                });
            }

        } catch (error) {
            console.error("Error fetching Dashboard tasks: ", error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// 6. Bind "View All" Button Redirection
// Listens for clicks on your upcoming deadlines control header to change routing instantly
document.addEventListener("DOMContentLoaded", () => {
    const viewAllBtn = document.querySelector(".Upcoming .View-btn, button, #view-all-btn");
    
    // Fallback: search explicitly by matching button text contents from image_07ca0a.png
    const buttons = document.querySelectorAll("button, a");
    let targetBtn = null;
    buttons.forEach(btn => {
        if (btn.textContent.trim() === "View All") {
            targetBtn = btn;
        }
    });

    if (targetBtn) {
        targetBtn.style.cursor = "pointer";
        targetBtn.addEventListener("click", () => {
            window.location.href = "my_tasks.html";
        });
    }
});
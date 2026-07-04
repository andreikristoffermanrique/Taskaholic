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
            
            let academicCount = 0;
            let projectCount = 0;
            let personalCount = 0;

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (tableBody) {
                tableBody.innerHTML = ""; 
                
                querySnapshot.forEach((doc) => {
                    const task = doc.data();
                    
                    // 2. Perform Math & Analytics Counts
                    total++;
                    
                    // Track categories for the progress chart ring
                    if (task.category === 'academic') academicCount++;
                    else if (task.category === 'project') projectCount++;
                    else if (task.category === 'personal') personalCount++;

                    // Track task lifecycle metrics
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
                    tr.style.borderBottom = "1px solid #CCCCCC";
                    tr.innerHTML = `
                        <td style="text-align: left; padding: 12px 14px;">
                            <strong style="color: #000000; font-size: 14px;">${task.title}</strong><br>
                            <span style="color: #888888; font-size: 12px; text-transform: lowercase;">${task.category || "task"}</span>
                        </td>
                        <td style="text-align: right; padding: 12px 14px; font-size: 14px; color: #000000; vertical-align: middle;">
                            ${task.deadline || "No Date"}
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }

            // If no items are found in query snapshots, print clean fallback row
            if (total === 0 && tableBody) {
                tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color: #666; font-size: 14px;">No upcoming deadlines</td></tr>`;
            }

            // 4. Update the Top Dashboard Cards
            if (document.getElementById("total-tasks")) document.getElementById("total-tasks").textContent = total;
            if (document.getElementById("due-today-tasks")) document.getElementById("due-today-tasks").textContent = todayCount;
            if (document.getElementById("overdue-tasks")) document.getElementById("overdue-tasks").textContent = overdueCount;
            if (document.getElementById("completed-tasks")) document.getElementById("completed-tasks").textContent = completedCount;

            // 5. Update Progress Overview Chart Label Total
            const chartTotalText = document.getElementById("chart-total-tasks");
            if (chartTotalText) {
                chartTotalText.textContent = total;
            }

            // 6. Update Progress Overview SVG Chart Rings
            const ringAcademic = document.getElementById('ring-academic');
            const ringProject = document.getElementById('ring-project');
            const ringPersonal = document.getElementById('ring-personal');

            if (total > 0 && ringAcademic && ringProject && ringPersonal) {
                const acaPct = (academicCount / total) * 100;
                const projPct = (projectCount / total) * 100;
                const persPct = (personalCount / total) * 100;

                ringAcademic.setAttribute('stroke-dasharray', `${acaPct} ${100 - acaPct}`);
                ringAcademic.setAttribute('stroke-dashoffset', `25`);

                ringProject.setAttribute('stroke-dasharray', `${projPct} ${100 - projPct}`);
                ringProject.setAttribute('stroke-dashoffset', `${25 - acaPct}`);

                ringPersonal.setAttribute('stroke-dasharray', `${persPct} ${100 - persPct}`);
                ringPersonal.setAttribute('stroke-dashoffset', `${25 - acaPct - projPct}`);
            } else if (ringAcademic && ringProject && ringPersonal) {
                // Reset graphics cleanly if 0 tasks match filters
                ringAcademic.setAttribute('stroke-dasharray', `0 100`);
                ringProject.setAttribute('stroke-dasharray', `0 100`);
                ringPersonal.setAttribute('stroke-dasharray', `0 100`);
            }

        } catch (error) {
            console.error("Error fetching Dashboard tasks: ", error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// 7. Bind "View All" Button Redirection
document.addEventListener("DOMContentLoaded", () => {
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
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
            document.getElementById("total-tasks").textContent = total;
            document.getElementById("due-today-tasks").textContent = todayCount;
            document.getElementById("overdue-tasks").textContent = overdueCount;
            document.getElementById("completed-tasks").textContent = completedCount;

        } catch (error) {
            console.error("Error fetching Dashboard tasks: ", error);
        }
    } else {
        window.location.href = "login.html";
    }
});
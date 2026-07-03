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
            const tableBody = document.getElementById("taskGridBody");
            
            if (tableBody) {
                tableBody.innerHTML = ""; 
                
                querySnapshot.forEach((doc) => {
                    const task = doc.data();
                    const tr = document.createElement("tr");

                    tr.innerHTML = `
                        <td>${task.title || "—"}</td>
                        <td>${task.description || "—"}</td>
                        <td>${task.category || "—"}</td>
                        <td>${task.priority || "—"}</td>
                        <td>${task.deadline || "—"}</td>
                        <td>${task.status || "—"}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Error loading tasks: ", error);
        }
        
    } else {
        window.location.href = "login.html";
    }
});
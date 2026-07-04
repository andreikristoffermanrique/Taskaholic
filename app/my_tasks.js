import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");
const tableBody = document.getElementById("taskGridBody");

onAuthStateChanged(auth, async (user) => { 
    if (user) {
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        if (userNameDisplay) userNameDisplay.textContent = nameToDisplay;
        
        loadTasks(user.uid);
        
    } else {
        window.location.href = "login.html";
    }
});

async function loadTasks(uid) {
    try {
        const q = query(collection(db, "tasks"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        
        if (tableBody) {
            tableBody.innerHTML = ""; 
            
            querySnapshot.forEach((doc) => {
                const task = doc.data();
                const tr = document.createElement("tr");

                // Wraps the title in an anchor tag pointing to task_details.html with the document ID
                tr.innerHTML = `
                    <td>
                        <a href="task_details.html?id=${doc.id}" style="color: #000000; text-decoration: none;">
                            <strong style="text-decoration: underline; cursor: pointer;">${task.title || "—"}</strong>
                        </a>
                    </td>
                    <td>${task.category || "—"}</td>
                    <td>${task.priority || "—"}</td>
                    <td>${task.deadline || "—"}</td>
                    <td>${task.status || "—"}</td>
                    <td><button class="delete-btn" data-id="${doc.id}">Delete</button></td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading tasks: ", error);
    }
}

if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const taskId = e.target.getAttribute("data-id");
            
            if (confirm("Are you sure you want to delete this task?")) {
                try {
                    await deleteDoc(doc(db, "tasks", taskId));
                    alert("Task deleted successfully!");
                    loadTasks(auth.currentUser.uid);
                } catch (error) {
                    console.error("Error deleting task: ", error);
                }
            }
        }
    });
}
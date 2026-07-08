import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocsFromServer, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");
const tableBody = document.getElementById("taskGridBody");
const loadingIndicator = document.getElementById("loading");
const emptyStateContainer = document.getElementById("emptyStateContainer");

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
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tableBody) tableBody.style.opacity = '0.5';

    try {
        const q = query(collection(db, "tasks"), where("userId", "==", uid));

        const querySnapshot = await getDocsFromServer(q);

        if (querySnapshot.empty) {
            if (emptyStateContainer) emptyStateContainer.style.display = 'block';
            if (tableBody) tableBody.innerHTML = ""; 
        } else {
            if (emptyStateContainer) emptyStateContainer.style.display = 'none';
            
            if (tableBody) {
                tableBody.innerHTML = ""; 
                querySnapshot.forEach((doc) => {
                    const task = doc.data();
                    const tr = document.createElement("tr");

                    // REPLACED: Updated the "Delete" text with a beautifully styled PINK Button!
                    tr.innerHTML = `
                        <td>
                            <a href="task_details.html?id=${doc.id}" style="color: #000000; text-decoration: none;">
                                <strong style="text-decoration: underline; cursor: pointer;">${task.title || "—"}</strong>
                            </a>
                        </td>
                        <td style="text-transform: capitalize;">${task.category || "—"}</td>
                        <td style="text-transform: capitalize;">${task.priority || "—"}</td>
                        <td>${task.deadline || "—"}</td>
                        <td style="text-transform: capitalize;">${task.status || "—"}</td>
                        <td style="text-align: center;">
                            <button class="delete-btn" data-id="${doc.id}" style="background-color: #FA6B6B; color: #FFFFFF; border: 1px solid #000000; border-radius: 6px; padding: 6px 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;">
                                DELETE
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        }
    } catch (error) {
        console.error("Error loading tasks: ", error);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (tableBody) tableBody.style.opacity = '1';
    }
}
import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocsFromServer, doc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

                    // Notice the new styled PINK DELETE BUTTON
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
                        <td>
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

// DELETE TASK LOGIC
if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const taskId = e.target.getAttribute("data-id");
            
            if (confirm("Are you sure you want to delete this task?")) {
                try {
                    e.target.style.opacity = "0.5"; // Visual feedback
                    await deleteDoc(doc(db, "tasks", taskId));
                    loadTasks(auth.currentUser.uid); // Refresh grid
                } catch (error) {
                    console.error("Error deleting task: ", error);
                }
            }
        }
    });
}

// ADD TASK TO FIREBASE LOGIC
const taskForm = document.getElementById("modalTaskForm");

if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) return alert("Please log in to add tasks.");

        const title = document.getElementById('modalTaskTitle').value.trim();
        const desc = document.getElementById('modalTaskDesc').value.trim();
        const date = document.getElementById('modalTaskDate').value;
        const status = document.getElementById('modalTaskStatus').value;
        
        const categoryElement = document.querySelector('input[name="category"]:checked');
        const priorityElement = document.querySelector('input[name="priority"]:checked');
        const visibilityElement = document.querySelector('input[name="visibility"]:checked');
        
        const shareEmailInput = document.getElementById('modalShareEmail');
        const shareEmail = shareEmailInput ? shareEmailInput.value.trim() : '';

        const submitBtn = document.getElementById('btnSaveSubmit') || taskForm.querySelector('button[type="submit"]');

        if (!title) {
            alert("Please enter a Task Title.");
            return;
        }

        const newTask = {
            title: title,
            description: desc,
            dueDate: date,
            deadline: date,
            category: categoryElement ? categoryElement.value : 'academic',
            priority: priorityElement ? priorityElement.value : 'medium',
            visibility: visibilityElement ? visibilityElement.value : 'private',
            status: status,
            completed: status === 'completed',
            userId: auth.currentUser.uid, 
            owner: auth.currentUser.email,
            members: visibilityElement && visibilityElement.value === 'shared' ? shareEmail : 'None',
            subtasks: [],
            createdAt: new Date().toISOString()
        };

        try {
            if (submitBtn) {
                submitBtn.innerText = "Saving...";
                submitBtn.disabled = true;
            }

            // Push to Firebase
            await addDoc(collection(db, "tasks"), newTask);

            // Hide Modal
            const modal = document.getElementById('uniqueTaskFormModal');
            if (modal) modal.style.setProperty('display', 'none', 'important');
            
            // Clear Form and restore button
            taskForm.reset();
            if (submitBtn) {
                submitBtn.innerText = "Save Task";
                submitBtn.disabled = false;
            }

            // Refresh UI live without reloading the whole page!
            loadTasks(auth.currentUser.uid);

        } catch (error) {
            console.error("Error adding task: ", error);
            alert("Failed to save task.");
            if (submitBtn) {
                submitBtn.innerText = "Save Task";
                submitBtn.disabled = false;
            }
        }
    });
}
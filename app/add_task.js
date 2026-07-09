import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const taskForm = document.getElementById("modalTaskForm");
const saveBtn = document.getElementById("btnSaveSubmit");

if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Prevents the page from refreshing when you submit

        // UI Feedback: Let the user know it's saving
        const originalBtnText = saveBtn.innerText;
        saveBtn.innerText = "Saving...";
        saveBtn.style.opacity = "0.7";
        saveBtn.disabled = true;

        try {
            if (!auth.currentUser) throw new Error("User is not authenticated");

            // Gather all data from the HTML modal
            const title = document.getElementById("modalTaskTitle").value.trim();
            const desc = document.getElementById("modalTaskDesc").value.trim();
            const category = document.querySelector('input[name="category"]:checked').value;
            const priority = document.querySelector('input[name="priority"]:checked').value;
            const deadline = document.getElementById("modalTaskDate").value;
            const visibility = document.querySelector('input[name="visibility"]:checked').value;
            const shareEmail = document.getElementById("modalShareEmail").value.trim();
            const status = document.getElementById("modalTaskStatus").value;

            // Structure the data to match your database rules
            const taskData = {
                userId: auth.currentUser.uid,
                title: title,
                description: desc,
                category: category,
                priority: priority,
                deadline: deadline,
                visibility: visibility,
                sharedWith: visibility === "shared" ? shareEmail : null,
                status: status,
                createdAt: serverTimestamp() 
            };

            // Push to Firebase
            await addDoc(collection(db, "tasks"), taskData);

            // Cleanly close the modal and reset the form
            taskForm.reset();
            if (typeof window.closeAddTaskModal === "function") {
                window.closeAddTaskModal();
            }

        } catch (error) {
            console.error("Error adding task: ", error);
            console.error("Failed to save task. Please try again.");
        } finally {
            // Restore button state
            saveBtn.innerText = originalBtnText;
            saveBtn.style.opacity = "1";
            saveBtn.disabled = false;
        }
    });
}
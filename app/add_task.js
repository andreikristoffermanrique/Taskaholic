import { auth, db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const saveTaskBtn = document.getElementById("save-new-task-btn");

if (saveTaskBtn) {
    saveTaskBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            alert("You must be logged in to save a task.");
            return;
        }

        try {

            const titleInput = document.getElementById("modalTaskTitle").value;
            const descInput = document.getElementById("modalTaskDesc").value;
            const dateInput = document.getElementById("modalTaskDate").value;
            const statusInput = document.getElementById("modalTaskStatus").value;

            const categoryInput = document.querySelector('input[name="category"]:checked').value;
            const priorityInput = document.querySelector('input[name="priority"]:checked').value;
            const visibilityInput = document.querySelector('input[name="visibility"]:checked').value;

            if (titleInput.trim() === "") {
                alert("Please enter a Task Title!");
                return;
            }

            await addDoc(collection(db, "tasks"), {
                title: titleInput,
                description: descInput,
                deadline: dateInput,
                category: categoryInput,
                priority: priorityInput,
                visibility: visibilityInput,
                status: statusInput,

                userId: auth.currentUser.uid,
                createdAt: new Date().toISOString() 
            });

            alert("Task added successfully!");
            window.location.reload(); 

        } catch (error) {
            console.error("Error adding task: ", error);
            alert("Failed to save task. Check the console for details.");
        }
    });
}
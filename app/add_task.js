import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const taskForm = document.getElementById("modalTaskForm");
const saveBtn = document.getElementById("btnSaveSubmit");

if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 

        const originalBtnText = saveBtn.innerText;
        saveBtn.innerText = "Saving...";
        saveBtn.style.opacity = "0.7";
        saveBtn.disabled = true;

        try {
            if (!auth.currentUser) throw new Error("User is not authenticated");

            const title = document.getElementById("modalTaskTitle").value.trim();
            const desc = document.getElementById("modalTaskDesc").value.trim();
            const category = document.querySelector('input[name="category"]:checked').value;
            const priority = document.querySelector('input[name="priority"]:checked').value;
            const deadline = document.getElementById("modalTaskDate").value;
            const visibility = document.querySelector('input[name="visibility"]:checked').value;
            const shareEmail = document.getElementById("modalShareEmail").value.trim().toLowerCase(); 
            const status = document.getElementById("modalTaskStatus").value;

            const taskData = {
                userId: auth.currentUser.uid,
                creatorEmail: auth.currentUser.email ? auth.currentUser.email.toLowerCase() : "",
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

            // 1. Push Task to Firebase
            await addDoc(collection(db, "tasks"), taskData);

            // 2. Push Invitation Notification if shared
            if (visibility === "shared" && shareEmail) {
                const senderName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
                await addDoc(collection(db, "notifications"), {
                    recipientEmail: shareEmail, 
                    userId: null, // Left null so it doesn't cross wires with creator metrics
                    title: `Task Invitation`,
                    message: `${senderName} shared a task with you: "${title}"`,
                    type: 'invitations',
                    status: 'pending',
                    icon: 'fa-user-plus',
                    iconColor: '#55CBB2',
                    time: 'New',
                    createdAt: serverTimestamp()
                });
            }

            taskForm.reset();
            if (typeof window.closeAddTaskModal === "function") {
                window.closeAddTaskModal();
            }

        } catch (error) {
            console.error("Error adding task: ", error);
            alert("Failed to save task. Please try again.");
        } finally {
            saveBtn.innerText = originalBtnText;
            saveBtn.style.opacity = "1";
            saveBtn.disabled = false;
        }
    });
}
import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");
const tableBody = document.getElementById("taskGridBody");
const loadingIndicator = document.getElementById("loading");
const emptyStateContainer = document.getElementById("emptyStateContainer");
const searchInput = document.getElementById("taskSearchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const statusFilter = document.getElementById("statusFilter");

let allTasks = [];

onAuthStateChanged(auth, (user) => { 
    if (user) {
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        if (userNameDisplay) userNameDisplay.textContent = nameToDisplay;
        
        loadTasks(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

function loadTasks(uid) {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tableBody) tableBody.style.opacity = '0.5';

    const q = query(collection(db, "tasks"), where("userId", "==", uid));

    // REAL-TIME LISTENER: This fires immediately on load, AND anytime a task is added or deleted.
    onSnapshot(q, (querySnapshot) => {
        allTasks = [];
        querySnapshot.forEach((doc) => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (tableBody) tableBody.style.opacity = '1';

        applyFiltersAndRender();
    }, (error) => {
        console.error("Error loading tasks: ", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (tableBody) tableBody.style.opacity = '1';
    });
}

function applyFiltersAndRender() {
    if (!tableBody) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const selectedPriority = priorityFilter ? priorityFilter.value : "all";
    const selectedStatus = statusFilter ? statusFilter.value : "all";

    const filteredTasks = allTasks.filter(task => {
        const matchesSearch = (task.title || "").toLowerCase().includes(searchTerm) || 
                              (task.description || "").toLowerCase().includes(searchTerm);
        
        const matchesCategory = selectedCategory === "all" || (task.category || "").toLowerCase() === selectedCategory;
        const matchesPriority = selectedPriority === "all" || (task.priority || "").toLowerCase() === selectedPriority;
        const matchesStatus = selectedStatus === "all" || (task.status || "").toLowerCase() === selectedStatus;

        return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

    tableBody.innerHTML = "";
    if (emptyStateContainer) emptyStateContainer.style.display = 'none';

    if (filteredTasks.length === 0) {
        // Guarantee perfect centering by injecting the graphic inside a full-width table row
        const emptyTr = document.createElement("tr");
        emptyTr.innerHTML = `
            <td colspan="6" style="padding: 80px 0; text-align: center; vertical-align: middle;">
                <div style="margin: 0 auto; display: inline-block; text-align: center;">
                    <div class="clipboard-mock-vector" style="margin: 0 auto 16px auto;">
                        <span class="clip-top"></span>
                        <span class="line short"></span>
                        <span class="line long"></span>
                        <span class="line medium"></span>
                    </div>
                    <p style="font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; color: #555; margin: 0;">No Tasks Found</p>
                </div>
            </td>
        `;
        tableBody.appendChild(emptyTr);
    } else {
        filteredTasks.forEach((task) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <a href="task_details.html?id=${task.id}" style="color: #000000; text-decoration: none;">
                        <strong style="text-decoration: underline; cursor: pointer;">${task.title || "—"}</strong>
                    </a>
                </td>
                <td style="text-transform: capitalize;">${task.category || "—"}</td>
                <td style="text-transform: capitalize;">${task.priority || "—"}</td>
                <td>${task.deadline || "—"}</td>
                <td style="text-transform: capitalize;">${task.status || "—"}</td>
                <td style="text-align: center;">
                    <button class="delete-btn" data-id="${task.id}" style="background-color: #FA6B6B; color: #FFFFFF; border: 1px solid #000000; border-radius: 6px; padding: 6px 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;">
                        DELETE
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

if (searchInput) searchInput.addEventListener("input", applyFiltersAndRender);
if (categoryFilter) categoryFilter.addEventListener("change", applyFiltersAndRender);
if (priorityFilter) priorityFilter.addEventListener("change", applyFiltersAndRender);
if (statusFilter) statusFilter.addEventListener("change", applyFiltersAndRender);

let taskToDeleteId = null;
let activeDeleteButton = null;

if (tableBody) {
    tableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            e.preventDefault(); 
            taskToDeleteId = e.target.getAttribute("data-id");
            activeDeleteButton = e.target;
            const deleteModal = document.getElementById('deleteConfirmModal');
            if(deleteModal) deleteModal.style.setProperty('display', 'flex', 'important');
        }
    });
}

const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
        if (!taskToDeleteId) return;
        
        try {
            confirmDeleteBtn.innerText = "Deleting...";
            if (activeDeleteButton) activeDeleteButton.style.opacity = "0.5";
            
            // Delete from database - onSnapshot automatically handles refreshing the table!
            await deleteDoc(doc(db, "tasks", taskToDeleteId));
            
            document.getElementById('deleteConfirmModal').style.setProperty('display', 'none', 'important');
            confirmDeleteBtn.innerText = "Yes, Delete";
            taskToDeleteId = null;
            
        } catch (error) {
            console.error("Error deleting task: ", error);
            confirmDeleteBtn.innerText = "Yes, Delete";
            if (activeDeleteButton) activeDeleteButton.style.opacity = "1";
        }
    });
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
        document.getElementById('deleteConfirmModal').style.setProperty('display', 'none', 'important');
        taskToDeleteId = null;
        activeDeleteButton = null;
    });
}
import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocsFromServer, doc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");
const tableBody = document.getElementById("taskGridBody");
const loadingIndicator = document.getElementById("loading");
const emptyStateContainer = document.getElementById("emptyStateContainer");

// Get references to search and filter inputs
const searchInput = document.getElementById("taskSearchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const statusFilter = document.getElementById("statusFilter");

// Global array to store fetched tasks from server
let allTasks = [];

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

        allTasks = []; // Clear local memory storage

        querySnapshot.forEach((doc) => {
            allTasks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Initial application of rules and rendering
        applyFiltersAndRender();

    } catch (error) {
        console.error("Error loading tasks: ", error);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (tableBody) tableBody.style.opacity = '1';
    }
}

// Function to handle client-side filtering and table structure population
function applyFiltersAndRender() {
    if (!tableBody) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const selectedPriority = priorityFilter ? priorityFilter.value : "all";
    const selectedStatus = statusFilter ? statusFilter.value : "all";

    // Perform deep client-side filtering profile operations
    const filteredTasks = allTasks.filter(task => {
        const matchesSearch = (task.title || "").toLowerCase().includes(searchTerm) || 
                              (task.description || "").toLowerCase().includes(searchTerm);
        
        const matchesCategory = selectedCategory === "all" || (task.category || "").toLowerCase() === selectedCategory;
        const matchesPriority = selectedPriority === "all" || (task.priority || "").toLowerCase() === selectedPriority;
        const matchesStatus = selectedStatus === "all" || (task.status || "").toLowerCase() === selectedStatus;

        return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

    // Reset layout surface area completely
    tableBody.innerHTML = "";

    // Suppress external raw styling containers to maintain grid integrity
    if (emptyStateContainer) emptyStateContainer.style.display = 'none';

    if (filteredTasks.length === 0) {
        // Render a clean, perfectly centered "No task found" message across all columns
        const emptyTr = document.createElement("tr");
        emptyTr.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 60px 0; color: #333; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600;">
                No task found
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
                <td>
                    <button class="delete-btn" data-id="${task.id}" style="background-color: #FA6B6B; color: #FFFFFF; border: 1px solid #000000; border-radius: 6px; padding: 6px 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;">
                        DELETE
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

// Attach change hooks for operational data modifications
if (searchInput) searchInput.addEventListener("input", applyFiltersAndRender);
if (categoryFilter) categoryFilter.addEventListener("change", applyFiltersAndRender);
if (priorityFilter) priorityFilter.addEventListener("change", applyFiltersAndRender);
if (statusFilter) statusFilter.addEventListener("change", applyFiltersAndRender);


// DELETE TASK LOGIC
if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const taskId = e.target.getAttribute("data-id");
            
            if (confirm("Are you sure you want to delete this task?")) {
                try {
                    e.target.style.opacity = "0.5"; 
                    await deleteDoc(doc(db, "tasks", taskId));
                    loadTasks(auth.currentUser.uid); 
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

            await addDoc(collection(db, "tasks"), newTask);

            const modal = document.getElementById('uniqueTaskFormModal');
            if (modal) modal.style.setProperty('display', 'none', 'important');
            
            taskForm.reset();
            if (submitBtn) {
                submitBtn.innerText = "Save Task";
                submitBtn.disabled = false;
            }

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
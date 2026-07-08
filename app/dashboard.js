import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const userNameDisplay = document.getElementById("user-name");

// Pagination Variables
let allTasks = [];
let currentPage = 1;
const tasksPerPage = 4;

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
            
            let academicCount = 0;
            let projectCount = 0;
            let personalCount = 0;

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            allTasks = []; // Reset array
            
            if (tableBody) {
                querySnapshot.forEach((doc) => {
                    const task = doc.data();
                    task.id = doc.id; // Store Firebase ID for the hyperlink
                    allTasks.push(task);
                    
                    // 2. Perform Math & Analytics Counts
                    total++;
                    
                    // Track categories for the progress chart ring
                    if (task.category === 'academic') academicCount++;
                    else if (task.category === 'project') projectCount++;
                    else if (task.category === 'personal') personalCount++;

                    // Track task lifecycle metrics
                    if (task.status === "completed") {
                        completedCount++;
                    } else {
                        if (task.deadline === today) {
                            todayCount++;
                        } else if (task.deadline && task.deadline < today) {
                            overdueCount++;
                        }
                    }
                });

                // 3. Sort tasks (closest deadlines first, put "No Date" at the bottom)
                let sortedTasks = [...allTasks].sort((a, b) => {
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                });

                // 4. Inject Pagination Container below the table if it doesn't exist
                let paginationContainer = document.getElementById("pagination-controls");
                if (!paginationContainer && tableBody.closest('.table-container')) {
                    paginationContainer = document.createElement("div");
                    paginationContainer.id = "pagination-controls";
                    paginationContainer.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 15px; padding: 12px; background-color: #FCF8F8; border-top: 1px solid #000;";
                    tableBody.closest('.table-container').appendChild(paginationContainer);
                }

                // 5. Render specific page
                window.renderTable = function(page) {
                    tableBody.innerHTML = "";
                    currentPage = page;
                    
                    const startIndex = (page - 1) * tasksPerPage;
                    const endIndex = startIndex + tasksPerPage;
                    const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

                    if (sortedTasks.length === 0) {
                        tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color: #666; font-size: 14px;">No upcoming deadlines</td></tr>`;
                        if (paginationContainer) paginationContainer.innerHTML = "";
                        return;
                    }

                    paginatedTasks.forEach(task => {
                        const tr = document.createElement("tr");
                        tr.style.borderBottom = "1px solid #CCCCCC";
                        
                        // Added <a href> link wrapped around the Title connecting directly to Task Details
                        tr.innerHTML = `
                            <td style="text-align: left; padding: 12px 14px;">
                                <a href="task_details.html?id=${task.id}" style="color: #000000; text-decoration: none;">
                                    <strong style="font-size: 14px; text-decoration: underline; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">${task.title || "Untitled"}</strong>
                                </a><br>
                                <span style="color: #888888; font-size: 12px; text-transform: lowercase;">${task.category || "task"}</span>
                            </td>
                            <td style="text-align: right; padding: 12px 14px; font-size: 14px; color: #000000; vertical-align: middle;">
                                ${task.deadline || "No Date"}
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    });

                    renderPaginationControls();
                };

                // 6. Generate interactive pagination buttons
                function renderPaginationControls() {
                    if (!paginationContainer) return;
                    paginationContainer.innerHTML = "";
                    
                    const totalPages = Math.ceil(sortedTasks.length / tasksPerPage);
                    if (totalPages <= 1) return; // Hide pagination if only 1 page is needed

                    const prevBtn = document.createElement("button");
                    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
                    prevBtn.style.cssText = `background: #F9DFDF; border: 1px solid #000; border-radius: 4px; padding: 4px 10px; cursor: pointer; color: #000; opacity: ${currentPage === 1 ? '0.4' : '1'}; transition: 0.2s;`;
                    prevBtn.disabled = currentPage === 1;
                    prevBtn.onclick = () => { if (currentPage > 1) renderTable(currentPage - 1); };

                    const pageIndicator = document.createElement("span");
                    pageIndicator.style.cssText = "font-size: 12px; font-family: 'Inter', sans-serif; font-weight: 600; color: #333;";
                    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

                    const nextBtn = document.createElement("button");
                    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                    nextBtn.style.cssText = `background: #F9DFDF; border: 1px solid #000; border-radius: 4px; padding: 4px 10px; cursor: pointer; color: #000; opacity: ${currentPage === totalPages ? '0.4' : '1'}; transition: 0.2s;`;
                    nextBtn.disabled = currentPage === totalPages;
                    nextBtn.onclick = () => { if (currentPage < totalPages) renderTable(currentPage + 1); };

                    paginationContainer.appendChild(prevBtn);
                    paginationContainer.appendChild(pageIndicator);
                    paginationContainer.appendChild(nextBtn);
                }

                // Call initial render for page 1
                renderTable(1);
            }

            // 7. Update the Top Dashboard Cards
            if (document.getElementById("total-tasks")) document.getElementById("total-tasks").textContent = total;
            if (document.getElementById("due-today-tasks")) document.getElementById("due-today-tasks").textContent = todayCount;
            if (document.getElementById("overdue-tasks")) document.getElementById("overdue-tasks").textContent = overdueCount;
            if (document.getElementById("completed-tasks")) document.getElementById("completed-tasks").textContent = completedCount;

            // 8. Update Progress Overview Chart Label Total
            const chartTotalText = document.getElementById("chart-total-tasks");
            if (chartTotalText) chartTotalText.textContent = total;

            // 9. Update Progress Overview SVG Chart Rings
            const ringAcademic = document.getElementById('ring-academic');
            const ringProject = document.getElementById('ring-project');
            const ringPersonal = document.getElementById('ring-personal');

            if (total > 0 && ringAcademic && ringProject && ringPersonal) {
                const acaPct = (academicCount / total) * 100;
                const projPct = (projectCount / total) * 100;
                const persPct = (personalCount / total) * 100;

                ringAcademic.setAttribute('stroke-dasharray', `${acaPct} ${100 - acaPct}`);
                ringAcademic.setAttribute('stroke-dashoffset', `25`);

                ringProject.setAttribute('stroke-dasharray', `${projPct} ${100 - projPct}`);
                ringProject.setAttribute('stroke-dashoffset', `${25 - acaPct}`);

                ringPersonal.setAttribute('stroke-dasharray', `${persPct} ${100 - persPct}`);
                ringPersonal.setAttribute('stroke-dashoffset', `${25 - acaPct - projPct}`);
            } else if (ringAcademic && ringProject && ringPersonal) {
                ringAcademic.setAttribute('stroke-dasharray', `0 100`);
                ringProject.setAttribute('stroke-dasharray', `0 100`);
                ringPersonal.setAttribute('stroke-dasharray', `0 100`);
            }

        } catch (error) {
            console.error("Error fetching Dashboard tasks: ", error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// Bind "View All" Button Redirection
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll("button, a");
    let targetBtn = null;
    buttons.forEach(btn => {
        if (btn.textContent.trim() === "View All") {
            targetBtn = btn;
        }
    });

    if (targetBtn) {
        targetBtn.style.cursor = "pointer";
        targetBtn.addEventListener("click", () => window.location.href = "my_tasks.html");
    }
});

// ADD TASK LOGIC (FIREBASE CONNECTED)
const saveTaskBtn = document.getElementById("save-new-task-btn");
if (saveTaskBtn) {
    saveTaskBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) return alert("You must be logged in to add tasks.");

        const title = document.getElementById('modalTaskTitle').value.trim();
        const desc = document.getElementById('modalTaskDesc').value.trim();
        const date = document.getElementById('modalTaskDate').value;
        const status = document.getElementById('modalTaskStatus').value;
        
        const categoryElement = document.querySelector('input[name="category"]:checked');
        const priorityElement = document.querySelector('input[name="priority"]:checked');
        const visibilityElement = document.querySelector('input[name="visibility"]:checked');
        
        const shareEmailInput = document.getElementById('modalShareEmail');
        const shareEmail = shareEmailInput ? shareEmailInput.value.trim() : '';

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
            saveTaskBtn.innerText = "Saving...";
            saveTaskBtn.disabled = true;

            await addDoc(collection(db, "tasks"), newTask);

            // Hide the modal & reload to show fresh data dynamically with pagination
            const modal = document.getElementById('uniqueTaskFormModal');
            if (modal) modal.style.setProperty('display', 'none', 'important');
            window.location.reload();
        } catch (error) {
            console.error("Error adding task: ", error);
            alert("Failed to save task.");
            saveTaskBtn.innerText = "Save Task";
            saveTaskBtn.disabled = false;
        }
    });
}
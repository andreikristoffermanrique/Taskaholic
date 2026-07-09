import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// HTML Element selectors
const tabSharedTasks = document.getElementById("tabSharedTasks");
const tabInvitations = document.getElementById("tabInvitations");
const viewSharedTasks = document.getElementById("view-shared-tasks");
const viewInvitations = document.getElementById("view-invitations");

const sharedBoardContent = document.getElementById("sharedBoardContent");
const invitationsList = document.getElementById("invitations-list");

// Quick Invite Elements
const quickInviteEmail = document.getElementById("quickInviteEmail");
const quickInviteRole = document.getElementById("quickInviteRole");
const quickInviteBtn = document.getElementById("quickInviteBtn");

let currentTaskContextId = "";

onAuthStateChanged(auth, (user) => { 
    if (user) {
        const email = user.email ? user.email.toLowerCase().trim() : "";
        console.log("Logged in user email:", email);
        
        const urlParams = new URLSearchParams(window.location.search);
        currentTaskContextId = urlParams.get('id') || "";

        loadSharedTasks(email);
        loadIncomingInvitations(email);
        setupQuickInvite(user);
    } else {
        window.location.href = "login.html";
    }
});

// --- TAB TOGGLE CONTROLLER ---
if (tabSharedTasks && tabInvitations) {
    tabSharedTasks.addEventListener("click", () => {
        tabSharedTasks.style.backgroundColor = "#F5AFAF";
        tabSharedTasks.style.fontWeight = "600";
        tabInvitations.style.backgroundColor = "#FFFFFF";
        tabInvitations.style.fontWeight = "500";
        if (viewSharedTasks) viewSharedTasks.style.display = "block";
        if (viewInvitations) viewInvitations.style.display = "none";
    });

    tabInvitations.addEventListener("click", () => {
        tabInvitations.style.backgroundColor = "#F5AFAF";
        tabInvitations.style.fontWeight = "600";
        tabSharedTasks.style.backgroundColor = "#FFFFFF";
        tabSharedTasks.style.fontWeight = "500";
        if (viewSharedTasks) viewSharedTasks.style.display = "none";
        if (viewInvitations) viewInvitations.style.display = "block";
    });
}

// --- VIEW 1: LOAD COLLABORATING TASKS ---
function loadSharedTasks(userEmail) {
    if (!sharedBoardContent) return;
    
    const q = query(collection(db, "tasks"), where("sharedWith", "==", userEmail));

    onSnapshot(q, (snapshot) => {
        sharedBoardContent.innerHTML = "";
        let acceptedCount = 0;

        snapshot.forEach((doc) => {
            const task = doc.data();
            const currentStatus = task.status ? task.status.toLowerCase().trim() : "";

            if (currentStatus === "pending") return;

            acceptedCount++;

            const card = document.createElement("div");
            card.classList.add("clickable-task-card");
            card.setAttribute("data-id", doc.id);
            
            card.style.cssText = "background-color: #FFFFFF; border: 1px solid #F4B2BB; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; width: 100%; box-sizing: border-box; cursor: pointer; transition: background 0.2s ease;";
            
            card.onmouseover = () => card.style.backgroundColor = "#FFF5F5";
            card.onmouseout = () => card.style.backgroundColor = "#FFFFFF";

            card.innerHTML = `
                <div style="background-color: #FBEFEF; min-width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #F5AFAF; border: 1px solid rgba(0,0,0,0.05);">
                    <i class="fa-solid fa-user-group"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700;">${task.title || "Untitled Task"}</h4>
                    <p style="margin: 0; font-size: 12px; color: #555;">${task.description || "No description provided."}</p>
                    <div style="margin-top: 6px; font-size: 11px; color: #888;">
                        <span style="text-transform: capitalize; background: #FBEFEF; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${task.category || 'General'}</span>
                        <span style="text-transform: capitalize; background: #FFF3CD; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${task.priority || 'Normal'} Priority</span>
                        <span>Due: ${task.deadline || "No Date"}</span>
                    </div>
                </div>
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #55CBB2;">${task.status || 'ACCEPTED'}</div>
            `;
            sharedBoardContent.appendChild(card);
        });

        if (acceptedCount === 0) {
            sharedBoardContent.innerHTML = `<p style="text-align: center; color: gray; padding: 20px;">No shared tasks available yet.</p>`;
        }
    });
}

// --- VIEW 2: LOAD INCOMING INVITATIONS ---
function loadIncomingInvitations(userEmail) {
    if (!invitationsList) return;
    
    // Fallback coverage query: reads all documents hitting this recipient's email
    const q = query(collection(db, "notifications"), where("recipientEmail", "==", userEmail));

    onSnapshot(q, (snapshot) => {
        invitationsList.innerHTML = "";
        const pendingInvites = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const currentStatus = data.status ? data.status.toLowerCase().trim() : "pending";
            const currentType = data.type ? data.type.toLowerCase().trim() : "";

            // Accept both 'invitations' and 'invitation' types for seamless safety
            if (currentStatus === 'pending' && (currentType === 'invitations' || currentType === 'invitation')) {
                pendingInvites.push({ id: doc.id, ...data });
            }
        });

        if (pendingInvites.length === 0) {
            invitationsList.innerHTML = `<p style="text-align: center; color: gray; padding: 20px;">No pending invitations found.</p>`;
            return;
        }

        pendingInvites.forEach((notif) => {
            const container = document.createElement("div");
            container.style.cssText = "background: #fff; border: 1px solid #F4B2BB; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 12px;";
            
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background-color: #FBEFEF; min-width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #55CBB2;">
                        <i class="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                        <h4 style="margin:0 0 2px 0; font-size:14px; font-weight:700;">Task Invitation</h4>
                        <p style="margin:0; font-size:12px; color:#555;">${notif.message || 'You have been invited to a shared task.'}</p>
                    </div>
                </div>
                <button class="accept-invite-btn" data-id="${notif.id}" data-taskid="${notif.taskId || ''}" style="padding: 8px 16px; background: #55CBB2; color: white; border: 1px solid #000; border-radius: 8px; font-weight:600; cursor: pointer;">
                    Accept
                </button>
            `;
            invitationsList.appendChild(container);
        });
    });
}

// --- INTERACTION: SEND INVITATION ---
function setupQuickInvite(currentUser) {
    if (!quickInviteBtn) return;
    
    quickInviteBtn.onclick = async () => {
        if (!quickInviteEmail) return;
        
        const emailInput = quickInviteEmail.value.trim().toLowerCase();
        const role = quickInviteRole ? quickInviteRole.value : "Can Edit";

        if (!emailInput) {
            alert("Please provide a valid user email address.");
            return;
        }

        quickInviteBtn.innerText = "Sending...";
        quickInviteBtn.disabled = true;

        try {
            const senderName = currentUser.displayName || currentUser.email.split('@')[0];
            
            // Double-writing type definitions ('invitations') to avoid typos completely
            await addDoc(collection(db, "notifications"), {
                recipientEmail: emailInput,
                userId: null,
                title: "Collab Invitation",
                message: `${senderName} has invited you to collaborate. Role: ${role}.`,
                type: "invitations", 
                status: "pending",
                createdAt: serverTimestamp(),
                taskId: currentTaskContextId 
            });

            alert(`Invitation sent successfully to ${emailInput}!`);
            quickInviteEmail.value = "";
        } catch (err) {
            console.error("Error creating invitation:", err);
            alert("Failed to send invitation.");
        } finally {
            quickInviteBtn.innerText = "Send Invitation";
            quickInviteBtn.disabled = false;
        }
    };
}

// --- GLOBAL CLICK INTERCEPTOR ---
document.addEventListener("click", async (e) => {
    // 1. Task Card Navigation
    const taskCard = e.target.closest(".clickable-task-card");
    if (taskCard) {
        const taskId = taskCard.getAttribute("data-id");
        window.location.href = `task_details.html?id=${taskId}`;
        return;
    }

    // 2. Acceptance Button Clicking
    if (e.target.classList.contains("accept-invite-btn")) {
        const notifId = e.target.getAttribute("data-id");
        const taskId = e.target.getAttribute("data-taskid");
        const userEmail = auth.currentUser.email.toLowerCase().trim();

        try {
            await updateDoc(doc(db, "notifications", notifId), { status: "accepted" });

            if (taskId) {
                await updateDoc(doc(db, "tasks", taskId), { status: "Accepted" });
            } else {
                // Fallback loop targeting structural differences dynamically
                const taskQuery = query(collection(db, "tasks"), where("sharedWith", "==", userEmail));
                const querySnapshot = await getDocs(taskQuery);
                
                for (const taskDoc of querySnapshot.docs) {
                    const currentStatus = taskDoc.data().status ? taskDoc.data().status.toLowerCase().trim() : "";
                    if (currentStatus === "pending") {
                        await updateDoc(doc(db, "tasks", taskDoc.id), { status: "Accepted" });
                    }
                }
            }

            alert("Invitation accepted successfully! It will now appear under your Shared Tasks.");
        } catch (err) {
            console.error(err);
            alert("Error trying to process invitation acceptance updates.");
        }
    }
});
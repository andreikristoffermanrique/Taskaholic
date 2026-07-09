import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => { 
    if (user) {
        const email = user.email.toLowerCase();
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
        viewSharedTasks.style.display = "block";
        viewInvitations.style.display = "none";
    });

    tabInvitations.addEventListener("click", () => {
        tabInvitations.style.backgroundColor = "#F5AFAF";
        tabInvitations.style.fontWeight = "600";
        tabSharedTasks.style.backgroundColor = "#FFFFFF";
        tabSharedTasks.style.fontWeight = "500";
        viewSharedTasks.style.display = "none";
        viewInvitations.style.display = "block";
    });
}

// --- VIEW 1: LOAD COLLABORATING TASKS ---
function loadSharedTasks(userEmail) {
    const q = query(collection(db, "tasks"), where("sharedWith", "==", userEmail));

    onSnapshot(q, (snapshot) => {
        if (!sharedBoardContent) return;
        sharedBoardContent.innerHTML = "";

        if (snapshot.empty) {
            sharedBoardContent.innerHTML = `<p style="text-align: center; color: gray; padding: 20px;">No shared tasks available yet.</p>`;
            return;
        }

        snapshot.forEach((doc) => {
            const task = doc.data();
            const card = document.createElement("div");
            
            // Assign class identifier and data-id metadata attribute for routing links
            card.classList.add("clickable-task-card");
            card.setAttribute("data-id", doc.id);
            
            // Interactive UI styling
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
                        <span style="text-transform: capitalize; background: #FFF3CD; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${task.priority} Priority</span>
                        <span>Due: ${task.deadline || "No Date"}</span>
                    </div>
                </div>
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #F5AFAF;">${task.status}</div>
            `;
            sharedBoardContent.appendChild(card);
        });
    });
}

// --- VIEW 2: LOAD INCOMING INVITATIONS ---
function loadIncomingInvitations(userEmail) {
    const q = query(collection(db, "notifications"), where("recipientEmail", "==", userEmail), where("type", "==", "invitations"));

    onSnapshot(q, (snapshot) => {
        if (!invitationsList) return;
        invitationsList.innerHTML = "";

        const pendingInvites = [];
        snapshot.forEach(doc => {
            if (doc.data().status === 'pending' || !doc.data().status) {
                pendingInvites.push({ id: doc.id, ...doc.data() });
            }
        });

        if (pendingInvites.length === 0) {
            invitationsList.innerHTML = `<p style="text-align: center; color: gray; padding: 20px;">No pending invitations found.</p>`;
            return;
        }

        pendingInvites.forEach((notif) => {
            const container = document.createElement("div");
            container.style.cssText = "background: #fff; border: 1px solid #F4B2BB; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.02);";
            
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background-color: #FBEFEF; min-width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #55CBB2;">
                        <i class="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                        <h4 style="margin:0 0 2px 0; font-size:14px; font-weight:700;">${notif.title}</h4>
                        <p style="margin:0; font-size:12px; color:#555;">${notif.message}</p>
                    </div>
                </div>
                <button class="accept-invite-btn" data-id="${notif.id}" style="padding: 8px 16px; background: #55CBB2; color: white; border: 1px solid #000; border-radius: 8px; font-weight:600; cursor: pointer;">
                    Accept
                </button>
            `;
            invitationsList.appendChild(container);
        });
    });
}

// --- INTERACTION: QUICK INVITE PANELS FORM ---
function setupQuickInvite(currentUser) {
    if (!quickInviteBtn) return;
    
    quickInviteBtn.onclick = async () => {
        const emailInput = quickInviteEmail.value.trim().toLowerCase();
        const role = quickInviteRole.value;

        if (!emailInput) {
            alert("Please provide a valid user email address.");
            return;
        }

        quickInviteBtn.innerText = "Sending...";
        quickInviteBtn.disabled = true;

        try {
            const senderName = currentUser.displayName || currentUser.email.split('@')[0];
            await addDoc(collection(db, "notifications"), {
                recipientEmail: emailInput,
                userId: null,
                title: "Collab Invitation",
                message: `${senderName} invited you to collaborate as a worker tracking roles (${role}).`,
                type: "invitations",
                status: "pending",
                createdAt: serverTimestamp()
            });

            alert(`Invitation sent successfully to ${emailInput}!`);
            quickInviteEmail.value = "";
        } catch (err) {
            console.error(err);
            alert("Failed to submit invitation module.");
        } finally {
            quickInviteBtn.innerText = "Send Invitation";
            quickInviteBtn.disabled = false;
        }
    };
}

// --- GLOBAL EVENT LISTENERS FOR CLICKS ---
document.addEventListener("click", async (e) => {
    // 1. Task Card Redirection Event
    const taskCard = e.target.closest(".clickable-task-card");
    if (taskCard) {
        const taskId = taskCard.getAttribute("data-id");
        window.location.href = `task_details.html?id=${taskId}`;
        return;
    }

    // 2. Acceptance Button Event
    if (e.target.classList.contains("accept-invite-btn")) {
        const id = e.target.getAttribute("data-id");
        try {
            await updateDoc(doc(db, "notifications", id), { status: "accepted" });
            alert("Invitation accepted successfully!");
        } catch (err) {
            alert("Error trying to process invitation document acceptance.");
        }
    }
});
import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// --- 1. Element Selectors ---
const emailInput = document.getElementById("quickInviteEmail");
const roleSelect = document.getElementById("quickInviteRole");
const inviteBtn = document.getElementById("quickInviteBtn");

const tabShared = document.getElementById("tabSharedTasks");
const tabInvites = document.getElementById("tabInvitations");
const viewShared = document.getElementById("view-shared-tasks");
const viewInvites = document.getElementById("view-invitations");
const invitesList = document.getElementById("invitations-list");

let currentUser = null;

// --- 2. Auth State ---
onAuthStateChanged(auth, (user) => { 
    if (user) {
        currentUser = user;
    } else {
        window.location.href = "login.html";
    }
});

// --- 3. Invitation Sender Logic ---
if (inviteBtn) {
    inviteBtn.addEventListener("click", async () => {
        const inviteEmail = emailInput.value.trim().toLowerCase();
        const role = roleSelect.options[roleSelect.selectedIndex].text; 

        if (!inviteEmail) { alert("Please enter an email address."); return; }
        if (!currentUser) { alert("You must be logged in."); return; }
        if (inviteEmail === currentUser.email) { alert("You cannot invite yourself!"); return; }

        const originalText = inviteBtn.textContent;
        inviteBtn.textContent = "Sending...";
        inviteBtn.disabled = true;

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", inviteEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("No user found with that email.");
            } else {
                let invitedUserId = querySnapshot.docs[0].id;

                await addDoc(collection(db, "notifications"), {
                    userId: invitedUserId,
                    senderEmail: currentUser.email,
                    type: "invitations",
                    title: "Collaboration Invite",
                    message: `${currentUser.email} has invited you to collaborate. Role: ${role}.`,
                    role: role,
                    status: "pending",
                    timestamp: new Date().toISOString()
                });
                alert("Invitation sent successfully!");
                emailInput.value = "";
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred.");
        } finally {
            inviteBtn.textContent = originalText;
            inviteBtn.disabled = false;
        }
    });
}

// --- 4. Tab Switching Logic ---
if (tabShared && tabInvites) {
    tabShared.addEventListener("click", () => {
        tabShared.classList.add("active");
        tabInvites.classList.remove("active");
        viewShared.style.display = "block";
        viewInvites.style.display = "none";
    });

    tabInvites.addEventListener("click", () => {
        tabInvites.classList.add("active");
        tabShared.classList.remove("active");
        viewShared.style.display = "none";
        viewInvites.style.display = "block";
        
        if (currentUser) loadPendingInvitations(currentUser.uid);
    });
}

// --- 5. Loader for Pending Invitations Tab ---
async function loadPendingInvitations(uid) {
    if (!invitesList) return;
    invitesList.innerHTML = "<p>Checking for invitations...</p>";

    try {
        const q = query(
            collection(db, "notifications"), 
            where("userId", "==", uid),
            where("type", "==", "invitations"),
            where("status", "==", "pending")
        );
        
        const querySnapshot = await getDocs(q);
        invitesList.innerHTML = ""; 

        if (querySnapshot.empty) {
            invitesList.innerHTML = "<p style='color: gray; text-align: center; margin-top: 20px;'>You have no pending invitations.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const invite = docSnap.data();
            const card = document.createElement("div");
            card.style.cssText = "border: 1px solid #F4B2BB; border-radius: 8px; padding: 15px; background: #fff; display: flex; justify-content: space-between; align-items: center;";
            card.innerHTML = `
                <div>
                    <h4 style="margin: 0 0 5px 0;">Project Invitation</h4>
                    <p style="margin: 0; font-size: 14px; color: #555;">From: <strong>${invite.senderEmail}</strong> (Role: ${invite.role})</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="accept-btn" data-id="${docSnap.id}" style="padding: 6px 12px; background: #54CBB2; color: white; border: none; border-radius: 5px; cursor: pointer;">Accept</button>
                    <button class="decline-btn" data-id="${docSnap.id}" style="padding: 6px 12px; background: #EAA196; color: white; border: none; border-radius: 5px; cursor: pointer;">Decline</button>
                </div>
            `;
            invitesList.appendChild(card);
        });

        // Add event listener for Accept/Decline
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await updateDoc(doc(db, "notifications", id), { status: "accepted" });
                alert("Invitation accepted!");
                loadPendingInvitations(uid); // Refresh list
            });
        });
    } catch (error) {
        console.error("Error loading invites:", error);
    }
}
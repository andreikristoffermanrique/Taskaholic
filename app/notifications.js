import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const notificationsContainer = document.getElementById("notifications-feed"); 
const filterButtons = document.querySelectorAll(".filter-btn");

let allNotifications = []; 

function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; 
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0]; 
}

onAuthStateChanged(auth, async (user) => { 
    if (user) {
        loadNotifications(user);
    } else {
        window.location.href = "login.html";
    }
});

async function loadNotifications(user) {
    if (notificationsContainer) {
        notificationsContainer.innerHTML = "<p style='text-align: center;'>Loading notifications...</p>";
    }

    try {
        allNotifications = []; 
        const uid = user.uid;
        const userEmail = user.email ? user.email.toLowerCase() : "";

        let prefs = { taskDue: true, sharedDue: true, invites: true, announcements: true }; 
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && userDocSnap.data().notificationPrefs) {
            prefs = userDocSnap.data().notificationPrefs;
        }

        // QUERY 1: Load invitations sent to this user's email
        if (userEmail) {
            const inviteQuery = query(collection(db, "notifications"), where("recipientEmail", "==", userEmail));
            const inviteSnapshot = await getDocs(inviteQuery);
            inviteSnapshot.forEach((doc) => {
                const notifData = doc.data();
                if (prefs.invites === false || notifData.status === 'accepted') return;
                allNotifications.push({ id: doc.id, ...notifData });
            });
        }

        // QUERY 2: Load personal notifications matched by User ID
        const personalQuery = query(collection(db, "notifications"), where("userId", "==", uid));
        const personalSnapshot = await getDocs(personalQuery);
        personalSnapshot.forEach((doc) => {
            const notifData = doc.data();
            if (notifData.type === 'announcements' && prefs.announcements === false) return;
            allNotifications.push({ id: doc.id, ...notifData });
        });

        // REMINDERS: Due tomorrow
        if (prefs.taskDue !== false) {
            const tomorrowStr = getTomorrowDateString();
            const tasksQuery = query(collection(db, "tasks"), where("userId", "==", uid), where("deadline", "==", tomorrowStr));
            const tasksSnapshot = await getDocs(tasksQuery);
            tasksSnapshot.forEach((doc) => {
                const task = doc.data();
                if (task.status !== "completed" && task.status !== "Completed") {
                    allNotifications.push({
                        id: `reminder-${doc.id}`, 
                        title: `Due Tomorrow: ${task.title}`,
                        message: `Don't forget to submit this ${task.category || 'task'} by the end of the day.`,
                        type: 'reminders',
                        icon: 'fa-calendar-day',
                        iconColor: '#EED663',
                        time: 'Tomorrow'
                    });
                }
            });
        }

        // REMINDERS: Overdue
        if (prefs.taskDue !== false) {
            const todayStr = getTodayDateString();
            const overdueQuery = query(collection(db, "tasks"), where("userId", "==", uid), where("deadline", "<", todayStr));
            const overdueSnapshot = await getDocs(overdueQuery);
            overdueSnapshot.forEach((doc) => {
                const task = doc.data();
                if (task.status !== "completed" && task.status !== "Completed") {
                    allNotifications.push({
                        id: `overdue-${doc.id}`, 
                        title: `Overdue Alert: ${task.title}`,
                        message: `This task was due on ${task.deadline}. Please update its status!`,
                        type: 'updates',
                        icon: 'fa-triangle-exclamation',
                        iconColor: '#EAA196',
                        time: 'Overdue'
                    });
                }
            });
        }

        renderFeed('all');
    } catch (error) {
        console.error("Error loading notifications: ", error);
        if (notificationsContainer) notificationsContainer.innerHTML = "<p style='text-align: center; color: red;'>Error loading notifications.</p>";
    }
}

function renderFeed(filterType) {
    if (!notificationsContainer) return;
    notificationsContainer.innerHTML = ''; 
    const normalizedFilter = filterType.toLowerCase();
    const filtered = normalizedFilter === 'all' ? allNotifications : allNotifications.filter(n => n.type && n.type.toLowerCase() === normalizedFilter);

    if (filtered.length === 0) {
        notificationsContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #888; font-size: 14px; border: 1px dashed #F4B2BB; border-radius: 12px;"><i class="fa-regular fa-bell-slash" style="font-size: 24px; margin-bottom: 10px; color: #F5AFAF;"></i><br>You have no ${normalizedFilter === 'all' ? 'new' : normalizedFilter} notifications.</div>`;
        return;
    }

    filtered.forEach(notif => {
        const iconClass = notif.icon || (notif.type === 'invitations' ? 'fa-user-plus' : 'fa-bell');
        const iColor = notif.iconColor || '#F5AFAF';
        const notifTime = notif.time || 'New';

        notificationsContainer.innerHTML += `
            <div style="background-color: #FFFFFF; border: 1px solid #F4B2BB; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; margin-bottom: 15px;">
                <div style="background-color: #FBEFEF; min-width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${iColor}; border: 1px solid rgba(0,0,0,0.05);">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700;">${notif.title}</h4>
                    <p style="margin: 0; font-size: 12px; color: #555;">${notif.message}</p>
                    ${notif.type === 'invitations' ? `<button class="accept-btn" data-id="${notif.id}" style="margin-top:8px; padding: 4px 12px; background: #55CBB2; color: white; border: none; border-radius: 5px; cursor: pointer;">Accept</button>` : ''}
                </div>
                <div style="font-size: 11px; color: #888;">${notifTime}</div>
            </div>
        `;
    });
}

// Handle "Accept" Click
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('accept-btn')) {
        const id = e.target.getAttribute('data-id');
        try {
            await updateDoc(doc(db, "notifications", id), { status: "accepted" });
            alert("Invitation accepted!");
            loadNotifications(auth.currentUser);
        } catch (err) { alert("Error accepting invitation."); }
    }
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.style.backgroundColor = '#FFFFFF');
        e.target.style.backgroundColor = '#F5AFAF';
        renderFeed(e.target.textContent.trim());
    });
});
import { auth, db } from "./firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const notificationsContainer = document.getElementById("notifications-feed"); 
const filterButtons = document.querySelectorAll(".filter-btn");

let allNotifications = []; 

// Helper for Reminders (Due Tomorrow)
function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; 
}

// Helper for Overdue Tasks (Past Due)
function getTodayDateString() {
    return new Date().toISOString().split('T')[0]; 
}

onAuthStateChanged(auth, async (user) => { 
    if (user) {
        loadNotifications(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

async function loadNotifications(uid) {
    if (notificationsContainer) {
        notificationsContainer.innerHTML = "<p style='text-align: center;'>Loading notifications...</p>";
    }

    try {
        allNotifications = []; 

        // 1. Fetch Standard Notifications
        const notifQuery = query(collection(db, "notifications"), where("userId", "==", uid));
        const notifSnapshot = await getDocs(notifQuery);
        
        notifSnapshot.forEach((doc) => {
            allNotifications.push({ id: doc.id, ...doc.data() });
        });

        // 2. Fetch Tasks Due Tomorrow for Automatic Reminders
        const tomorrowStr = getTomorrowDateString();
        const tasksQuery = query(collection(db, "tasks"), 
            where("userId", "==", uid),
            where("deadline", "==", tomorrowStr)
        );
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
                    iconColor: '#EED663', // Yellow
                    time: 'Tomorrow'
                });
            }
        });

        // 3. Fetch Overdue Tasks (Alerts)
        const todayStr = getTodayDateString();
        const overdueQuery = query(collection(db, "tasks"), 
            where("userId", "==", uid),
            where("deadline", "<", todayStr) // Find all tasks with dates in the past
        );
        const overdueSnapshot = await getDocs(overdueQuery);

        overdueSnapshot.forEach((doc) => {
            const task = doc.data();
            
            // Only alert if the past-due task is NOT completed
            if (task.status !== "completed" && task.status !== "Completed") {
                allNotifications.push({
                    id: `overdue-${doc.id}`, 
                    title: `Overdue Alert: ${task.title}`,
                    message: `This task was due on ${task.deadline}. Please update its status!`,
                    type: 'updates', // Places it under the "Updates" filter tab
                    icon: 'fa-triangle-exclamation',
                    iconColor: '#EAA196', // Salmon/Red color
                    time: 'Overdue'
                });
            }
        });

        // Finally, render everything to the screen
        renderFeed('all');

    } catch (error) {
        console.error("Error loading notifications: ", error);
        if (notificationsContainer) {
            notificationsContainer.innerHTML = "<p style='text-align: center; color: red;'>Error loading notifications.</p>";
        }
    }
}

function renderFeed(filterType) {
    if (!notificationsContainer) return;
    notificationsContainer.innerHTML = ''; 
    
    // Support both lowercase filters ('all') and display text ('All')
    const normalizedFilter = filterType.toLowerCase();
    
    const filtered = normalizedFilter === 'all' 
        ? allNotifications 
        : allNotifications.filter(n => n.type && n.type.toLowerCase() === normalizedFilter);

    // EMPTY STATE
    if (filtered.length === 0) {
        notificationsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888; font-size: 14px; border: 1px dashed #F4B2BB; border-radius: 12px;">
                <i class="fa-regular fa-bell-slash" style="font-size: 24px; margin-bottom: 10px; color: #F5AFAF;"></i><br>
                You have no ${normalizedFilter === 'all' ? 'new' : normalizedFilter} notifications right now.
            </div>
        `;
        return;
    }

    // NOTIFICATION CARDS
    filtered.forEach(notif => {
        // Fallback icons just in case it's a standard notification without an icon set
        const iconClass = notif.icon || (notif.type === 'invitations' ? 'fa-user-plus' : 'fa-bell');
        const iColor = notif.iconColor || '#F5AFAF';
        const notifTime = notif.time || 'New';

        notificationsContainer.innerHTML += `
            <div style="background-color: #FFFFFF; border: 1px solid #F4B2BB; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; transition: transform 0.2s; cursor: pointer; margin-bottom: 15px;">
                <div style="background-color: #FBEFEF; min-width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${iColor}; font-size: 16px; border: 1px solid rgba(0,0,0,0.05);">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #000000;">${notif.title}</h4>
                    <p style="margin: 0; font-size: 12px; color: #555555;">${notif.message}</p>
                    
                    ${notif.type === 'invitations' ? `
                        <div style="margin-top: 8px;">
                            <button class="accept-btn" data-id="${notif.id}" style="padding: 4px 12px; background: #F5AFAF; color: white; font-weight: bold; border: none; border-radius: 5px; cursor: pointer;">Accept Invitation</button>
                        </div>
                    ` : ''}
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #888888; white-space: nowrap;">
                    ${notifTime}
                </div>
            </div>
        `;
    });
}

// 4. Handle Filter Button Clicks
filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset all buttons to inactive style
        filterButtons.forEach(b => {
            b.style.backgroundColor = '#FFFFFF';
            b.style.fontWeight = '500';
            b.classList.remove('active');
        });
        
        // Set clicked button to active style
        e.target.style.backgroundColor = '#F5AFAF';
        e.target.style.fontWeight = '600';
        e.target.classList.add('active');

        // Render the filtered feed
        const filterValue = e.target.textContent.trim();
        renderFeed(filterValue);
    });
});
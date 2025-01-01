// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA973XL9wV_FNXLmbwFGwhg00O3SJmJj1E",
    authDomain: "letmeshowyouthis-42d37.firebaseapp.com",
    databaseURL: "https://letmeshowyouthis-42d37-default-rtdb.firebaseio.com",
    projectId: "letmeshowyouthis-42d37",
    storageBucket: "letmeshowyouthis-42d37.firebasestorage.app",
    messagingSenderId: "518467169936",
    appId: "1:518467169936:web:f701130cba79b926273215",
    measurementId: "G-PPFE0F696B"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase initialized");

// Add this at the top of your file after Firebase initialization
let lastActiveTime = Date.now();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible
        const timeAway = Date.now() - lastActiveTime;
        // If the page was hidden for more than 1 second, refresh
        if (timeAway > 1000) {
            console.log("Page was hidden for too long, refreshing...");
            window.location.reload();
        }
    } else {
        // Page is being hidden
        lastActiveTime = Date.now();
    }
});

// Version tracking function
function updateVersionInfo() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };
    const timeString = now.toLocaleString('en-US', options);
    document.getElementById('versionInfo').textContent = `Version: ${timeString}`;
}

// Call it when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateVersionInfo();
});

let currentRoom = null;
let messageListener = null;

// DOM Elements
const roomSelection = document.getElementById('roomSelection');
const chatInterface = document.getElementById('chatInterface');
const roomInput = document.getElementById('roomInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const leaveRoomButton = document.getElementById('leaveRoomButton');
const roomInfo = document.getElementById('roomInfo');
const textarea = document.getElementById('myTextarea');
const messageContainer = document.getElementById('messageContainer');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');

// Add console logs to debug
console.log("Elements found:", {
    roomSelection, chatInterface, roomInput, joinRoomButton
});

// Join Room
joinRoomButton.addEventListener('click', () => {
    console.log("Join button clicked");
    const roomNumber = roomInput.value.trim();
    console.log("Room number:", roomNumber);
    if (roomNumber) {
        joinRoom(roomNumber);
    }
});

// Also join room when pressing Enter in the room input
roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        console.log("Enter pressed in room input");
        const roomNumber = roomInput.value.trim();
        if (roomNumber) {
            joinRoom(roomNumber);
        }
    }
});

// Add these helper functions at the top of your file
function setupPresenceHandling(userRef, roomNumber) {
    // Create a presence reference
    const presenceRef = database.ref('.info/connected');
    
    presenceRef.on('value', (snapshot) => {
        if (snapshot.val()) {
            // Client is connected
            console.log("Client connected");
            
            // Remove presence on disconnect
            userRef.onDisconnect().remove();
            
            // Set presence
            userRef.set(true);
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log("Page hidden");
            userRef.remove();
        } else {
            console.log("Page visible");
            // Force rejoin if we have a current room
            if (currentRoom) {
                console.log("Rejoining room after visibility change");
                joinRoom(currentRoom);
            }
        }
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
        userRef.remove();
    });
}

// Function to update room info
function updateRoomInfo(roomNumber, userCount) {
    const roomInfo = document.getElementById('roomInfo');
    
    if (!roomInfo.querySelector('.room-number')) {
        roomInfo.innerHTML = `
            <div class="room-number">Room ${roomNumber}</div>
            <div class="user-count">${userCount} user${userCount !== 1 ? 's' : ''} online</div>
        `;
    } else {
        const userCountElement = roomInfo.querySelector('.user-count');
        userCountElement.style.opacity = '0';
        
        setTimeout(() => {
            userCountElement.textContent = `${userCount} user${userCount !== 1 ? 's' : ''} online`;
            userCountElement.style.opacity = '1';
        }, 1000);
    }
}

// Use this function when updating room count
function updateRoomCount(roomNumber) {
    const roomRef = database.ref(`rooms/${roomNumber}`);
    const userRef = roomRef.child('users').push(true);
    
    roomRef.child('users').on('value', (snapshot) => {
        const userCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        updateRoomInfo(roomNumber, userCount);
    });
    
    return userRef;
}

let currentUserRef = null; // Add this with your other global variables

// Modify your joinRoom function
function joinRoom(roomNumber) {
    console.log("Joining room:", roomNumber);
    currentRoom = roomNumber;
    
    // Get elements
    const roomSelection = document.getElementById('roomSelection');
    const chatInterface = document.getElementById('chatInterface');
    
    // Set up chat interface before showing it
    chatInterface.style.display = 'block';
    
    // Small delay to ensure elements are positioned
    setTimeout(() => {
        roomSelection.style.display = 'none';
        chatInterface.classList.add('visible');
    }, 0);
    
    // Add user to room and track presence
    currentUserRef = updateRoomCount(roomNumber);
    
    // Clear previous messages display
    messageContainer.innerHTML = '';
    
    // Remove previous listener if exists
    if (messageListener) {
        database.ref(`rooms/${currentRoom}/messages`).off('child_added', messageListener);
    }
    
    // Listen for messages in this room
    messageListener = database.ref(`rooms/${currentRoom}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToContainer(message.text);
    });

    document.body.classList.add('in-chat');
}

// Make sure chatInterface is hidden initially
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chatInterface').style.display = 'none';
});

// Leave Room
leaveRoomButton.addEventListener('click', () => {
    leaveRoom();
});

// Add this function to check and clear empty rooms
function checkAndClearEmptyRoom(roomNumber) {
    const roomRef = database.ref(`rooms/${roomNumber}`);
    
    return roomRef.child('users').once('value')
        .then(snapshot => {
            // If no users in room
            if (!snapshot.exists() || snapshot.val() === 0) {
                console.log("Room is empty, clearing messages");
                // Delete all messages
                return roomRef.child('messages').remove()
                    .then(() => {
                        console.log("Messages cleared from empty room");
                    })
                    .catch(error => {
                        console.error("Error clearing messages:", error);
                    });
            }
        });
}

// Modify your leaveRoom function
function leaveRoom() {
    const roomToCheck = currentRoom;
    
    if (messageListener) {
        database.ref(`rooms/${roomToCheck}/messages`).off('child_added', messageListener);
        messageListener = null;
    }
    
    // Remove user from room
    if (currentUserRef) {
        currentUserRef.remove()
            .then(() => {
                console.log("User removed from room");
                return new Promise(resolve => setTimeout(resolve, 500));
            })
            .then(() => {
                return checkAndClearEmptyRoom(roomToCheck);
            })
            .catch(error => console.error("Error in leaveRoom:", error));
    }
    
    // Clear all stored data
    currentRoom = null;
    currentUserRef = null;
    messageContainer.innerHTML = '';
    
    // Switch back to room selection with proper styling
    document.getElementById('chatInterface').style.display = 'none';
    document.getElementById('roomSelection').style.display = 'flex';
    document.body.classList.remove('in-chat');
    document.getElementById('roomInput').value = '';
}

function sendMessage() {
    const message = textarea.value;
    if (message.trim() !== '' && currentRoom) {
        // Save message to Firebase under the current room
        database.ref(`rooms/${currentRoom}/messages`).push({
            text: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => console.log("Message saved to Firebase"))
        .catch(error => console.error("Error saving message:", error));
        
        textarea.value = '';
    }
}

// Send button click handler
sendButton.addEventListener('click', sendMessage);

// Enter key handler
textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Clear button click handler
clearButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
        // Clear Firebase database for current room
        database.ref(`rooms/${currentRoom}/messages`).remove()
            .then(() => {
                console.log("Messages cleared from Firebase");
                messageContainer.innerHTML = '';
            })
            .catch(error => console.error("Error clearing messages:", error));
    }
});

function addMessageToContainer(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.textContent = message;
    messageContainer.insertBefore(messageDiv, messageContainer.firstChild);
}

// When updating user count
function updateUserCount(count) {
    const userCountElement = document.querySelector('#roomInfo .user-count');
    if (userCountElement) {
        userCountElement.style.opacity = '0';
        setTimeout(() => {
            userCountElement.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
            userCountElement.style.opacity = '1';
        }, 500);
    }
}

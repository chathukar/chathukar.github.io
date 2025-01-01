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

// Modify your updateRoomCount function
function updateRoomCount(roomNumber) {
    const roomRef = database.ref(`rooms/${roomNumber}/users`);
    
    // Add this user to the room
    const userRef = roomRef.push(true);

    // Setup presence handling
    setupPresenceHandling(userRef, roomNumber);

    // Listen for changes in user count
    roomRef.on('value', (snapshot) => {
        const userCount = snapshot.numChildren();
        roomInfo.textContent = `Room: ${roomNumber} (${userCount} user${userCount !== 1 ? 's' : ''} online)`;
    });

    return userRef;
}

let currentUserRef = null; // Add this with your other global variables

// Modify your joinRoom function
function joinRoom(roomNumber) {
    console.log("Joining room:", roomNumber);
    
    // Remove existing user reference if it exists
    if (currentUserRef) {
        currentUserRef.remove();
    }
    
    currentRoom = roomNumber;
    
    // Switch interfaces
    roomSelection.style.display = 'none';
    chatInterface.style.display = 'block';
    
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
}

// Leave Room
leaveRoomButton.addEventListener('click', () => {
    leaveRoom();
});

// Add this function to check and clear empty rooms
function checkAndClearEmptyRoom(roomNumber) {
    console.log("Checking if room is empty:", roomNumber);
    const roomRef = database.ref(`rooms/${roomNumber}`);
    
    return roomRef.child('users').once('value')
        .then((snapshot) => {
            console.log("Users in room:", snapshot.numChildren());
            if (!snapshot.exists() || snapshot.numChildren() === 0) {
                console.log("Room is empty, clearing messages");
                // Clear messages from Firebase
                return roomRef.child('messages').remove()
                    .then(() => {
                        console.log("Messages cleared successfully");
                        // Clear messages from all connected clients
                        messageContainer.innerHTML = '';
                        // Remove the message listener
                        if (messageListener) {
                            roomRef.child('messages').off('child_added', messageListener);
                            messageListener = null;
                        }
                    });
            }
        })
        .catch(error => console.error("Error in checkAndClearEmptyRoom:", error));
}

// Modify your leaveRoom function
function leaveRoom() {
    const roomToCheck = currentRoom; // Store room number before clearing currentRoom
    
    if (messageListener) {
        database.ref(`rooms/${roomToCheck}/messages`).off('child_added', messageListener);
        messageListener = null;
    }
    
    // Remove user from room
    if (currentUserRef) {
        currentUserRef.remove()
            .then(() => {
                console.log("User removed from room");
                // Wait a moment for Firebase to update
                return new Promise(resolve => setTimeout(resolve, 500));
            })
            .then(() => {
                // Check if room is empty after user leaves
                return checkAndClearEmptyRoom(roomToCheck);
            })
            .catch(error => console.error("Error in leaveRoom:", error));
    }
    
    currentRoom = null;
    currentUserRef = null;
    
    // Switch back to room selection
    chatInterface.style.display = 'none';
    roomSelection.style.display = 'block';
    roomInput.value = '';
    messageContainer.innerHTML = '';
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

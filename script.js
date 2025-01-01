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

function joinRoom(roomNumber) {
    console.log("Joining room:", roomNumber);
    currentRoom = roomNumber;
    
    // Switch interfaces
    roomSelection.style.display = 'none';
    chatInterface.style.display = 'block';
    roomInfo.textContent = `Room: ${roomNumber}`;
    
    // Clear previous messages
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

function leaveRoom() {
    if (messageListener) {
        database.ref(`rooms/${currentRoom}/messages`).off('child_added', messageListener);
    }
    currentRoom = null;
    messageListener = null;
    
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

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

//Chathu
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

// Wrap DOM-dependent code in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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
        const builderVersion = "4";
        document.getElementById('versionInfo').textContent = `Version: ${timeString} (Builder ${builderVersion})`;
    }

    // Call version update
    updateVersionInfo();

    // Initialize DOM elements
    const roomSelection = document.getElementById('roomSelection');
    const chatInterface = document.getElementById('chatInterface');
    const roomInput = document.getElementById('roomInput');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const leaveRoomButton = document.getElementById('leaveButton');
    const roomInfo = document.getElementById('roomInfo');
    const textarea = document.getElementById('myTextarea');
    const messageContainer = document.getElementById('messageContainer');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');

    // Add console logs to debug
    console.log("Elements found:", {
        roomSelection, chatInterface, roomInput, joinRoomButton
    });

    // Make sure chatInterface is hidden initially
    chatInterface.style.display = 'none';

    // Add your event listeners here
    joinRoomButton.addEventListener('click', function() {
        const roomNumber = roomInput.value.trim();
        if (roomNumber) {
            joinRoom(roomNumber);
        }
    });

    // Add event listeners for all buttons
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearHistory);
    leaveRoomButton.addEventListener('click', leaveRoom);

    // Add these functions if they don't exist
    function sendMessage() {
        const message = textarea.value.trim();
        if (message) {
            // Get a reference to the messages in the current room
            const messagesRef = firebase.database().ref('rooms/' + currentRoom + '/messages');
            
            // Push the new message to Firebase
            messagesRef.push({
                text: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // Clear the textarea
            textarea.value = '';
        }
    }

    function clearHistory() {
        // Clear the message container
        messageContainer.innerHTML = '';
        
        // Clear messages in Firebase for current room
        const messagesRef = firebase.database().ref('rooms/' + currentRoom + '/messages');
        messagesRef.remove();
    }

    function leaveRoom() {
        if (currentRoom) {
            // Remove message listeners for the current room
            const messagesRef = firebase.database().ref('rooms/' + currentRoom + '/messages');
            messagesRef.off(); // Remove all listeners
            
            // Remove presence
            if (currentUserRef) {
                currentUserRef.remove();
                currentUserRef = null;
                
                // Add this line to check and clear room after user leaves
                checkAndClearEmptyRoom(currentRoom);
            }
            
            // Reset the room
            currentRoom = null;
            
            // Hide chat interface
            chatInterface.style.display = 'none';
            chatInterface.classList.remove('visible');
            
            // Show room selection
            roomSelection.style.display = 'flex';
            
            // Clear the input
            roomInput.value = '';
            
            // Clear the message container
            messageContainer.innerHTML = '';
            
            // Remove in-chat class from body
            document.body.classList.remove('in-chat');
            
            console.log("Left room successfully");
        }
        currentRoomNumber = null;  // Reset room number when leaving
    }

    // Listen for messages in the current room
    function listenToMessages(roomNumber) {
        const messagesRef = firebase.database().ref('rooms/' + roomNumber + '/messages');
        
        messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.textContent = message.text;
            messageContainer.insertBefore(messageElement, messageContainer.firstChild);
        });
    }

    // Add this to your joinRoom function
    function joinRoom(roomNumber) {
        console.log("Joining room:", roomNumber);
        currentRoom = roomNumber;
        currentRoomNumber = roomNumber;
        
        // Hide room selection and show chat interface
        roomSelection.style.display = 'none';
        chatInterface.style.display = 'block';
        
        // Add in-chat class to body
        document.body.classList.add('in-chat');
        
        // Setup presence handling and update room count
        currentUserRef = updateRoomCount(roomNumber);
        setupPresenceHandling(currentUserRef, roomNumber);
        
        // Start listening to messages
        listenToMessages(roomNumber);
        
        // Move the animation trigger to the end
        setTimeout(() => {
            chatInterface.classList.add('visible');
            updateRoomInfo(roomNumber, 1);
        }, 100); // Increased delay to 100ms
    }

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

    // Optional: Add enter key support for sending messages
    textarea.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Add this inside your DOMContentLoaded event listener
    textarea.addEventListener('input', function() {
        // Reset height to auto to get the correct scrollHeight
        this.style.height = 'auto';
        // Set the height to match the content
        this.style.height = this.scrollHeight + 'px';
    });

    // Function to update room info
    function updateRoomInfo(roomNumber, userCount) {
        console.log(`Entering updateRoomInfo for room ${roomNumber}, user count ${userCount}`);

        const roomInfo = document.getElementById('roomInfo');

        console.log("Found roomInfo element, attempting to set innerHTML.");

        if (currentRoomNumber !== roomNumber) {
            // Room changed - update everything with animation
            roomInfo.innerHTML = `
                <div class="room-number">Room ${roomNumber}</div>
                <div class="user-count">${userCount} user${userCount !== 1 ? 's' : ''} online</div>
            `;
            currentRoomNumber = roomNumber;
            console.log(`Set roomInfo innerHTML for room ${roomNumber} with ${userCount} users.`);
        } else {
            // Same room - just update user count
            const userCountElement = roomInfo.querySelector('.user-count');
            if (userCountElement) {
                userCountElement.textContent = `${userCount} user${userCount !== 1 ? 's' : ''} online`;
                console.log(`Updated user count in room ${roomNumber} to ${userCount}.`);
            }
        }
         console.log("Exiting updateRoomInfo.");
    }
});

let currentRoom = null;
let messageListener = null;
let currentRoomNumber = null;  // Add this line

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
            if (currentRoom && currentUserRef) {
                currentUserRef.remove();
                checkAndClearEmptyRoom(currentRoom);
            }
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

// Use this function when updating room count
function updateRoomCount(roomNumber) {
    console.log("Updating room count for room:", roomNumber);
    const roomRef = database.ref(`rooms/${roomNumber}`);
    const userRef = roomRef.child('users').push(true);
    
    userRef.onDisconnect().remove();
    
    // Add listener for room users
    roomRef.child('users').on('value', (snapshot) => {
        console.log("Room users snapshot:", snapshot.val());
        const userCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        console.log("User count:", userCount);
        updateRoomInfo(roomNumber, userCount);
    });
    
    return userRef;
}

let currentUserRef = null; // Add this with your other global variables

// Add this function to check and clear empty rooms
function checkAndClearEmptyRoom(roomNumber) {
    console.log("Checking if room is empty:", roomNumber);
    const roomRef = firebase.database().ref(`rooms/${roomNumber}`);
    
    roomRef.child('users').once('value')
        .then(snapshot => {
            // If no users in room or users node doesn't exist
            if (!snapshot.exists()) {
                console.log("Room is empty, clearing messages");
                // Delete all messages
                return roomRef.child('messages').remove()
                    .then(() => {
                        console.log("Messages cleared from empty room");
                    })
                    .catch(error => {
                        console.error("Error clearing messages:", error);
                    });
            } else {
                const users = snapshot.val();
                if (!users || Object.keys(users).length === 0) {
                    console.log("Room is empty (no users), clearing messages");
                    return roomRef.child('messages').remove()
                        .then(() => {
                            console.log("Messages cleared from empty room");
                        })
                        .catch(error => {
                            console.error("Error clearing messages:", error);
                        });
                }
            }
        });
}

// Add this function to handle tab/window closing
window.addEventListener('beforeunload', function() {
    if (currentRoom && currentUserRef) {
        currentUserRef.remove();
        checkAndClearEmptyRoom(currentRoom);
    }
});

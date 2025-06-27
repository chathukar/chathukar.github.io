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

// Constants
const INACTIVITY_TIME_ALLOWED = 5000; // 5 seconds in milliseconds, user can open up another program before it kicks you out of the room.
const ROOM_DELETION_TIME = 10000; // The room deletes after all users leave a room with a delay of this amount.

//Chathu
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase initialized");

// Add this at the top of your file after Firebase initialization
let lastActiveTime = Date.now();

// Add at the top of the file, after global variables
let inactivityHandler = null;

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("Page hidden");
        setTimeout(() => {
            if (document.hidden && window.currentRoom && currentUserRef) {
                console.log("User inactive for too long, kicking from room");
                // Actually kick the user out of the room, not just remove from user list
                leaveRoom();
            }
        }, INACTIVITY_TIME_ALLOWED);
    } else {
        console.log("Page visible");
        // Don't automatically rejoin room - let the user stay where they are
        // Only re-establish presence if we're still in a room
        if (window.currentRoom && currentUserRef) {
            console.log("Re-establishing presence in current room:", window.currentRoom);
            // Just ensure the user reference is still valid
            currentUserRef.set(true);
        }
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
        const versionInfoElem = document.getElementById('versionInfo');
        if (versionInfoElem) {
            versionInfoElem.textContent = `Version: ${timeString} (Builder ${builderVersion})`;
        }
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
            // Check if room exists before joining
            const roomRef = firebase.database().ref('rooms/' + roomNumber);
            roomRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    joinRoom(roomNumber);
                    // Restore button colors
                    const createBtn = document.getElementById('createChannelButton');
                    const joinBtn = document.getElementById('joinRoomButton');
                    if (createBtn) createBtn.classList.remove('fade-orange');
                    if (joinBtn) joinBtn.classList.remove('greyed-out');
                } else {
                    // Wobble the room input
                    if (roomInput) {
                        roomInput.classList.remove('wobble');
                        void roomInput.offsetWidth;
                        roomInput.classList.add('wobble');
                        setTimeout(() => roomInput.classList.remove('wobble'), 500);
                    }
                    // Fade create button and grey out join button
                    const createBtn = document.getElementById('createChannelButton');
                    const joinBtn = document.getElementById('joinRoomButton');
                    if (createBtn) createBtn.classList.add('fade-orange');
                    if (joinBtn) joinBtn.classList.add('greyed-out');
                }
            });
        }
    });

    // Also join room when pressing Enter in the room input
    roomInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log("Enter pressed in room input");
            const roomNumber = roomInput.value.trim();
            if (roomNumber) {
                // Check if room exists before joining
                const roomRef = firebase.database().ref('rooms/' + roomNumber);
                roomRef.once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        joinRoom(roomNumber);
                        // Restore button colors
                        const createBtn = document.getElementById('createChannelButton');
                        const joinBtn = document.getElementById('joinRoomButton');
                        if (createBtn) createBtn.classList.remove('fade-orange');
                        if (joinBtn) joinBtn.classList.remove('greyed-out');
                    } else {
                        // Wobble the room input
                        if (roomInput) {
                            roomInput.classList.remove('wobble');
                            void roomInput.offsetWidth;
                            roomInput.classList.add('wobble');
                            setTimeout(() => roomInput.classList.remove('wobble'), 500);
                        }
                        // Fade create button and grey out join button
                        const createBtn = document.getElementById('createChannelButton');
                        const joinBtn = document.getElementById('joinRoomButton');
                        if (createBtn) createBtn.classList.add('fade-orange');
                        if (joinBtn) joinBtn.classList.add('greyed-out');
                    }
                });
            }
        }
    });

    // Restore button colors on input change
    roomInput.addEventListener('input', function() {
        const createBtn = document.getElementById('createChannelButton');
        const joinBtn = document.getElementById('joinRoomButton');
        if (createBtn) createBtn.classList.remove('fade-orange');
        if (joinBtn) joinBtn.classList.remove('greyed-out');
    });

    // Add event listeners for all buttons
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearHistory);
    leaveRoomButton.addEventListener('click', leaveRoom);

    // Add these functions if they don't exist
    function sendMessage() {
        const message = textarea.value;  // Get raw value
        console.log("Attempting to send message:", message); // Debug log
        console.log("Message length:", message.length); // Debug log
        console.log("Contains newlines:", message.includes('\n')); // Debug log
        
        if (message && message.trim()) {  // Check if there's actual content
            console.log("Message is valid, sending..."); // Debug log
            // Get a reference to the messages in the current room
            const messagesRef = firebase.database().ref('rooms/' + window.currentRoom + '/messages');
            
            // Push the new message to Firebase
            messagesRef.push({
                text: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                console.log("Message sent successfully"); // Debug log
                // Clear the textarea
                textarea.value = '';
                // Force a reflow to fix iOS Safari placeholder bug (less flicker)
                textarea.offsetHeight; // Read a property to force reflow
                textarea.style.transform = 'scale(1)'; // Write a no-op style
                setTimeout(() => {
                    textarea.style.transform = '';
                }, 10);
            }).catch(error => {
                console.error("Error sending message:", error); // Debug log
            });
        } else {
            console.log("Message is empty or only whitespace"); // Debug log
        }
    }

    function clearHistory() {
        if (!window.currentRoom) return;
        
        // Clear the message container
        messageContainer.innerHTML = '';
        
        // Reset scroll position to top
        messageContainer.scrollTop = 0;
        
        // Clear messages in Firebase for current room
        const messagesRef = firebase.database().ref('rooms/' + window.currentRoom + '/messages');
        
        // First, get all messages
        messagesRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                // Then remove them all
                messagesRef.remove()
                    .then(() => {
                        console.log("Messages cleared from Firebase for all users");
                    })
                    .catch((error) => {
                        console.error("Error clearing messages:", error);
                    });
            }
        });
    }

    function leaveRoom() {
        if (window.currentRoom) {
            // Remove message listeners for the current room
            const messagesRef = firebase.database().ref('rooms/' + window.currentRoom + '/messages');
            messagesRef.off(); // Remove all listeners
            
            // Remove presence
            if (currentUserRef) {
                currentUserRef.remove();
                currentUserRef = null;
                
                // Add this line to check and clear room after user leaves
                checkAndClearEmptyRoom(window.currentRoom);
            }
            
            // Reset the room
            window.currentRoom = null;
            
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

        // In leaveRoom, before resetting window.currentRoom, add:
        if (inactivityHandler) {
            document.removeEventListener('visibilitychange', inactivityHandler);
            inactivityHandler = null;
        }
    }

    // Listen for messages in the current room
    function listenToMessages(roomNumber) {
        const messagesRef = firebase.database().ref('rooms/' + roomNumber + '/messages');
        
        // Remove any existing listeners
        messagesRef.off();
        
        // Listen for child added
        messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            
            // Create message content wrapper
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = message.text.replace(/\n/g, '<br>');
            
            // Create copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>';
            copyButton.title = 'Copy message';
            
            // Add click and touchend handlers for copy button
            function handleCopy() {
                // Removed mobile alert dialog
                // Try Clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(message.text).then(() => {
                        // Visual feedback
                        copyButton.classList.add('copied');
                        setTimeout(() => {
                            copyButton.classList.remove('copied');
                        }, 1000);
                    }).catch(() => {
                        // Fallback if Clipboard API fails
                        fallbackCopyTextToClipboard(message.text, copyButton);
                    });
                } else {
                    // Fallback for older browsers/mobile
                    fallbackCopyTextToClipboard(message.text, copyButton);
                }
            }
            copyButton.addEventListener('click', handleCopy);
            copyButton.addEventListener('touchend', function(e) {
                e.preventDefault(); // Prevents simulated mouse event
                handleCopy();
            });
            
            // Add elements to message
            messageElement.appendChild(messageContent);
            messageElement.appendChild(copyButton);
            messageElement.id = snapshot.key;
            messageContainer.insertBefore(messageElement, messageContainer.firstChild);
            
            // Keep scroll position at the top for new messages
            messageContainer.scrollTop = 0;
        });

        // Listen for child removed
        messagesRef.on('child_removed', (snapshot) => {
            const messageElement = document.getElementById(snapshot.key);
            if (messageElement) {
                messageElement.remove();
            }
        });

        // Listen for value changes (for when all messages are cleared)
        messagesRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                messageContainer.innerHTML = '';
                messageContainer.scrollTop = 0;
            }
        });
    }

    // Add this to your joinRoom function
    function joinRoom(roomNumber) {
        console.log("Joining room:", roomNumber);
        // Use the global currentRoom variable, not a local one
        window.currentRoom = roomNumber;
        
        // Hide room selection and show chat interface
        roomSelection.style.display = 'none';
        chatInterface.style.display = 'flex';
        chatInterface.classList.add('visible');
        
        // Add in-chat class to body
        document.body.classList.add('in-chat');
        
        // Setup presence handling and update room count
        currentUserRef = updateRoomCount(roomNumber);
        setupPresenceHandling(currentUserRef, roomNumber);
        
        // Start listening to messages
        listenToMessages(roomNumber);

        // In joinRoom, after setting up presence and listeners, add:
        if (inactivityHandler) {
            document.removeEventListener('visibilitychange', inactivityHandler);
        }
        inactivityHandler = function() {
            if (document.hidden) {
                console.log("Page hidden");
                setTimeout(() => {
                    if (document.hidden && window.currentRoom && currentUserRef) {
                        console.log("User inactive for too long, kicking from room");
                        leaveRoom();
                    }
                }, INACTIVITY_TIME_ALLOWED);
            }
        };
        document.addEventListener('visibilitychange', inactivityHandler);
    }

    // Add this inside your DOMContentLoaded event listener
    textarea.addEventListener('input', function() {
        // Enable/disable send button based on content
        const sendButton = document.getElementById('sendButton');
        sendButton.disabled = !this.value.trim();
        
        // Update character counter
        const charCounter = document.querySelector('.char-counter');
        const currentLength = this.value.length;
        
        // Only show counter if over 1000 characters
        if (currentLength > 1000) {
            charCounter.style.display = 'block';
            charCounter.textContent = `${currentLength}/1000 characters`;
            charCounter.style.color = '#ff4444';
        } else {
            charCounter.style.display = 'none';
        }
    });

    // Create Channel button logic
    const createChannelButton = document.getElementById('createChannelButton');
    if (createChannelButton) {
        createChannelButton.addEventListener('click', function() {
            // Get the current room count to determine the range
            firebase.database().ref('roomCount').once('value').then(snapshot => {
                const numRooms = snapshot.val() || 0;
                const max = (numRooms + 1) * 3;
                
                // Function to generate and check for unique room number
                const generateUniqueRoomNumber = (attempts = 0) => {
                    if (attempts > 100) {
                        alert('Could not find a free room number, please try again.');
                        return;
                    }
                    
                    const newChannelNumber = Math.floor(Math.random() * max) + 1;
                    const roomNumberString = newChannelNumber.toString();
                    
                    // Check if this room number already exists
                    firebase.database().ref(`rooms/${roomNumberString}`).once('value').then(roomSnapshot => {
                        if (roomSnapshot.exists()) {
                            // Room exists, try again
                            console.log('Room', roomNumberString, 'already exists, trying again...');
                            generateUniqueRoomNumber(attempts + 1);
                        } else {
                            // Room doesn't exist, we can use this number
                            console.log('Creating new channel:', roomNumberString, 'based on', numRooms, 'existing rooms');
                            joinRoom(roomNumberString);
                            if (roomInput) roomInput.value = roomNumberString;
                            createChannelButton.classList.remove('fade-orange');
                            joinRoomButton.classList.remove('greyed-out');
                        }
                    }).catch(error => {
                        console.error('Error checking room existence:', error);
                        // If we can't check, just use the generated number
                        joinRoom(roomNumberString);
                        if (roomInput) roomInput.value = roomNumberString;
                    });
                };
                
                // Start generating unique room numbers
                generateUniqueRoomNumber();
                
            }).catch(error => {
                console.error('Error getting room count:', error);
                // Fallback: generate a random 5-digit number
                const newChannelNumber = Math.floor(Math.random() * 90000) + 10000;
                const roomNumberString = newChannelNumber.toString();
                joinRoom(roomNumberString);
                if (roomInput) roomInput.value = roomNumberString;
            });
        });
    }

    // Optional: Add enter key support for sending messages
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// Function to update room info - MOVED OUTSIDE DOMContentLoaded
function updateRoomInfo(roomNumber, userCount) {
    console.log(`Updating room info for room ${roomNumber}, user count ${userCount}`);
    
    const roomInfo = document.getElementById('roomInfo');
    if (!roomInfo) {
        console.error("Room info element not found!");
        return;
    }

    // Always update both room number and user count with animation
    roomInfo.innerHTML = `
        <div class="room-number fade-in-animated">CHANNEL ${roomNumber}</div>
        <div class="user-count fade-in-animated">${userCount} user${userCount !== 1 ? 's' : ''} online</div>
    `;
    
    currentRoomNumber = roomNumber;
    console.log(`Updated room info for room ${roomNumber} with ${userCount} users`);
}

let currentRoom = null;
let messageListener = null;
let currentRoomNumber = null;  // Add this line

// Add these helper functions at the top of your file
function setupPresenceHandling(userRef, roomNumber) {
    // Create a presence reference
    const presenceRef = database.ref('.info/connected');
    const roomRef = database.ref(`rooms/${roomNumber}`);
    
    presenceRef.on('value', (snapshot) => {
        if (snapshot.val()) {
            // Client is connected
            console.log("Client connected");
            
            // Set up presence
            userRef.set(true);
            
            // Set up disconnect handling
            userRef.onDisconnect().remove();
            
            // Listen for changes in the users node
            roomRef.child('users').on('value', (usersSnapshot) => {
                const userCount = usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0;
                console.log("User count changed:", userCount);
                
                if (userCount < 1) {
                    console.log("Room empty, starting cleanup timer");
                    setTimeout(() => {
                        // Check one final time before clearing
                        roomRef.child('users').once('value', (finalSnapshot) => {
                            const finalCount = finalSnapshot.exists() ? Object.keys(finalSnapshot.val()).length : 0;
                            if (finalCount < 1) {
                                console.log("Room still empty after delay, clearing room");
                                roomRef.remove()
                                    .then(() => console.log("Room deleted"))
                                    .catch(error => console.error("Error deleting room:", error));
                            }
                        });
                    }, ROOM_DELETION_TIME);
                }
            });
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log("Page hidden");
            setTimeout(() => {
                if (document.hidden && window.currentRoom && currentUserRef) {
                    console.log("User inactive for too long, kicking from room");
                    // Actually kick the user out of the room, not just remove from user list
                    leaveRoom();
                }
            }, INACTIVITY_TIME_ALLOWED);
        } else {
            console.log("Page visible");
            // Don't automatically rejoin room - let the user stay where they are
            // Only re-establish presence if we're still in a room
            if (window.currentRoom && currentUserRef) {
                console.log("Re-establishing presence in current room:", window.currentRoom);
                // Just ensure the user reference is still valid
                currentUserRef.set(true);
            }
        }
    });
}

// Use this function when updating room count
function updateRoomCount(roomNumber) {
    console.log("Setting up room count listener for room:", roomNumber);
    const roomRef = database.ref(`rooms/${roomNumber}`);
    const userRef = roomRef.child('users').push(true);
    
    // Remove user reference on disconnect
    userRef.onDisconnect().remove();
    
    // Add listener for room users
    roomRef.child('users').on('value', (snapshot) => {
        const userCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        console.log("Firebase user count update:", userCount);
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
            // Get user count, defaulting to 0 if snapshot doesn't exist
            const userCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            console.log("Current user count:", userCount);
            
            // Only start timer if there's less than 1 user
            if (userCount < 1) {
                console.log("Less than 1 user, starting cleanup timer");
                setTimeout(() => {
                    // Check again after delay
                    roomRef.child('users').once('value')
                        .then(newSnapshot => {
                            const newUserCount = newSnapshot.exists() ? Object.keys(newSnapshot.val()).length : 0;
                            console.log("User count after delay:", newUserCount);
                            
                            if (newUserCount < 1) {
                                console.log("Room still empty after delay, clearing room");
                                roomRef.remove()
                                    .then(() => console.log("Room deleted"))
                                    .catch(error => console.error("Error deleting room:", error));
                            } else {
                                console.log("Users rejoined, keeping room active");
                            }
                        });
                }, ROOM_DELETION_TIME);
            } else {
                console.log("Room has users, no cleanup needed");
            }
        });
}

// Add this function to handle tab/window closing
window.addEventListener('beforeunload', function() {
    if (window.currentRoom && currentUserRef) {
        // Remove the user reference
        currentUserRef.remove();
        // Trigger the room cleanup
        checkAndClearEmptyRoom(window.currentRoom);
    }
});

// Add this helper function outside of DOMContentLoaded
function fallbackCopyTextToClipboard(text, copyButton) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Slightly visible for mobile compatibility
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = 0;
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0.01'; // Make it slightly visible
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful && copyButton) {
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.classList.remove('copied');
            }, 1000);
        }
    } catch (err) {
        // Optionally show error feedback
    }
    document.body.removeChild(textArea);
}

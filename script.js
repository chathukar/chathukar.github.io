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

const textarea = document.getElementById('myTextarea');
const messageContainer = document.getElementById('messageContainer');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');

// Function to send message
function sendMessage() {
    const message = textarea.value;
    if (message.trim() !== '') {
        // Save message to Firebase
        database.ref('messages').push({
            text: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => console.log("Message saved to Firebase"))
        .catch(error => console.error("Error saving message:", error));
        
        textarea.value = '';
    }
}

// Listen for new messages
database.ref('messages').on('child_added', (snapshot) => {
    const message = snapshot.val();
    addMessageToContainer(message.text);
});

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
        // Clear Firebase database
        database.ref('messages').remove()
            .then(() => {
                console.log("Messages cleared from Firebase");
                // Clear message container
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

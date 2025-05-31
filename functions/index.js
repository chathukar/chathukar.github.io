const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const ROOM_DELETION_TIME = 10000; // 10 seconds in milliseconds

// Function to check and delete empty rooms
exports.checkAndDeleteEmptyRooms = functions.database
    .ref('/rooms/{roomId}/users')
    .onValue(async (snapshot, context) => {
        const roomId = context.params.roomId;
        const roomRef = admin.database().ref(`/rooms/${roomId}`);
        
        // If the users node doesn't exist or is empty
        if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
            console.log(`Room ${roomId} is empty, scheduling deletion`);
            
            // Wait for ROOM_DELETION_TIME before checking again
            await new Promise(resolve => setTimeout(resolve, ROOM_DELETION_TIME));
            
            // Check one final time before deleting
            const finalCheck = await roomRef.child('users').once('value');
            if (!finalCheck.exists() || Object.keys(finalCheck.val()).length === 0) {
                console.log(`Room ${roomId} still empty after delay, deleting room`);
                // Delete the entire room
                await roomRef.remove();
                console.log(`Room ${roomId} deleted successfully`);
            } else {
                console.log(`Room ${roomId} has users again, keeping room`);
            }
        }
    });

// Function to clean up empty rooms
exports.cleanupEmptyRooms = functions.database
  .ref('/rooms/{roomId}/users')
  .onValue(async (snapshot, context) => {
    const roomId = context.params.roomId;
    const users = snapshot.val();
    
    // If no users are present
    if (!users || Object.keys(users).length === 0) {
      try {
        // Wait for 10 seconds before cleaning up
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check again if the room is still empty
        const roomRef = admin.database().ref(`/rooms/${roomId}`);
        const roomSnapshot = await roomRef.child('users').once('value');
        
        if (!roomSnapshot.val() || Object.keys(roomSnapshot.val()).length === 0) {
          // Delete the room's messages
          await roomRef.child('messages').remove();
          console.log(`Cleaned up empty room: ${roomId}`);
        }
      } catch (error) {
        console.error(`Error cleaning up room ${roomId}:`, error);
      }
    }
  });

// Function to handle user presence
exports.handleUserPresence = functions.database
  .ref('/rooms/{roomId}/users/{userId}')
  .onDelete(async (snapshot, context) => {
    const roomId = context.params.roomId;
    const userId = context.params.userId;
    
    try {
      const roomRef = admin.database().ref(`/rooms/${roomId}`);
      const usersSnapshot = await roomRef.child('users').once('value');
      
      // If this was the last user
      if (!usersSnapshot.val() || Object.keys(usersSnapshot.val()).length === 0) {
        // Wait for 10 seconds before cleaning up
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check again if the room is still empty
        const finalSnapshot = await roomRef.child('users').once('value');
        if (!finalSnapshot.val() || Object.keys(finalSnapshot.val()).length === 0) {
          await roomRef.child('messages').remove();
          console.log(`Cleaned up room after last user left: ${roomId}`);
        }
      }
    } catch (error) {
      console.error(`Error handling user presence for room ${roomId}:`, error);
    }
  }); 
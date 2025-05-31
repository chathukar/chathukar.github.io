/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Function to clean up empty rooms
exports.cleanupEmptyRooms = functions.database
  .ref('/rooms/{roomId}/users')
  .onWrite(async (change, context) => {
    const roomId = context.params.roomId;
    const users = change.after.val();
    
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

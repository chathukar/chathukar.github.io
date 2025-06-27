/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

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
    if (!users || Object.keys(users).length === 0) {
      try {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const roomRef = admin.database().ref(`/rooms/${roomId}`);
        const roomSnapshot = await roomRef.child('users').once('value');
        if (!roomSnapshot.val() || Object.keys(roomSnapshot.val()).length === 0) {
          await roomRef.remove();
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
    try {
      const roomRef = admin.database().ref(`/rooms/${roomId}`);
      const usersSnapshot = await roomRef.child('users').once('value');
      if (!usersSnapshot.val() || Object.keys(usersSnapshot.val()).length === 0) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const finalSnapshot = await roomRef.child('users').once('value');
        if (!finalSnapshot.val() || Object.keys(finalSnapshot.val()).length === 0) {
          await roomRef.remove();
          console.log(`Cleaned up room after last user left: ${roomId}`);
        }
      }
    } catch (error) {
      console.error(`Error handling user presence for room ${roomId}:`, error);
    }
  });

// Increment roomCount when a room is created
exports.incrementRoomCount = functions.database
  .ref('/rooms/{roomId}')
  .onCreate(async (snapshot, context) => {
    const room = snapshot.val();
    if (room && room.createdAt) {
      const countRef = admin.database().ref('/roomCount');
      await countRef.transaction(current => (current || 0) + 1);
    }
  });

// Decrement roomCount when a room is deleted
exports.decrementRoomCount = functions.database
  .ref('/rooms/{roomId}')
  .onDelete(async (snapshot, context) => {
    const countRef = admin.database().ref('/roomCount');
    await countRef.transaction(current => (current || 1) - 1);
  });

// Delete any room that does not have a createdAt node
exports.deleteRoomsWithoutCreatedAt = functions.database
  .ref('/rooms/{roomId}')
  .onWrite(async (change, context) => {
    const roomId = context.params.roomId;
    const roomData = change.after.exists() ? change.after.val() : null;
    if (roomData && !roomData.createdAt) {
      const roomRef = admin.database().ref(`/rooms/${roomId}`);
      await roomRef.remove();
      console.log(`Deleted room ${roomId} because it did not have a createdAt node.`);
    }
  });

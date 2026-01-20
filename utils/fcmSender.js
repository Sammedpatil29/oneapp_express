const admin = require('firebase-admin');

// --- Firebase Admin SDK Initialization ---
// IMPORTANT: Make sure you have a 'firebase-service-account.json' file in your project's root directory.
// You can download this file from your Firebase project settings.
try {
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    };

    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized.');
    }
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed.', error.message);
  // Subsequent FCM calls will fail if the SDK is not initialized.
}

/**
 * Sends a notification to one or more devices via FCM.
 * Handles both single and multiple tokens efficiently.
 *
 * @param {string|string[]} tokens - A single FCM token or an array of FCM tokens.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the notification.
 * @param {object} [data={}] - Optional data payload to send with the notification.
 * @returns {Promise<{success: boolean, message: string, response?: any}>}
 */
const sendFcmNotification = async (tokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    const errorMessage = 'FCM sending failed: Firebase Admin SDK not initialized.';
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
    return { success: false, message: 'No FCM tokens provided.' };
  }

  const messagePayload = {
    notification: { title, body },
    data,
    android: {
      priority: 'high',
      notification: { sound: 'default' },
    },
    apns: {
      payload: {
        aps: { sound: 'default' },
      },
    },
  };

  try {
    if (Array.isArray(tokens) && tokens.length > 1) {
      // Efficiently send to multiple devices
      const multicastMessage = { ...messagePayload, tokens };
      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      console.log(`FCM multicast message sent: ${response.successCount} successes, ${response.failureCount} failures.`);
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
          }
        });
      }
      return { success: true, message: 'Multicast message sent.', response };
    } else {
      // Send to a single device (handles array with 1 token or a single string token)
      const singleToken = Array.isArray(tokens) ? tokens[0] : tokens;
      const singleMessage = { ...messagePayload, token: singleToken };
      const response = await admin.messaging().send(singleMessage);
      console.log('Successfully sent FCM message:', response);
      return { success: true, message: 'Single message sent.', response };
    }
  } catch (error) {
    console.error('Error sending FCM message:', error);
    return { success: false, message: 'Error sending FCM message.', error };
  }
};

module.exports = { sendFcmNotification };
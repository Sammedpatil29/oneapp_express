// utils/notificationService.js
import axios from "axios";

// Base URL of your Django backend
const BASE_URL = "https://oneapp-backend.onrender.com/api/users/send-to-all/";

/**
 * Send a push notification to all users
 * @param {Object} payload - Notification message payload
 * @returns {Promise<Object>} - Response from backend
 */
export async function sendNotification(payload) {
  try {
    const response = await axios.post(BASE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Notification sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to send notification:", error.response?.data || error.message);
    throw error;
  }
}

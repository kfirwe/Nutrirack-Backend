import axios from "axios";
import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

// Define PushMessage type (Optional, for better typing)
type PushMessage = {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: { [key: string]: any };
};

export const sendPushNotification = async (
  pushToken: string,
  message: string
): Promise<void> => {
  const expo = new Expo();

  const messages: ExpoPushMessage[] = [
    {
      to: pushToken,
      sound: "default",
      title: "Meal Reminder",
      body: message,
      data: { message },
    },
  ];

  try {
    // Chunk messages if there are multiple push notifications to send
    const chunks = expo.chunkPushNotifications(messages);
    console.log("Chunks:", chunks);
    // Initialize an empty array to store the tickets
    const tickets: ExpoPushTicket[] = [];

    // Send the push notifications in chunks (use async/await for each chunk)
    for (let chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("Ticket chunk:", ticketChunk);
      tickets.push(...ticketChunk);
    }

    console.log("All tickets:", tickets);

    console.log("Push notification sent successfully:", tickets);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

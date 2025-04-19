import { Request, Response } from "express";
import Chat, { IChat, IMessage } from "../models/Chat.model";
import { generateAIResponse } from "../helpers/chat.helper";

export const getChats = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string })?.id;
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).limit(5);
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Error fetching chats" });
  }
};

export const createChat = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string })?.id;

    const userChats = await Chat.find({ userId }).sort({ createdAt: -1 });

    if (userChats.length >= 5) {
      await Chat.findByIdAndDelete(userChats[userChats.length - 1]._id);
    }

    const newChat = await Chat.create({ userId, messages: [] });
    res.status(201).json(newChat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Error creating chat" });
  }
};

export const createChatIfNoChat = async (userId: string): Promise<IChat> => {
  const userChats = await Chat.find({ userId }).sort({ updatedAt: -1 });

  if (userChats.length >= 5) {
    await Chat.findByIdAndDelete(userChats[userChats.length - 1]._id);
  }

  const newChat = await Chat.create({ userId, messages: [] });
  return newChat;
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    let { chatId, text } = req.body;
    const userId = (req.user as { id: string })?.id;

    let chat: IChat | null;

    if (!chatId) {
      chat = await createChatIfNoChat(userId);
      chatId = chat._id;
    } else {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }
    }
    const userMessage: IMessage = {
      chatId,
      sender: "user",
      text,
      timestamp: new Date(),
    };
    chat.messages.push(userMessage);

    const aiResponse = await generateAIResponse(chat.messages, userId);

    const aiMessage: IMessage = {
      chatId,
      sender: "ai",
      text: aiResponse,
      timestamp: new Date(),
    };
    chat.messages.push(aiMessage);

    await chat.save();
    res.status(200).json(chat);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending message" });
  }
};

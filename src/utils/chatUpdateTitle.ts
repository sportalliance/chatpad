import {Chat, db} from "../db";
import {createChatCompletion} from "./openai";
import {trim} from "./trim";

export async function updateChatTitle(chat: Chat) {
    if (!(chat?.isNewChat || chat?.isNewChat === undefined)) {
        return;
    }
    const messages = await db.messages
        .where({chatId: chat.id})
        .sortBy("createdAt");
    const createChatDescription = await createChatCompletion(chat.id, [
        ...(messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
        })),
        {
            role: "user",
            content:
                "What would be a short and relevant title for this chat ? You must strictly answer with only the title, no other text is allowed.",
        },
    ]);
    const chatDescription =
        createChatDescription.choices[0].message?.content;

    if (createChatDescription.usage) {
        await db.chats.where({id: chat.id}).modify((chat) => {
            const description = chatDescription ?? "New Chat";
            chat.description = trim(description, "\"");
            chat.modelUsed = createChatDescription.model;
            chat.updatedAt = new Date();
            chat.isNewChat = false;
        });
    }
}
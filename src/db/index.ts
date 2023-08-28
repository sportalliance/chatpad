import Dexie, {Table} from "dexie";
import "dexie-export-import";
import {config} from "../utils/config";

export interface Chat {
    id: string;
    description: string;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    modelUsed?: string,
    createdAt: Date;
    totalPriceUsd?:number;
    isNewChat?: Boolean;
    updatedAt: Date;
}

export interface Message {
    id: string;
    chatId: string;
    role: "system" | "assistant" | "user";
    content: string;
    createdAt: Date;
}

export interface Prompt {
    id: string;
    title: string;
    content: string;
    system: string;
    createdAt: Date;
}

export interface Settings {
    id: "general";
    openAiApiKey?: string;
    openAiModel?: string;
    openAiApiType?: 'openai' | 'custom';
    openAiApiAuth?: 'none' | 'bearer-token' | 'api-key';
    openAiApiBase?: string;
    openAiApiVersion?: string;
}

export class Database extends Dexie {
    chats!: Table<Chat>;
    messages!: Table<Message>;
    prompts!: Table<Prompt>;
    settings!: Table<Settings>;

    constructor() {
        super("chatpad");
        this.version(5).stores({
            chats: "id, createdAt",
            messages: "id, chatId, createdAt, [chatId+role]",
            prompts: "id, createdAt",
            settings: "id",
        });

        this.version(6).stores({
            chats: "id, createdAt, updatedAt",
            messages: "id, chatId, createdAt, [chatId+role]",
            prompts: "id, createdAt",
            settings: "id",
        }).upgrade(trans => {
            return trans.db.table("chats").toCollection().modify(chat => {
                chat.updatedAt = chat.createdAt;
            });
        });

        this.on("populate", async () => {
            db.settings.add({
                id: "general",
                openAiModel: config.defaultModel,
                openAiApiType: config.defaultType,
                openAiApiAuth: config.defaultAuth,
                ...(config.defaultKey != '' && {openAiApiKey: config.defaultKey}),
                ...(config.defaultBase != '' && {openAiApiBase: config.defaultBase}),
                ...(config.defaultVersion != '' && {openAiApiVersion: config.defaultVersion}),
            });
        });
    }
}

export const db = new Database();

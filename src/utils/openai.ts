import {encode} from "gpt-token-utils";
import {ClientOptions, OpenAI} from "openai";
import {OpenAIExt} from "openai-ext";
import {db} from "../db";
import {config} from "./config";
import {ChatCompletionMessage} from "openai/resources/chat";

function getClient(
    apiKey: string,
    apiType: string,
    apiAuth: string,
    basePath: string
) {
    const configuration: ClientOptions = {
        ...((apiType === "openai" ||
            (apiType === "custom" && apiAuth === "bearer-token")) && {
            apiKey: apiKey,
        }),
        ...(apiType === "custom" && {basePath: basePath}),
        dangerouslyAllowBrowser: true,
    };
    return new OpenAI(configuration);
}

export async function createStreamChatCompletion(
    apiKey: string,
    messages: ChatCompletionMessage[],
    chatId: string,
    messageId: string
) {
    const chat = await db.chats.get(chatId);
    const settings = await db.settings.get("general");
    const model = chat?.modelUsed ?? settings?.openAiModel ?? config.defaultModel;
    const type = settings?.openAiApiType ?? config.defaultType;
    const auth = settings?.openAiApiAuth ?? config.defaultAuth;
    const base = settings?.openAiApiBase ?? config.defaultBase;
    const version = settings?.openAiApiVersion ?? config.defaultVersion;

    const client = getClient(apiKey, type, auth, base);

    const stream = await client.chat.completions.create(
        {
            model,
            stream: true,
            messages,
        },

        {
            headers: {
                "Content-Type": "application/json",
                ...(type === "custom" && auth === "api-key" && {"api-key": apiKey}),
            },
            query: {
                ...(type === "custom" && {"api-version": version}),
            },
        }
    );

    db.messages.where({id: messageId}).modify((message) => {
        message.content = "";
    });
    let lastPart = null;
    for await (const part of stream) {
        appendToContent(messageId, chatId, part.choices[0].delta.content!);
        lastPart = part;
    }
    if (lastPart != null) {
        db.chats.where({id: chatId}).modify((chat) => {
            chat.modelUsed = lastPart!.model;
        });
    }
}

function appendToContent(
    messageId: string,
    chatId: string,
    content: string,
) {
    if (content == null || content == "") {
        return;
    }
    db.messages.where({id: messageId}).modify((message) => {
        message.content += content;
    });
    let total_tokens = encode(content).length;
    db.chats.where({id: chatId}).modify((chat) => {
        chat.totalTokens = (chat.totalTokens ?? 0) + total_tokens;
    });
}

export async function createChatCompletion(
    apiKey: string,
    messages: ChatCompletionMessage[]
) {
    const settings = await db.settings.get("general");
    const model = settings?.openAiModel ?? config.defaultModel;
    const type = settings?.openAiApiType ?? config.defaultType;
    const auth = settings?.openAiApiAuth ?? config.defaultAuth;
    const base = settings?.openAiApiBase ?? config.defaultBase;
    const version = settings?.openAiApiVersion ?? config.defaultVersion;

    const client = getClient(apiKey, type, auth, base);
    return client.chat.completions.create(
        {
            model,
            stream: false,
            messages,
        },

        {
            headers: {
                "Content-Type": "application/json",
                ...(type === "custom" && auth === "api-key" && {"api-key": apiKey}),
            },
            query: {
                ...(type === "custom" && {"api-version": version}),
            },
        }
    );
}

export async function checkOpenAIKey(apiKey: string) {
    return createChatCompletion(apiKey, [
        {
            role: "user",
            content: "hello",
        },
    ]);
}

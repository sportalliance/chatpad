import {ClientOptions, OpenAI} from "openai";
import {db} from "../db";
import {config} from "./config";
import {ChatCompletion, ChatCompletionMessage, Completions} from "openai/resources/chat";
import {GPTTokens, supportModelType} from "gpt-tokens/index";
import {useApiKey} from "../hooks/useApiKey";
import {CancelToken} from "cancel-token";
import ChatCompletionChunk = Completions.ChatCompletionChunk;
import {Stream} from "openai/streaming";
import {updateChatTitle} from "./chatUpdateTitle";

function getClient(
    apiType: string,
    apiAuth: string,
    basePath: string,
    apiKey?: string | null
) {
    const configuration: ClientOptions = {
        apiKey: apiKey!,
        ...(apiType === "custom" && {baseURL: basePath}),
        dangerouslyAllowBrowser: true,
    };
    return new OpenAI(configuration);
}

export async function createStreamChatCompletion(
    messages: ChatCompletionMessage[],
    chatId: string,
    messageId: string,
    cancellationToken: CancelToken,
) {
    const chat = await db.chats.get(chatId);
    const settings = await db.settings.get("general");
    let model = chat?.modelUsed ?? settings?.openAiModel ?? config.defaultModel;
    const apiKey = await useApiKey();

    const response: Stream<ChatCompletionChunk> = await createChatCompletionInternal(apiKey ?? "", chatId, messages, true) as any;

    let content = "";
    try {
        for await (const part of response) {
            const contentPart = part.choices[0].delta.content!;
            if (contentPart) {
                content += contentPart;
            }
            if (part.model) {
                model = part.model;
            }
            await setStreamContent(messageId, content, contentPart === undefined);
            if (cancellationToken.reason) {
                break;
            }
        }
    } finally {
        if (model != chat?.modelUsed) {
            await db.chats.update(chatId, {modelUsed: model});
        }
        await setTotalTokens(chatId, content);
        await updateChatTitle((await db.chats.get(chatId))!);
    }
}

async function setStreamContent(
    messageId: string,
    content: string,
    isFinal: boolean
) {
    content = isFinal ? content : content + "█";
    await db.messages.update(messageId, {content: content});
}

async function setTotalTokens(chatId: string, content: string) {
    const messages = (await db.messages.where({chatId: chatId}).toArray()).map((message) => {
        return {
            role: message.role,
            content: message.content,
        };
    });
    const chat = await db.chats.get(chatId);
    const gptTokens = new GPTTokens({
        model: chat?.modelUsed! as any as supportModelType,
        messages: messages,
    });
    db.chats.where({id: chatId}).modify((chat) => {
        chat.totalTokens = gptTokens.usedTokens;
        chat.totalPromptTokens = gptTokens.promptUsedTokens;
        chat.totalCompletionTokens = gptTokens.completionUsedTokens;
        chat.totalPriceUsd = gptTokens.usedUSD;
        chat.updatedAt = new Date();
    });
}

export async function createChatCompletion(
    chatId: string,
    messages: ChatCompletionMessage[]
) {
    const apiKey = await useApiKey();
    return createChatCompletionInternal(apiKey ?? "", chatId, messages) as any as ChatCompletion;
}

async function createChatCompletionInternal(
    apiKey: string,
    chatId: string,
    messages: ChatCompletionMessage[],
    stream: boolean = false
) {
    const chat = await db.chats.get(chatId);
    const settings = await db.settings.get("general");
    const model = chat?.modelUsed ?? settings?.openAiModel ?? config.defaultModel;
    const type = settings?.openAiApiType ?? config.defaultType;
    const auth = settings?.openAiApiAuth ?? config.defaultAuth;
    const base = settings?.openAiApiBase ?? config.defaultBase;
    const version = settings?.openAiApiVersion ?? config.defaultVersion;

    const client = getClient(type, auth, base, apiKey);
    return client.chat.completions.create(
        {
            model,
            stream: stream,
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
    return createChatCompletionInternal(apiKey, "", [
        {
            role: "user",
            content: "hello",
        },
    ]);
}

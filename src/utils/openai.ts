import {encode} from "gpt-token-utils";
import {ClientOptions, OpenAI} from "openai";
import {OpenAIExt} from "openai-ext";
import {db} from "../db";
import {config} from "./config";
import {ChatCompletionMessage} from "openai/resources/chat";
import {GPTTokens, supportModelType} from "gpt-tokens/index";

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
    messageId: string,
    onDone?: () => Promise<void>
) {
    const chat = await db.chats.get(chatId);
    const settings = await db.settings.get("general");
    const model = chat?.modelUsed ?? settings?.openAiModel ?? config.defaultModel;
    const chatCompletionsUrl = settings?.openAiApiBase ? settings?.openAiApiBase + "/chat/completions" : undefined;

    if (model != chat?.modelUsed) {
        await db.chats.where({id: chatId}).modify((chat) => {
            chat.modelUsed = model;
        });
    }

    return OpenAIExt.streamClientChatCompletion(
        {
            model,
            messages,
        },
        {
            apiKey: apiKey,
            chatCompletionsUrl: chatCompletionsUrl,
            handler: {
                onContent(content, isFinal, stream) {
                    setStreamContent(messageId, content, isFinal);
                    if (isFinal) {
                        setTotalTokens(chatId, content);
                    }
                },
                async onDone(stream) {
                    if (onDone) {
                        await onDone();
                    }
                },
                onError(error, stream) {
                    console.error(error);
                },
            },
        }
    );
}

function setStreamContent(
    messageId: string,
    content: string,
    isFinal: boolean
) {
    content = isFinal ? content : content + "█";
    db.messages.update(messageId, {content: content});
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
    apiKey: string,
    chatId: string,
    messages: ChatCompletionMessage[]
) {
    const chat = await db.chats.get(chatId);
    const settings = await db.settings.get("general");
    const model = chat?.modelUsed ?? settings?.openAiModel ?? config.defaultModel;
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
    return createChatCompletion(apiKey,"", [
        {
            role: "user",
            content: "hello",
        },
    ]);
}

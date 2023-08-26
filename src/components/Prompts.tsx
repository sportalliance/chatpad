import {ActionIcon, Box, Flex, Group, Text, Tooltip} from "@mantine/core";
import {IconPlayerPlay} from "@tabler/icons-react";
import {useNavigate} from "@tanstack/react-location";
import {useLiveQuery} from "dexie-react-hooks";
import {nanoid} from "nanoid";
import {useMemo} from "react";
import {db} from "../db";
import {createChatCompletion, createStreamChatCompletion} from "../utils/openai";
import {DeletePromptModal} from "./DeletePromptModal";
import {EditPromptModal} from "./EditPromptModal";

export function Prompts({
                            onPlay,
                            search,
                        }: {
    onPlay: () => void;
    search: string;
}) {
    const navigate = useNavigate();
    const prompts = useLiveQuery(() =>
        db.prompts.orderBy("createdAt").reverse().toArray()
    );
    const filteredPrompts = useMemo(
        () =>
            (prompts ?? []).filter((prompt) => {
                if (!search) return true;
                return (
                    prompt.title.toLowerCase().includes(search) ||
                    prompt.content.toLowerCase().includes(search)
                );
            }),
        [prompts, search]
    );
    const apiKey = useLiveQuery(async () => {
        return (await db.settings.where({id: "general"}).first())?.openAiApiKey;
    });

    return (
        <>
            {filteredPrompts.map((prompt) => (
                <Flex
                    key={prompt.id}
                    sx={(theme) => ({
                        marginTop: 1,
                        padding: theme.spacing.xs,
                        "&:hover": {
                            backgroundColor:
                                theme.colorScheme === "dark"
                                    ? theme.colors.dark[6]
                                    : theme.colors.gray[1],
                        },
                    })}
                >
                    <Box
                        sx={(theme) => ({
                            flexGrow: 1,
                            width: 0,
                            fontSize: theme.fontSizes.sm,
                        })}
                    >
                        <Text
                            weight={500}
                            sx={{
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                            }}
                        >
                            {prompt.title}
                        </Text>
                        <Text
                            color="dimmed"
                            sx={{
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                            }}
                        >
                            {prompt.content}
                        </Text>
                    </Box>
                    <Group spacing="none">
                        <Tooltip label="New Chat From Prompt">
                            <ActionIcon
                                size="lg"
                                onClick={async () => {
                                    if (!apiKey) return;
                                    const chatId = nanoid();
                                    prompt.system ??= "You are ChatGPT, a large language model trained by OpenAI. You are a helpful bot that chats with users.";
                                    await db.chats.add({
                                        id: chatId,
                                        description: "New Chat",
                                        totalTokens: 0,
                                        createdAt: new Date(),
                                        modelUsed: undefined,
                                        totalCompletionTokens: 0,
                                        totalPromptTokens: 0
                                    });
                                    await db.messages.add({
                                        id: nanoid(),
                                        chatId: chatId,
                                        content: prompt.system,
                                        role: "system",
                                        createdAt: new Date(),
                                    });

                                    await db.messages.add({
                                        id: nanoid(),
                                        chatId: chatId,
                                        content: prompt.content,
                                        role: "user",
                                        createdAt: new Date(),
                                    });
                                    let messageId = nanoid();
                                    await db.messages.add({
                                        id: messageId,
                                        chatId: chatId,
                                        content: "█",
                                        role: "assistant",
                                        createdAt: new Date(),
                                    });

                                    navigate({to: `/chats/${chatId}`});
                                    onPlay();

                                    await createStreamChatCompletion(apiKey, [
                                        {
                                            role: "system",
                                            content: prompt.system,
                                        },
                                        {role: "user", content: prompt.content},
                                    ], chatId, messageId);
                                }}
                            >
                                <IconPlayerPlay size={20}/>
                            </ActionIcon>
                        </Tooltip>
                        <EditPromptModal prompt={prompt}/>
                        <DeletePromptModal prompt={prompt}/>
                    </Group>
                </Flex>
            ))}
        </>
    );
}

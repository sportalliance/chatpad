import {
    ActionIcon,
    Button,
    Modal,
    Stack,
    Textarea,
    TextInput,
    Tooltip,
} from "@mantine/core";
import {useDisclosure} from "@mantine/hooks";
import {notifications} from "@mantine/notifications";
import {IconBookmarkEdit, IconPencil, IconPlayCard} from "@tabler/icons-react";
import {useEffect, useState} from "react";
import {Chat, db, Prompt} from "../db";
import {useLiveQuery} from "dexie-react-hooks";
import {nanoid} from "nanoid";
import {createStreamChatCompletion} from "../utils/openai";
import {updateChatTitle} from "../utils/chatUpdateTitle";
import {useNavigate} from "@tanstack/react-location";

export function PlayEditPromptModal({prompt}: { prompt: Prompt }) {
    const navigate = useNavigate();

    const [opened, {open, close}] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);

    const [content, setContent] = useState("");
    const apiKey = useLiveQuery(async () => {
        return (await db.settings.where({id: "general"}).first())?.openAiApiKey;
    });

    useEffect(() => {
        setContent(prompt?.content ?? "");
    }, [prompt]);

    return (
        <>
            <Modal opened={opened} onClose={close} title="Change content before starting chat" size="lg">
                <form
                    onSubmit={async (event) => {
                        try {
                            setSubmitting(true);
                            event.preventDefault();
                            if (!apiKey) return;
                            const chatId = nanoid();
                            prompt.system ??= "You are ChatGPT, a large language model trained by OpenAI. You are a helpful bot that chats with users. Always answer in markdown (no code block around it).";
                            const chat: Chat = {
                                id: chatId,
                                description: "New Chat",
                                totalTokens: 0,
                                createdAt: new Date(),
                                modelUsed: undefined,
                                totalCompletionTokens: 0,
                                totalPromptTokens: 0,
                                isNewChat: true,
                                updatedAt: new Date(),
                            };
                            await db.chats.add(chat);
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
                                content: content,
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

                            await createStreamChatCompletion(apiKey, [
                                    {
                                        role: "system",
                                        content: prompt.system,
                                    },
                                    {role: "user", content: content},
                                ], chatId,
                                messageId,
                                async () => await updateChatTitle(chat, apiKey));
                            close();

                        } catch (error: any) {
                            if (error.toJSON().message === "Network Error") {
                                notifications.show({
                                    title: "Error",
                                    color: "red",
                                    message: "No internet connection.",
                                });
                            }
                            const message = error.response?.data?.error?.message;
                            if (message) {
                                notifications.show({
                                    title: "Error",
                                    color: "red",
                                    message,
                                });
                            }
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    <Stack>
                        <Textarea
                            label="Content"
                            autosize
                            minRows={5}
                            maxRows={10}
                            value={content}
                            onChange={(event) => setContent(event.currentTarget.value)}
                        />
                        <Button type="submit" loading={submitting}>
                            Start Chat
                        </Button>
                    </Stack>
                </form>
            </Modal>
            <Tooltip label="Edit before starting chat">
                <ActionIcon size="lg" onClick={open}>
                    <IconBookmarkEdit size={20}/>
                </ActionIcon>
            </Tooltip>
        </>
    );
}

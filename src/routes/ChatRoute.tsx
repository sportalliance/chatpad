import {
    ActionIcon,
    Box,
    Button,
    Container,
    Flex,
    Group,
    MediaQuery,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Textarea,
    Tooltip,
} from "@mantine/core";
import {notifications} from "@mantine/notifications";
import {useLiveQuery} from "dexie-react-hooks";
import {nanoid} from "nanoid";
import React, {type ChangeEvent, KeyboardEvent, useEffect, useRef, useState} from "react";
import {AiOutlineSend} from "react-icons/ai";
import {MessageItem} from "../components/MessageItem";
import {db, Message} from "../db";
import {useChatId} from "../hooks/useChatId";
import {config} from "../utils/config";
import {createStreamChatCompletion,} from "../utils/openai";
import {Placeholder} from "../components/Placeholder";
import LazyLoad from "react-lazyload";
import {ChatCompletionMessage} from "openai/resources/chat";
import {IconClockStop} from "@tabler/icons-react";
import {updateChatTitle} from "../utils/chatUpdateTitle";

export function ChatRoute() {
    const chatId = useChatId();
    const apiKey = useLiveQuery(async () => {
        return (await db.settings.where({id: "general"}).first())?.openAiApiKey;
    });
    const messages = useLiveQuery(() => {
        if (!chatId) return [];
        return db.messages.where("chatId").equals(chatId).sortBy("createdAt");
    }, [chatId]);

    const lastMessages = new Map(messages?.slice(-8)?.map((message) => [message.id, true]));
    const userMessages =
        messages
            ?.filter((message) => message.role === "user")
            .map((message) => message.content) || [];
    const [userMsgIndex, setUserMsgIndex] = useState(0);
    const [content, setContent] = useState("");
    const [contentDraft, setContentDraft] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [generatingRequest, setGeneratingRequest] = useState<XMLHttpRequest | undefined>(undefined);

    const chat = useLiveQuery(async () => {
        if (!chatId) return null;
        return db.chats.get(chatId);
    }, [chatId]);

    const [writingCharacter, setWritingCharacter] = useState<string | null>(null);
    const [writingTone, setWritingTone] = useState<string | null>(null);
    const [writingStyle, setWritingStyle] = useState<string | null>(null);
    const [writingFormat, setWritingFormat] = useState<string | null>(null);

    const getSystemMessage = () => {
        const message: string[] = [];
        if (writingCharacter) message.push(`You are ${writingCharacter}.`);
        if (writingTone) message.push(`Respond in ${writingTone} tone.`);
        if (writingStyle) message.push(`Respond in ${writingStyle} style.`);
        if (writingFormat) message.push(writingFormat);
        if (message.length === 0)
            message.push(
                "You are ChatGPT, a large language model trained by OpenAI."
            );
        return message.join(" ") + " Always answer in markdown (no code block around it).";
    };

    const settings = useLiveQuery(async () => {
        return db.settings.where({id: "general"}).first();
    });
    const [model, setModel] = useState(config.defaultModel);
    useEffect(() => {
        if (settings?.openAiModel) {
            setModel(settings.openAiModel);
        }
    });

    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        // @ts-ignore
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages]);
    useEffect(() => {
        setTimeout(() => {
            scrollToBottom();
        }, 1000);
    }, []);

    const abortGeneration = () => {
        generatingRequest?.abort();
        setSubmitting(false);
        notifications.show({
            title: "Stopped",
            color: "yellow",
            message: "Stopped generating message.",
        });
    }
    const submit = async () => {
        if (submitting) return;

        if (!chatId) {
            notifications.show({
                title: "Error",
                color: "red",
                message: "chatId is not defined. Please create a chat to get started.",
            });
            return;
        }

        if (!apiKey) {
            notifications.show({
                title: "Error",
                color: "red",
                message: "OpenAI API Key is not defined. Please set your API Key",
            });
            return;
        }

        try {
            setSubmitting(true);
            const systemMessage = getSystemMessage();
            //Only log the system message if it's a new chat
            if (chat?.isNewChat || chat?.isNewChat === undefined) {
                await db.messages.add({
                    id: nanoid(),
                    chatId,
                    content: systemMessage,
                    role: "system",
                    createdAt: new Date(),
                });
            }

            await db.messages.add({
                id: nanoid(),
                chatId,
                content,
                role: "user",
                createdAt: new Date(),
            });
            setContent("");

            const messageId = nanoid();
            await db.messages.add({
                id: messageId,
                chatId,
                content: "█",
                role: "assistant",
                createdAt: new Date(),
            });

            let messagesToSend: ChatCompletionMessage[] = [
                ...(messages ?? []).map((message) => ({
                    role: message.role,
                    content: message.content,
                })),
                {role: "user", content},
            ];

            if (chat?.isNewChat || chat?.isNewChat === undefined) {
                messagesToSend.push({role: "system", content: systemMessage})
            }
            const request = await createStreamChatCompletion(
                apiKey,
                messagesToSend,
                chatId,
                messageId,
                async () => {
                    try {
                        await updateChatTitle(chat!, apiKey);
                    } finally {
                        setSubmitting(false);
                    }
                }
            );
            setGeneratingRequest(request);


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
            if (chat?.isNewChat || chat?.isNewChat === undefined) {
                await db.chats.where({id: chatId}).modify({isNewChat: false});
            }
        }
    };

    const onUserMsgToggle = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        const {selectionStart, selectionEnd} = event.currentTarget;
        if (
            !["ArrowUp", "ArrowDown"].includes(event.code) ||
            selectionStart !== selectionEnd ||
            (event.code === "ArrowUp" && selectionStart !== 0) ||
            (event.code === "ArrowDown" &&
                selectionStart !== event.currentTarget.value.length)
        ) {
            // do nothing
            return;
        }
        event.preventDefault();

        const newMsgIndex = userMsgIndex + (event.code === "ArrowUp" ? 1 : -1);
        const allMessages = [contentDraft, ...Array.from(userMessages).reverse()];

        if (newMsgIndex < 0 || newMsgIndex >= allMessages.length) {
            // index out of range, do nothing
            return;
        }
        setContent(allMessages.at(newMsgIndex) || "");
        setUserMsgIndex(newMsgIndex);
    };

    const onContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        const {value} = event.currentTarget;
        setContent(value);
        setContentDraft(value);
        setUserMsgIndex(0);
    };

    if (!chatId) return null;

    function messageRender(message: Message) {
        if (lastMessages?.has(message.id)) {
            return (<MessageItem key={message.id} message={message}/>)
        }
        return (
            <LazyLoad key={message.id} height={200} offset={100} unmountIfInvisible={true} placeholder={<Placeholder/>}>
                <MessageItem message={message}/>
            </LazyLoad>
        )
    }

    return (
        <>
            <Container pt="xl" pb={100}>
                <Stack spacing="xs">
                    {messages?.map((message) => (
                        messageRender(message)
                    ))}
                    <div ref={messagesEndRef}/>
                </Stack>
            </Container>
            <Box
                py="lg"
                sx={(theme) => ({
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    [`@media (min-width: ${theme.breakpoints.md})`]: {
                        left: 300,
                    },
                    backgroundColor:
                        theme.colorScheme === "dark"
                            ? theme.colors.dark[9]
                            : theme.colors.gray[0],
                })}
            >
                {messages?.length === 0 &&
                    <Group position="center" my={40}>
                        <SegmentedControl
                            value={model}
                            fullWidth
                            size="md"
                            sx={(theme) => ({
                                [`@media (min-width: ${theme.breakpoints.md})`]: {
                                    width: '30%',
                                },
                            })}
                            data={[
                                {label: 'GPT-3.5', value: 'gpt-3.5-turbo'},
                                {label: 'GPT-4', value: 'gpt-4'}
                            ]}
                            onChange={async (value: 'gpt-3.5-turbo' | 'gpt-4') => {
                                const model = value;
                                try {
                                    await db.settings.update("general", {
                                        openAiModel: model ?? undefined,
                                    });
                                    notifications.show({
                                        title: "Saved",
                                        message: "Your OpenAI Model has been saved.",
                                    });
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
                                }
                            }}
                        />
                    </Group>
                }
                <Container>
                    {messages?.length === 0 && (
                        <SimpleGrid
                            mb="sm"
                            spacing="xs"
                            breakpoints={[
                                {minWidth: "sm", cols: 4},
                                {maxWidth: "sm", cols: 2},
                            ]}
                        >
                            <Select
                                value={writingCharacter}
                                onChange={setWritingCharacter}
                                data={config.writingCharacters}
                                placeholder="Character"
                                variant="filled"
                                searchable
                                clearable
                                sx={{flex: 1}}
                            />
                            <Select
                                value={writingTone}
                                onChange={setWritingTone}
                                data={config.writingTones}
                                placeholder="Tone"
                                variant="filled"
                                searchable
                                clearable
                                sx={{flex: 1}}
                            />
                            <Select
                                value={writingStyle}
                                onChange={setWritingStyle}
                                data={config.writingStyles}
                                placeholder="Style"
                                variant="filled"
                                searchable
                                clearable
                                sx={{flex: 1}}
                            />
                            <Select
                                value={writingFormat}
                                onChange={setWritingFormat}
                                data={config.writingFormats}
                                placeholder="Format"
                                variant="filled"
                                searchable
                                clearable
                                sx={{flex: 1}}
                            />
                        </SimpleGrid>
                    )}
                    <Flex gap="sm">
                        <Textarea
                            key={chatId}
                            sx={{flex: 1}}
                            placeholder="Your message here..."
                            autosize
                            autoFocus
                            disabled={submitting}
                            minRows={1}
                            maxRows={5}
                            value={content}
                            onChange={onContentChange}
                            onKeyDown={async (event) => {
                                if (event.code === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    await submit();
                                    setUserMsgIndex(0);
                                }
                                if (event.code === "ArrowUp") {
                                    onUserMsgToggle(event);
                                }
                                if (event.code === "ArrowDown") {
                                    onUserMsgToggle(event);
                                }
                            }}
                        />
                        <MediaQuery largerThan="sm" styles={{display: "none"}}>
                            <Button
                                h="auto"
                                onClick={async () => {
                                    await submit();
                                }}
                            >
                                <AiOutlineSend/>
                            </Button>
                        </MediaQuery>
                        {submitting && (<Tooltip label={"Stop generating"} position="right">
                            <ActionIcon h={"auto"} onClick={() => abortGeneration()}>
                                <IconClockStop opacity={0.5} size={20}></IconClockStop>
                            </ActionIcon>
                        </Tooltip>)}
                    </Flex>
                </Container>
            </Box>
        </>
    );
}

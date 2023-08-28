import {Message} from "../db";
import {Container, Stack} from "@mantine/core";
import React, {memo, useEffect, useRef} from "react";
import {MessageItem} from "./MessageItem";

export interface MessageListProps {
    messages?: Message[];
}
export const MessageList =  memo( function MessageList({messages}: MessageListProps) {

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

    return <Container pt="xl" pb={100}>
        <Stack spacing="xs">
            {messages?.map((message) => (
                <MessageItem key={message.id} message={message}/>
            ))}
            <div ref={messagesEndRef}/>
        </Stack>
    </Container>
});
import {Message} from "../db";
import {Container, List, Stack} from "@mantine/core";
import React, {memo, useEffect, useRef} from "react";
import {MessageItem} from "./MessageItem";
import LazyLoad from "react-lazyload";
import {Placeholder} from "./Placeholder";

export interface MessageListProps {
    messages?: Message[];
}
export const MessageList =  memo( function MessageList({messages}: MessageListProps) {

    if (messages == undefined) return null;

    const lastMessages = new Map(messages?.slice(-8)?.map((message) => [message.id, true]));

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
                messageRender(message)
            ))}
            <div ref={messagesEndRef}/>
        </Stack>
    </Container>
});
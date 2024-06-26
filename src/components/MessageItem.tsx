import React, {ComponentPropsWithoutRef, memo} from 'react';

import {
    ActionIcon,
    Box,
    Card,
    Code,
    CopyButton,
    Flex,
    Table,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";


import {IconAdjustmentsCog, IconCopy, IconUser} from "@tabler/icons-react";
import {useMemo} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {Message} from "../db";
import "../styles/markdown.scss";
import {CreatePromptModal} from "./CreatePromptModal";
import {LogoIcon} from "./Logo";
import 'property-information';
import Highlight from 'react-highlight'
import 'highlight.js/styles/github-dark.css';
import Mermaid from "./Mermaid";
import {ReactMarkdownProps} from "react-markdown/lib/complex-types";

export interface MessageItemProps {
    message: Message;
}
export const MessageItem =  memo(function MessageItem({message}: MessageItemProps) {
    const wordCount = useMemo(() => {
        var matches = message.content.match(/[\w\d\’\'-\(\)]+/gi);
        return matches ? matches.length : 0;
    }, [message.content]);

    function getCodeBlock(className: string | undefined, props: Omit<ComponentPropsWithoutRef<"code"> & ReactMarkdownProps & {
        inline?: boolean
    }, "node" | "className" | "inline" | "lang">) {
        if (className == "language-mermaid") {
            if(message.isGenerating) {
                return <Code block {...props} />;
            }
            return <Mermaid
                chart={`${props.children as string}`}
            ></Mermaid>
        }
        return <Highlight
            className={className}
            children={`${props.children as string}`}
        />
    }

    return (
                <Card withBorder>
                    <Flex gap="sm">
                        {message.role === "user" && (
                            <ThemeIcon color="gray" size="lg">
                                <IconUser size={20}/>
                            </ThemeIcon>
                        )}
                        {message.role === "assistant" && <LogoIcon style={{height: 32}}/>}
                        {message.role === "system" && <IconAdjustmentsCog style={{height: 32}}/>}
                        <Box sx={{flex: 1, width: 0}} className="markdown">
                            <ReactMarkdown
                                children={message.content}
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: ({node, ...props}) => (
                                        <Table verticalSpacing="sm" highlightOnHover {...props} />
                                    ),
                                    code: ({ node, inline, className, lang, ...props }) => {

                                        if (inline) {
                                            return <Code {...props} />;
                                        };
                                        return <Box sx={{position: "relative"}}>
                                            {getCodeBlock(className, props)}
                                            <CopyButton value={String(props.children)}>
                                                {({ copied, copy }) => (
                                                    <Tooltip
                                                        label={copied ? "Copied" : "Copy"}
                                                        position="left"
                                                    >
                                                        <ActionIcon
                                                            sx={{ position: "absolute", top: 4, right: 4 }}
                                                            onClick={copy}
                                                        >
                                                            <IconCopy opacity={0.4} size={20} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </CopyButton>
                                        </Box>;

                                    },
                                }}
                            />
                            {message.role === "assistant" && (
                                <Box>
                                    <Text size="sm" color="dimmed">
                                        {wordCount} words
                                    </Text>
                                </Box>
                            )}
                        </Box>
                        <Box>
                            {message.role != "system" && (<CreatePromptModal content={message.content} chatId={message.chatId}/>)}
                            <CopyButton value={message.content}>
                                {({copied, copy}) => (
                                    <Tooltip label={copied ? "Copied" : "Copy"} position="left">
                                        <ActionIcon onClick={copy}>
                                            <IconCopy opacity={0.5} size={20}/>
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                            {/* <Tooltip label={`${wordCount} words`} position="left">
              <ActionIcon>
                <IconInfoCircle opacity={0.5} size={20} />
              </ActionIcon>
            </Tooltip> */}
                        </Box>
                    </Flex>
                </Card>
    );
}, (prevProps, nextProps) => prevProps.message.content == nextProps.message.content && prevProps.message.isGenerating == nextProps.message.isGenerating);

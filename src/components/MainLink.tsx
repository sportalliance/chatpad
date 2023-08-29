import {Center, Group, rem, Text, ThemeIcon, UnstyledButton} from "@mantine/core";
import {useLiveQuery} from "dexie-react-hooks";
import {Chat, db} from "../db";
import TimeAgo from 'javascript-time-ago'

import en from 'javascript-time-ago/locale/en.json'
import ReactTimeAgo from "react-time-ago";
import {IconClock, IconTimeDuration0, IconTimeDuration15} from "@tabler/icons-react";

TimeAgo.addDefaultLocale(en)

interface MainLinkProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    chat: Chat;
}

export function MainLink({icon, color, label, chat}: MainLinkProps) {
    const firstMessage = useLiveQuery(async () => {
        return (await db.messages.orderBy("createdAt").toArray()).filter(
            (m) => m.chatId === chat.id && m.role === "user"
        )[0];
    }, [chat]);

    return (
        <UnstyledButton
            sx={(theme) => ({
                // display: "block",
                width: "100%",
                padding: theme.spacing.xs,
                borderRadius: theme.radius.sm,
                color:
                    theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
            })}
        >
            <Group>
                <ThemeIcon color={color} variant="light">
                    {icon}
                </ThemeIcon>
                <Text
                    size="sm"
                    style={{
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        flex: 1,
                        width: 0,
                    }}
                >
                    {label} <br/>
                    {firstMessage?.content}
                </Text>

            </Group>
            <Group position={"right"}>
                <Center inline>
                    <IconClock size={rem(15)}></IconClock> <Text size={"xs"} ml={5}> <ReactTimeAgo date={chat.updatedAt}
                                                                                       locale="en-US"/></Text>
                </Center>
            </Group>
        </UnstyledButton>
    );
}

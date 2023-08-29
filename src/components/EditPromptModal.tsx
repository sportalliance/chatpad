import {
  ActionIcon,
  Button,
  Modal,
  Stack,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPencil } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { db, Prompt } from "../db";

export function EditPromptModal({ prompt }: { prompt: Prompt }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);

  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [systemValue, setSystemValue] = useState("");

  useEffect(() => {
    setValue(prompt?.content ?? "");
    setTitle(prompt?.title ?? "");
    setSystemValue(prompt?.system ?? "You are ChatGPT, a large language model trained by OpenAI. You are a helpful bot that chats with users.");
  }, [prompt]);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Edit Prompt" size="lg">
        <form
          onSubmit={async (event) => {
            try {
              setSubmitting(true);
              event.preventDefault();
              await db.prompts.where({ id: prompt.id }).modify((prompt) => {
                prompt.title = title;
                prompt.content = value;
                prompt.system = systemValue;
              });
              notifications.show({
                title: "Saved",
                message: "Prompt updated",
              });
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
            <TextInput
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              formNoValidate
              data-autofocus
            />
            <Textarea
                label="System"
                autosize
                minRows={5}
                maxRows={10}
                value={systemValue}
                onChange={(event) => setSystemValue(event.currentTarget.value)}
            />
            <Textarea
              label="Content"
              autosize
              minRows={5}
              maxRows={10}
              value={value}
              onChange={(event) => setValue(event.currentTarget.value)}
            />
            <Button type="submit" loading={submitting}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
      <Tooltip label="Edit Prompt">
        <ActionIcon size="lg" onClick={open}>
          <IconPencil size={20} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}

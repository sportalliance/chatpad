import {
  Alert,
  Anchor,
  Button,
  Flex,
  List,
  Modal,
  PasswordInput,
  TextInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useLiveQuery } from "dexie-react-hooks";
import { cloneElement, ReactElement, useEffect, useState } from "react";
import { db } from "../db";
import { config } from "../utils/config";
import { checkOpenAIKey } from "../utils/openai";

export function SettingsModal({ children }: { children: ReactElement }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);

  const [value, setValue] = useState("");
  const [model, setModel] = useState(config.defaultModel);
  const [type, setType] = useState(config.defaultType);
  const [auth, setAuth] = useState(config.defaultAuth);
  const [base, setBase] = useState("");
  const [version, setVersion] = useState("");

  const settings = useLiveQuery(async () => {
    return db.settings.where({ id: "general" }).first();
  });

  useEffect(() => {
    if (settings?.openAiApiKey) {
      setValue(settings.openAiApiKey);
    }
    if (settings?.openAiModel) {
      setModel(settings.openAiModel);
    }
    if (settings?.openAiApiType) {
      setType(settings.openAiApiType);
    }
    if (settings?.openAiApiAuth) {
      setAuth(settings.openAiApiAuth);
    }
    if (settings?.openAiApiBase) {
      setBase(settings.openAiApiBase);
    }
    if (settings?.openAiApiVersion) {
      setVersion(settings.openAiApiVersion);
    }
  }, [settings]);

  return (
    <>
      {cloneElement(children, { onClick: open })}
      <Modal opened={opened} onClose={close} title="Settings" size="lg">
        <Stack>
          <form
            onSubmit={async (event) => {
              try {
                setSubmitting(true);
                event.preventDefault();
                await checkOpenAIKey(value);
                await db.settings.where({ id: "general" }).modify((apiKey) => {
                  apiKey.openAiApiKey = value;
                  console.log(apiKey);
                });
                notifications.show({
                  title: "Saved",
                  message: "Your OpenAI Key has been saved.",
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
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Flex gap="xs" align="end">
              <PasswordInput
                label="OpenAI API Key"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                sx={{ flex: 1 }}
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
                formNoValidate
              />
              <Button type="submit" loading={submitting}>
                Save
              </Button>
            </Flex>
          </form>
          <List withPadding>
            <List.Item>
              <Text size="sm">
                <Anchor
                  href="https://platform.openai.com/account/api-keys"
                  target="_blank"
                >
                  Get your OpenAI API key
                </Anchor>
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm" color="dimmed">
                The API Key is stored locally on your browser and never sent
                anywhere else.
              </Text>
            </List.Item>
          </List>
          <Select
            label="OpenAI Type"
            value={type}
            onChange={async (value) => {
              setSubmitting(true);
              try {
                await db.settings.update("general", {
                  openAiApiType: value ?? 'openai',
                });
                notifications.show({
                  title: "Saved",
                  message: "Your OpenAI Type has been saved.",
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
              } finally {
                setSubmitting(false);
              }
            }}
            withinPortal
            data={[{ "value": "openai", "label": "OpenAI"}, { "value": "custom", "label": "Custom (e.g. Azure OpenAI)"}]}
          />
          <Select
            label="OpenAI Model"
            value={model}
            onChange={async (value) => {
              setSubmitting(true);
              try {
                await db.settings.update("general", {
                  openAiModel: value ?? undefined,
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
              } finally {
                setSubmitting(false);
              }
            }}
            withinPortal
            data={config.availableModels}
          />
          <Alert color="orange" title="Cost">
            Keep in mind the cost displayed is a close approximation and may not reflect the actual cost.
            Please use the usage tab to see your actual usage.
          </Alert>
        </Stack>
      </Modal>
    </>
  );
}

import { Group, SegmentedControl } from "@mantine/core";
import React from "react";

export type Model = "gpt-4o";

export function ModelChooser(props: {
  value: string,
  onChange: (model: Model) => Promise<void>
}) {
  return <Group position="center" my={40}>
    <SegmentedControl
      value={props.value}
      fullWidth
      size="md"
      sx={(theme) => ({
        [`@media (min-width: ${theme.breakpoints.md})`]: {
          width: '30%',
        },
      })}
      data={[
        { label: "GPT-4o", value: "gpt-4o" }
      ]}
      onChange={props.onChange}
    />
  </Group>;
}

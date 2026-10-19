---
name: expo-mcp
description: >-
  Use the Expo MCP server for EAS builds, submissions, workflows, docs, and
  TestFlight or Play diagnostics. Use when the user mentions Expo MCP, EAS
  MCP, mcp.expo.dev, build logs, or automating store tasks from Cursor.
---

# Expo MCP

There is one Expo MCP server. It includes EAS. There is no separate EAS MCP. It is not installed in this repo's tool list until the user adds it in Cursor.

- URL: `https://mcp.expo.dev/mcp`
- Transport: Streamable HTTP
- Auth: OAuth with an Expo account
- Docs: `https://docs.expo.dev/eas/ai/mcp/`

## What to call it for

Server tools cover Expo docs, `npx expo install` guidance, EAS build list/info/logs/run/cancel/submit, and EAS workflow list/info/logs/run/cancel/validate. They also cover TestFlight crashes and feedback, and Play crashes and reviews.

`search_documentation` requires a paid EAS plan. The build and submit tools do not. Prefer `read_documentation` when the plan is unknown.

`build_run` needs the GitHub repo connected to the Expo project. `build_submit` only accepts a finished build with a store distribution.

Do not reply to App Store or Play reviews unless the user explicitly asks. Those tools publish a public response.

## Local tools

Screenshots, taps, DevTools, and device logs need `expo-mcp` and a dev server:

```bash
npx expo install expo-mcp --dev
npx expo whoami || npx expo login
```

Start with `EXPO_UNSTABLE_MCP_SERVER=1` set, then reconnect the MCP client. Local iOS automation works on the simulator on macOS only. This machine is Windows, so do not promise iOS screenshots here.

Rep does not use Expo Router. Skip `expo_router_sitemap`.

## This project

Rep has no EAS project id until `eas build:configure` writes `extra.eas.projectId`. Build and workflow tools need that id or `@owner/Rep`. Follow [store-release](../store-release/SKILL.md) before triggering a store build from MCP.

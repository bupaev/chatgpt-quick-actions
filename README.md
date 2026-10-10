# ChatGPT Quick Actions

A [Raycast](https://www.raycast.com/) extension that performs one-shot actions (polish writing, summarize text, etc.) with any model available on [OpenRouter](https://openrouter.ai/models). An OpenRouter API key is required.

<a title="Install chatgpt-quick-actions Raycast Extension" href="https://www.raycast.com/alanzchen/chatgpt-quick-actions"><img src="https://www.raycast.com/alanzchen/chatgpt-quick-actions/install_button@2x.png" height="64" alt="" style="height: 64px;"></a>

https://user-images.githubusercontent.com/2144783/232259860-dcf47f25-cd1b-4612-a430-fedf58fabe28.mp4

## Features

- Results stream in real time
- Supports keyboard binding with specific command
- Supports custom prompt for each action
- Works with any OpenRouter model ID (OpenAI, Anthropic, Google, and others)
- Specify a global model or override it for each command

## Available Commands

| Command               | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| **Summarize**         | Summarize selected text                                                           |
| **Proofread**         | Proofread selected text                                                           |
| **Rewrite**           | Rewrite selected text with an academic tone                                       |
| **Refine**            | Refine writing and correct grammar mistakes                                       |
| **Custom Action**     | Ask the model based on a custom prompt                                            |
| **Execute**           | Replace selected text with the model output                                       |
| **Proofread (no UI)** | Proofread and replace selected text without opening a preview                     |
| **Rewrite (no UI)**   | Rewrite and replace selected text without opening a preview                       |
| **Refine (no UI)**    | Refine and replace selected text without opening a preview                        |
| **Preview**           | Use selected text as model input and preview the output                           |
| **Transform**         | Replace selected text with the model output, based on a prompt entered at runtime |
| **Ask**               | Ask the model a question using your input as context                              |

## Tips

- Regenerate the results with `cmd + R` if you are not satisfied.
- Retry with `cmd + shift + R` to temporarily use the smartest model set in the extension preferences (`Smartest Model`). The action is hidden while that field is empty.

---

## Development

This is a Raycast extension built with [TypeScript](https://www.typescriptlang.org/) and [React](https://reactjs.org/), using the [Raycast API](https://developers.raycast.com/).

### Prerequisites

- [Raycast](https://www.raycast.com/) installed
- [Node.js](https://nodejs.org/) (v22 or later)
- npm (comes with Node.js)

### Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/bupaev/chatgpt-quick-actions.git
   cd chatgpt-quick-actions
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the extension in development mode:

   ```bash
   npm run dev
   ```

   This will build the extension and start it in development mode with hot reloading. Raycast will open automatically and show your extension under the **Development** section in the root search.

4. Open the extension preferences, enter your **OpenRouter API Key** and set a **Model ID** such as `google/gemini-2.5-flash`.

5. Run the tests (they mock Raycast and OpenRouter, no API key needed):

   ```bash
   npm test
   ```

### Project Structure

```
chatgpt-quick-actions/
├── src/                  # Source code
│   ├── api.ts            # OpenRouter client and model resolution
│   ├── common.tsx        # Shared UI components and logic
│   ├── util.ts           # Token counting, cost estimate, SideNote
│   ├── summarize.tsx     # Summarize command
│   ├── proofread.tsx     # Proofread command
│   ├── rewrite.tsx       # Rewrite command
│   ├── refine.tsx        # Refine command
│   ├── proofread-no-ui.ts # Proofread command without preview
│   ├── rewrite-no-ui.ts  # Rewrite command without preview
│   ├── refine-no-ui.ts   # Refine command without preview
│   ├── custom.tsx        # Custom Action command
│   ├── execute.ts        # Execute command
│   ├── preview.tsx       # Preview command
│   └── ask.tsx           # Ask command
├── test/                 # Command tests (node:test, mocked Raycast API and OpenRouter)
├── assets/               # Extension icons and images
├── package.json          # Extension manifest and configuration
└── tsconfig.json         # TypeScript configuration
```

### Modifying the Extension

#### Adding or Changing Prompts

Each command has a customizable prompt defined in `package.json` under the command's `preferences` section. Users can also override prompts via Raycast preferences at runtime.

#### Models and Pricing

Models are free-form OpenRouter model IDs set in the preferences, globally or per command. Cost estimates use the manual input/output prices from the preferences and apply only to the global model.

#### Adding a New Command

1. Create a new `.tsx` file in the `src/` directory.
2. Add a corresponding command entry in the `commands` array in `package.json`.
3. Use the shared components from `src/common.tsx` for consistent UI behavior.

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run fix-lint
```

### Publishing

To publish this extension to the Raycast Store, follow the [Raycast publishing guide](https://developers.raycast.com/basics/publish-an-extension).

## License

MIT

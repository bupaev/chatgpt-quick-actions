# ChatGPT Quick Actions

A [Raycast](https://www.raycast.com/) extension that performs one-shot actions (polish writing, summarize text, etc.) with ChatGPT. A working OpenAI API key is required.

<a title="Install chatgpt-quick-actions Raycast Extension" href="https://www.raycast.com/alanzchen/chatgpt-quick-actions"><img src="https://www.raycast.com/alanzchen/chatgpt-quick-actions/install_button@2x.png" height="64" alt="" style="height: 64px;"></a>

https://user-images.githubusercontent.com/2144783/232259860-dcf47f25-cd1b-4612-a430-fedf58fabe28.mp4

## Features

- Results stream in real time
- Supports keyboard binding with specific command
- Supports custom prompt for each action
- Specify a global preferred model or customize preferred model for each command

## Available Commands

| Command | Description |
|---------|-------------|
| **Summarize** | Summarize selected text |
| **Rewrite** | Rewrite selected text with an academic tone |
| **Refine** | Refine writing and correct grammar mistakes |
| **Custom Action** | Ask ChatGPT based on a custom prompt |
| **Execute** | Replace selected text with ChatGPT output |
| **Preview** | Use selected text as ChatGPT input and preview output |
| **Transform** | Replace selected text with ChatGPT output, based on a prompt entered at runtime |
| **Ask** | Ask ChatGPT a question using your input as context |

## Tips

- Regenerate the results with `cmd + R` if you are not satisfied.
- Retry with `cmd + shift + R` to temporarily use `gpt-5.4-thinking` if you were using a different model for the command.

---

## Development

This is a Raycast extension built with [TypeScript](https://www.typescriptlang.org/) and [React](https://reactjs.org/), using the [Raycast API](https://developers.raycast.com/).

### Prerequisites

- [Raycast](https://www.raycast.com/) installed
- [Node.js](https://nodejs.org/) (v16 or later)
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

4. Enter your **OpenAI API Key** in the extension preferences when prompted.

### Project Structure

```
chatgpt-quick-actions/
├── src/                  # Source code
│   ├── api.ts            # OpenAI API client
│   ├── common.tsx        # Shared UI components and logic
│   ├── util.ts           # Helper utilities and model definitions
│   ├── summarize.tsx     # Summarize command
│   ├── rewrite.tsx       # Rewrite command
│   ├── refine.tsx        # Refine command
│   ├── custom.tsx        # Custom Action command
│   ├── execute.ts        # Execute command
│   ├── preview.tsx       # Preview command
│   └── ask.tsx           # Ask command
├── scripts/
│   └── models.js         # Script to generate model dropdown entries for package.json
├── assets/               # Extension icons and images
├── package.json          # Extension manifest and configuration
└── tsconfig.json         # TypeScript configuration
```

### Modifying the Extension

#### Adding or Changing Prompts

Each command has a customizable prompt defined in `package.json` under the command's `preferences` section. Users can also override prompts via Raycast preferences at runtime.

#### Updating Available Models

The list of available AI models is defined in `scripts/models.js`. To update the model list:

1. Edit `scripts/models.js` to add, remove, or reorder models (title, value, pricing).
2. Regenerate the model dropdown entries in `package.json`:

   ```bash
   npm run build-package
   ```

3. If you also changed pricing logic, update `src/util.ts` (`estimatePrice`) accordingly.
4. Rebuild the extension to verify everything compiles:

   ```bash
   npm run build
   ```

> **Note**: `npm run build-package` updates the Raycast manifest (`package.json`) — this controls the dropdowns shown in Raycast preferences. `npm run build` compiles the TypeScript source code. Both must be done when adding new models.

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

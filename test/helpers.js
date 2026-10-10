// Test harness: bundles real command entry points with esbuild, swaps @raycast/api for
// ./raycast-mock.js and replaces global fetch, so the real openai SDK talks to scripted OpenRouter responses.
const path = require("path");
const Module = require("module");
const esbuild = require("esbuild");
const React = require("react");
const TR = require("react-test-renderer");

const projectDir = path.resolve(__dirname, "..");
const mockPath = path.join(__dirname, "raycast-mock.js");
const raycast = require(mockPath);
// Inside node_modules so bundles resolve react from the project
const outDir = path.join(projectDir, "node_modules/.cache/command-tests");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return origResolve.call(this, request === "@raycast/api" ? mockPath : request, ...rest);
};

globalThis.IS_REACT_ACT_ENVIRONMENT = false;
const origError = console.error;
console.error = (...args) => {
  // Expected noise: the deprecated renderer and state updates outside act() from streaming
  if (/react-test-renderer is deprecated|not configured to support act/.test(String(args[0]))) return;
  origError(...args);
};
process.on("unhandledRejection", (e) => globalThis.__rc?.unhandled.push(String(e?.message)));

function loadCommand(entry) {
  const outfile = path.join(outDir, entry.replace(/[/.]/g, "_") + ".js");
  esbuild.buildSync({
    entryPoints: [path.join(projectDir, entry)],
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    outfile,
    logLevel: "error",
    external: ["react", "react/jsx-runtime", "@raycast/api"],
  });
  delete require.cache[outfile];
  return require(outfile).default;
}

const sse = (chunks) =>
  new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });

const chunk = (content, finish = null) => ({
  id: "c1",
  object: "chat.completion.chunk",
  created: 1,
  model: "m",
  choices: [{ index: 0, delta: content == null ? {} : { content }, finish_reason: finish }],
});

// OpenRouter's final streaming chunk: no choices, only usage (cost in credits = USD)
const usageChunk = ({ prompt = 10, completion = 5, reasoning = 0, cost = 0.000123 } = {}) => ({
  id: "c1",
  object: "chat.completion.chunk",
  created: 1,
  model: "m",
  choices: [],
  usage: {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    completion_tokens_details: { reasoning_tokens: reasoning },
    ...(cost === null ? {} : { cost }), // cost: null omits the field
  },
});

const emptyChunk = () => ({ id: "c1", object: "chat.completion.chunk", created: 1, model: "m", choices: [] });

const completion = (content) =>
  new Response(
    JSON.stringify({
      id: "c1",
      object: "chat.completion",
      created: 1,
      model: "m",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    }),
    { headers: { "content-type": "application/json" } },
  );

const apiError = (status, message) =>
  new Response(JSON.stringify({ error: { message, type: "invalid_request_error" } }), {
    status,
    headers: { "content-type": "application/json" },
  });

const basePrefs = {
  openrouterApiKey: "or-test",
  openrouterModel: "google/gemini-2.5-flash",
  // The smartest-model ID is a user setting without a default; any ID works here
  openrouterSmartModel: "anthropic/claude-opus-5.5",
};

// Resets the mocked Raycast state; `respond(request, n)` returns the Response for the n-th request
function setup({ prefs, selectedText = "Ths is a smal test.", respond }) {
  const rc = {
    prefs: { ...basePrefs, ...prefs },
    selectedText,
    toasts: [],
    huds: [],
    pasted: [],
    requests: [],
    unhandled: [],
  };
  globalThis.__rc = rc;
  globalThis.fetch = async (url, init) => {
    const request = {
      url: String(url),
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: JSON.parse(init.body),
      signal: init.signal,
    };
    rc.requests.push(request);
    return respond(request, rc.requests.length);
  };
  return rc;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(cond, timeout = 1000) {
  for (let t = 0; t < timeout && !cond(); t += 25) await wait(25);
  await wait(50);
}

// Renders a view command and waits until it stops loading; detail() returns the current Detail props
async function renderView(Command, props = {}) {
  let renderer;
  TR.act(() => {
    renderer = TR.create(React.createElement(Command, props));
  });
  const detail = () => renderer.root.findByType(raycast.Detail).props;
  await waitFor(() => !detail().isLoading);
  return { renderer, detail };
}

function walk(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, out));
  else if (node && typeof node === "object" && node.props) {
    out.push(node);
    walk(node.props.children, out);
  }
  return out;
}

const metadata = (d) =>
  Object.fromEntries(
    walk(d.metadata)
      .filter((n) => n.type === raycast.Detail.Metadata.Label)
      .map((n) => [n.props.title, n.props.text]),
  );

const actionNodes = (d) =>
  d.actions ? walk(d.actions).filter((n) => n.props.title && n.type !== raycast.ActionPanel) : [];
const actionTitles = (d) => actionNodes(d).map((n) => n.props.title);

function runAction(d, title) {
  const action = actionNodes(d).find((n) => n.props.title === title);
  if (!action) throw new Error(`Action "${title}" not found in ${JSON.stringify(actionTitles(d))}`);
  TR.act(() => {
    action.props.onAction();
  });
}

module.exports = {
  TR,
  React,
  actionTitles,
  apiError,
  chunk,
  completion,
  emptyChunk,
  loadCommand,
  metadata,
  renderView,
  runAction,
  setup,
  sse,
  usageChunk,
  waitFor,
};

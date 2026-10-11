const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
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
} = require("./helpers");

const OPENROUTER_URL = /^https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/;

describe("no-UI commands", () => {
  test("proofread sends system prompt and selected text to OpenRouter, pastes the trimmed result", async () => {
    const rc = setup({
      prefs: { prompt_proofread_no_ui: "PROOF" },
      respond: () => completion("  This is a small test.  "),
    });
    await loadCommand("src/proofread-no-ui.ts")();

    const [req] = rc.requests;
    assert.match(req.url, OPENROUTER_URL);
    assert.equal(req.headers.authorization, "Bearer or-test");
    assert.equal(req.headers["x-title"], "ChatGPT Quick Actions");
    assert.equal(req.body.model, "google/gemini-2.5-flash");
    // A custom prompt that does not mention the tags gets the <text-to-process> note appended
    assert.equal(req.body.messages.length, 2);
    assert.match(req.body.messages[0].content, /^PROOF\n\nThe input is inside <text-to-process> tags/);
    assert.deepEqual(req.body.messages[1], {
      role: "user",
      content: "<text-to-process>Ths is a smal test.</text-to-process>",
    });
    assert.deepEqual(rc.pasted, ["This is a small test."]);
    assert.equal(rc.huds.at(-1), "Proofread text pasted.");
  });

  test("execute uses the command override and no system prompt", async () => {
    const rc = setup({ prefs: { openrouter_model_execute: " anthropic/claude-x " }, respond: () => completion("ok") });
    await loadCommand("src/execute.ts")();

    const [req] = rc.requests;
    assert.equal(req.body.model, "anthropic/claude-x");
    assert.equal(req.body.messages.length, 1);
    assert.deepEqual(rc.pasted, ["ok"]);
  });

  test("API error ends in a HUD and pastes nothing", async () => {
    const rc = setup({ prefs: { prompt_refine_no_ui: "R" }, respond: () => apiError(401, "Invalid API key") });
    await loadCommand("src/refine-no-ui.ts")();

    assert.deepEqual(rc.pasted, []);
    assert.ok(
      rc.huds.some((h) => h.includes("Error from OpenRouter") && h.includes("Invalid API key")),
      rc.huds,
    );
  });

  test("no selected text ends in a HUD without a request", async () => {
    const rc = setup({ selectedText: null, respond: () => completion("x") });
    await loadCommand("src/rewrite-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.match(rc.huds[0], /^No text selected/);
  });

  test("missing API key ends in a HUD", async () => {
    const rc = setup({ prefs: { openrouterApiKey: "" }, respond: () => completion("x") });
    await loadCommand("src/proofread-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.ok(
      rc.huds.some((h) => h.includes("OpenRouter API Key")),
      rc.huds,
    );
  });

  test("missing model ends in a HUD", async () => {
    const rc = setup({ prefs: { openrouterModel: " " }, respond: () => completion("x") });
    await loadCommand("src/proofread-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.ok(
      rc.huds.some((h) => h.includes("Model ID")),
      rc.huds,
    );
  });

  test("transform uses the runtime prompt and the command model", async () => {
    const rc = setup({
      prefs: { openrouter_model_transform: "openai/gpt-6-luna" },
      respond: () => completion("UPPER"),
    });
    await loadCommand("src/transform.ts")({ arguments: { prompt: "Uppercase it" } });

    assert.equal(rc.requests[0].body.model, "openai/gpt-6-luna");
    assert.match(
      rc.requests[0].body.messages[0].content,
      /^Uppercase it\n\nThe input is inside <text-to-process> tags/,
    );
    assert.equal(rc.requests[0].body.messages[1].content, "<text-to-process>Ths is a smal test.</text-to-process>");
    assert.deepEqual(rc.pasted, ["UPPER"]);
    assert.equal(rc.huds.at(-1), "Transformed text pasted.");
  });

  test("transform without selected text ends in a HUD", async () => {
    const rc = setup({ selectedText: null, respond: () => completion("x") });
    await loadCommand("src/transform.ts")({ arguments: { prompt: "p" } });

    assert.equal(rc.requests.length, 0);
    assert.match(rc.huds[0], /^No text selected/);
  });
});

describe("result view", () => {
  test("streams the answer and shows OpenRouter usage, cost and actions", async () => {
    const rc = setup({
      prefs: { prompt_summarize: "SUM" },
      // Usage comes after the finish_reason chunk, as OpenRouter sends it
      respond: () =>
        sse([chunk("Hello"), chunk(", world"), chunk(null, "stop"), usageChunk({ prompt: 12, completion: 3 })]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.match(rc.requests[0].url, OPENROUTER_URL);
    assert.equal(rc.requests[0].body.stream, true);
    assert.equal(rc.requests[0].body.model, "google/gemini-2.5-flash");
    assert.match(rc.requests[0].body.messages[0].content, /^SUM\n\n/);
    assert.equal(detail().markdown, "Hello, world");
    assert.equal(detail().isLoading, false);
    const m = metadata(detail());
    assert.equal(m["Current Model"], "google/gemini-2.5-flash");
    assert.equal(m["Tokens"], "12 in · 3 out");
    assert.equal(m["Cost"], "$0.000123");
    assert.match(m["Response Time"], /^\d+\.\d s$/);
    const actions = actionTitles(detail());
    for (const title of ["Replace Selected", "Copy Results", "Retry", "Retry with Smartest Model"]) {
      assert.ok(actions.includes(title), `missing ${title} in ${actions}`);
    }
    assert.equal(rc.toasts[0].style, "success");
  });

  test("command override is used and its cost is reported", async () => {
    const rc = setup({
      prefs: { openrouter_model_proofread: "mistralai/mistral-x" },
      respond: () => sse([chunk("Fixed."), chunk(null, "stop"), usageChunk({ cost: 0.5 })]),
    });
    const { detail } = await renderView(loadCommand("src/proofread.tsx"));

    assert.equal(rc.requests[0].body.model, "mistralai/mistral-x");
    const m = metadata(detail());
    assert.equal(m["Current Model"], "mistralai/mistral-x");
    assert.equal(m["Cost"], "$0.500000");
  });

  test("reasoning tokens are shown within the output count; large numbers are grouped", async () => {
    setup({
      respond: () =>
        sse([chunk("x"), chunk(null, "stop"), usageChunk({ prompt: 12345, completion: 40, reasoning: 30 })]),
    });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));

    assert.equal(metadata(detail())["Tokens"], "12,345 in · 40 out (30 reasoning)");
  });

  test("missing usage or cost shows Unavailable", async () => {
    setup({ respond: () => sse([chunk("x"), chunk(null, "stop")]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));
    const m = metadata(detail());
    assert.equal(m["Tokens"], "Unavailable");
    assert.equal(m["Cost"], "Unavailable");

    setup({ respond: () => sse([chunk("x"), chunk(null, "stop"), usageChunk({ cost: null })]) });
    const second = await renderView(loadCommand("src/preview.tsx"));
    const m2 = metadata(second.detail());
    assert.equal(m2["Tokens"], "10 in · 5 out");
    assert.equal(m2["Cost"], "Unavailable");
  });

  test("usage always belongs to the latest request; a failed retry shows none", async () => {
    const rc = setup({
      respond: (req, n) =>
        n === 2
          ? apiError(400, "Upstream error")
          : sse([chunk("x"), chunk(null, "stop"), usageChunk({ prompt: 10 * n, completion: 5, cost: 0.25 })]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    assert.equal(metadata(detail())["Tokens"], "10 in · 5 out");

    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);
    assert.match(detail().markdown, /Upstream error/);
    assert.equal(metadata(detail())["Tokens"], "Unavailable");
    assert.equal(metadata(detail())["Cost"], "Unavailable");
    assert.equal(metadata(detail())["Response Time"], "Unavailable");

    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 3 && !detail().isLoading);
    const m = metadata(detail());
    assert.equal(m["Tokens"], "30 in · 5 out");
    assert.equal(m["Cost"], "$0.250000");
    assert.equal(m["Cumulative Tokens"], undefined);
  });

  test("API error is shown in the view", async () => {
    setup({ prefs: { prompt_rewrite: "W" }, respond: () => apiError(400, "Rate limit") });
    const { detail } = await renderView(loadCommand("src/rewrite.tsx"));

    assert.equal(detail().isLoading, false);
    assert.match(detail().markdown, /Failed to get response from OpenRouter/);
    assert.match(detail().markdown, /Rate limit/);
  });

  test("finish_reason=length finishes and flags the early stop", async () => {
    const rc = setup({ prefs: { prompt_custom: "C" }, respond: () => sse([chunk("Partial"), chunk(null, "length")]) });
    const { detail } = await renderView(loadCommand("src/custom.tsx"));

    assert.equal(detail().isLoading, false);
    assert.ok(actionTitles(detail()).includes("Copy Results"));
    assert.equal(rc.toasts[0].style, "failure");
    assert.match(rc.toasts[0].title, /Stopped early \(length\)/);
  });

  test("stream without finish_reason still finishes", async () => {
    setup({ respond: () => sse([chunk("A"), chunk("B")]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));

    assert.equal(detail().isLoading, false);
    assert.equal(detail().markdown, "AB");
  });

  test("chunks without choices are ignored", async () => {
    const rc = setup({
      prefs: { prompt_refine: "R" },
      respond: () => sse([chunk("Ok"), emptyChunk(), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/refine.tsx"));

    assert.equal(detail().markdown, "Ok");
    assert.deepEqual(rc.unhandled, []);
  });

  test("Retry keeps the command model", async () => {
    const rc = setup({
      prefs: { openrouter_model_summarize: "openai/gpt-6-luna" },
      respond: () => sse([chunk("x"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.equal(rc.requests[1].body.model, "openai/gpt-6-luna");
  });

  test("unmount aborts the in-flight request", async () => {
    const rc = setup({
      respond: (req) =>
        new Promise((_, reject) =>
          req.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        ),
    });
    let renderer;
    TR.act(() => {
      renderer = TR.create(React.createElement(loadCommand("src/summarize.tsx")));
    });
    await waitFor(() => rc.requests.length > 0);
    TR.act(() => renderer.unmount());
    await waitFor(() => false, 50);

    assert.equal(rc.requests[0].signal.aborted, true);
  });
});

describe("Retry with Smartest Model", () => {
  test("re-runs with the configured smartest model; plain Retry goes back to the command model", async () => {
    const rc = setup({ respond: () => sse([chunk("x"), chunk(null, "stop"), usageChunk()]) });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry with Smartest Model");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.match(rc.requests[1].url, OPENROUTER_URL);
    assert.equal(rc.requests[1].body.model, "anthropic/claude-opus-5.5");
    const m = metadata(detail());
    assert.equal(m["Current Model"], "anthropic/claude-opus-5.5");
    assert.equal(m["Cost"], "$0.000123");
    // Already on the smartest model: the action disappears
    assert.ok(!actionTitles(detail()).includes("Retry with Smartest Model"));
    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 3 && !detail().isLoading);
    assert.equal(rc.requests[2].body.model, "google/gemini-2.5-flash");
  });

  test("hidden when the smartest model is not configured", async () => {
    setup({ prefs: { openrouterSmartModel: "" }, respond: () => sse([chunk("x"), chunk(null, "stop")]) });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.ok(!actionTitles(detail()).includes("Retry with Smartest Model"));
    assert.ok(actionTitles(detail()).includes("Retry"));
  });
});

describe("reasoning effort", () => {
  const stream = () => sse([chunk("x"), chunk(null, "stop"), usageChunk()]);

  test("Model Default (the default) sends no reasoning parameter", async () => {
    const rc = setup({ prefs: { reasoningEffort: "default" }, respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.equal("reasoning" in rc.requests[0].body, false);
    assert.equal(metadata(detail())["Reasoning Effort"], undefined);
  });

  test("global effort is sent and shown; per-command 'global' follows it", async () => {
    const rc = setup({ prefs: { reasoningEffort: "low", reasoning_effort_summarize: "global" }, respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.deepEqual(rc.requests[0].body.reasoning, { effort: "low" });
    assert.equal(metadata(detail())["Reasoning Effort"], "low");
  });

  test("per-command override wins over the global effort", async () => {
    const rc = setup({ prefs: { reasoningEffort: "low", reasoning_effort_custom: "xhigh" }, respond: stream });
    await renderView(loadCommand("src/custom.tsx"));

    assert.deepEqual(rc.requests[0].body.reasoning, { effort: "xhigh" });
  });

  test("per-command Model Default overrides a global effort", async () => {
    const rc = setup({ prefs: { reasoningEffort: "high", reasoning_effort_proofread: "default" }, respond: stream });
    await renderView(loadCommand("src/proofread.tsx"));

    assert.equal("reasoning" in rc.requests[0].body, false);
  });

  test("unknown values are not sent", async () => {
    const rc = setup({ prefs: { reasoningEffort: "turbo" }, respond: stream });
    await renderView(loadCommand("src/preview.tsx"));

    assert.equal("reasoning" in rc.requests[0].body, false);
  });

  test("Retry with Smartest Model keeps the effort", async () => {
    const rc = setup({ prefs: { reasoningEffort: "minimal" }, respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry with Smartest Model");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.equal(rc.requests[1].body.model, "anthropic/claude-opus-5.5");
    assert.deepEqual(rc.requests[1].body.reasoning, { effort: "minimal" });
  });

  test("no-UI commands and transform send the effort too", async () => {
    let rc = setup({
      prefs: { reasoningEffort: "medium", reasoning_effort_proofread_no_ui: "none" },
      respond: () => completion("ok"),
    });
    await loadCommand("src/proofread-no-ui.ts")();
    assert.deepEqual(rc.requests[0].body.reasoning, { effort: "none" });

    rc = setup({ prefs: { reasoningEffort: "medium" }, respond: () => completion("ok") });
    await loadCommand("src/transform.ts")({ arguments: { prompt: "p" } });
    assert.deepEqual(rc.requests[0].body.reasoning, { effort: "medium" });
    assert.deepEqual(rc.pasted, ["ok"]);
  });
});

describe("provider routing", () => {
  const stream = () =>
    sse([
      { ...chunk("x"), provider: "Google" },
      { ...chunk(null, "stop"), provider: "Google" },
      { ...usageChunk(), provider: "Google" },
    ]);

  test("no provider order sends no provider object", async () => {
    const rc = setup({ respond: stream });
    await renderView(loadCommand("src/summarize.tsx"));

    assert.equal("provider" in rc.requests[0].body, false);
  });

  test("provider order is trimmed and sent with fallbacks left on", async () => {
    const rc = setup({
      prefs: {
        providerOrder: " google-vertex/europe,, google-vertex/eu ,amazon-bedrock/eu-west-1 ",
        providerFallbacks: true,
      },
      respond: stream,
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.deepEqual(rc.requests[0].body.provider, {
      order: ["google-vertex/europe", "google-vertex/eu", "amazon-bedrock/eu-west-1"],
    });
    assert.equal(metadata(detail())["Provider"], "Google");
  });

  test("turning fallbacks off restricts routing to the listed providers", async () => {
    const rc = setup({ prefs: { providerOrder: "google-vertex/europe", providerFallbacks: false }, respond: stream });
    await renderView(loadCommand("src/summarize.tsx"));

    assert.deepEqual(rc.requests[0].body.provider, { order: ["google-vertex/europe"], allow_fallbacks: false });
  });

  test("routing applies to Retry with Smartest Model, no-UI commands, and combines with effort", async () => {
    let rc = setup({ prefs: { providerOrder: "google-vertex/europe", reasoningEffort: "low" }, respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry with Smartest Model");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);
    assert.deepEqual(rc.requests[1].body.provider, { order: ["google-vertex/europe"] });
    assert.deepEqual(rc.requests[1].body.reasoning, { effort: "low" });

    rc = setup({ prefs: { providerOrder: "amazon-bedrock/eu-west-1" }, respond: () => completion("ok") });
    await loadCommand("src/refine-no-ui.ts")();
    assert.deepEqual(rc.requests[0].body.provider, { order: ["amazon-bedrock/eu-west-1"] });
  });

  test("Provider row is hidden when the response does not name one", async () => {
    setup({ respond: () => sse([chunk("x"), chunk(null, "stop")]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));

    assert.equal(metadata(detail())["Provider"], undefined);
  });
});

describe("selection and clipboard fallback", () => {
  const stream = () => sse([chunk("x"), chunk(null, "stop"), usageChunk()]);

  test("view: uses the selection and shows no Input row when the selection is readable", async () => {
    const rc = setup({ clipboard: "old clipboard", respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.equal(rc.requests[0].body.messages[1].content, "<text-to-process>Ths is a smal test.</text-to-process>");
    assert.equal(metadata(detail())["Input"], undefined);
  });

  for (const [label, selectedText] of [
    ["fails", null],
    ["is empty", ""],
  ]) {
    test(`view: falls back to the clipboard when the selection ${label}, and flags it`, async () => {
      const rc = setup({ selectedText, clipboard: "old clipboard", respond: stream });
      const { detail } = await renderView(loadCommand("src/summarize.tsx"));

      assert.equal(rc.requests[0].body.messages[1].content, "<text-to-process>old clipboard</text-to-process>");
      assert.equal(metadata(detail())["Input"].value, "Clipboard (no selection found)");
      assert.match(rc.toasts[0].title, /input from clipboard/);
    });
  }

  test("view: error when neither selection nor clipboard has text", async () => {
    const rc = setup({ selectedText: null, clipboard: undefined, respond: stream });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.equal(rc.requests.length, 0);
    assert.match(detail().markdown, /clipboard is empty/);
  });

  test("no-UI: never falls back to the clipboard", async () => {
    const rc = setup({ selectedText: null, clipboard: "old clipboard", respond: () => completion("x") });
    await loadCommand("src/proofread-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.deepEqual(rc.pasted, []);
    assert.match(rc.huds[0], /^No text selected/);
  });
});

describe("built-in prompts and <text-to-process> tags", () => {
  const stream =
    (text = "x") =>
    () =>
      sse([chunk(text), chunk(null, "stop"), usageChunk()]);
  const builtIn = [
    ["src/summarize.tsx", "You are a summarization function."],
    ["src/proofread.tsx", "You are a proofreading function."],
    ["src/rewrite.tsx", "You are a text rewriting function."],
    ["src/refine.tsx", "You are a text editing function."],
    ["src/custom.tsx", "You are a text editing function."],
  ];

  for (const [entry, opening] of builtIn) {
    test(`${entry} uses its built-in prompt when the preference is empty`, async () => {
      const rc = setup({ respond: stream() });
      await renderView(loadCommand(entry));

      const [system, user] = rc.requests[0].body.messages;
      assert.ok(system.content.startsWith(opening), system.content.slice(0, 60));
      // Built-in prompts describe the tags themselves, so no note is appended
      assert.ok(!system.content.includes("apply the instructions above"));
      assert.equal(user.content, "<text-to-process>Ths is a smal test.</text-to-process>");
    });
  }

  test("no-UI commands use the same built-in prompts", async () => {
    const rc = setup({ respond: () => completion("ok") });
    await loadCommand("src/rewrite-no-ui.ts")();

    assert.ok(rc.requests[0].body.messages[0].content.startsWith("You are a text rewriting function."));
    assert.equal(rc.requests[0].body.messages[1].content, "<text-to-process>Ths is a smal test.</text-to-process>");
  });

  test("a custom prompt that mentions <text-to-process> is used as is", async () => {
    const custom = "Translate the content of <text-to-process> to German.";
    const rc = setup({ prefs: { prompt_custom: custom }, respond: stream() });
    await renderView(loadCommand("src/custom.tsx"));

    assert.equal(rc.requests[0].body.messages[0].content, custom);
  });

  test("Execute and Preview send the selection as the request, without tags", async () => {
    let rc = setup({ respond: () => completion("ok") });
    await loadCommand("src/execute.ts")();
    assert.deepEqual(rc.requests[0].body.messages, [{ role: "user", content: "Ths is a smal test." }]);

    rc = setup({ respond: stream() });
    await renderView(loadCommand("src/preview.tsx"));
    assert.deepEqual(rc.requests[0].body.messages, [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Ths is a smal test." },
    ]);
  });

  test("tags echoed by the model are removed in the view and before pasting", async () => {
    setup({
      respond: () =>
        sse([chunk("<text-to-process>Fixed"), chunk(" text</text-to-process>"), chunk(null, "stop"), usageChunk()]),
    });
    const { detail } = await renderView(loadCommand("src/proofread.tsx"));
    assert.equal(detail().markdown, "Fixed text");

    const rc = setup({ respond: () => completion("<text-to-process>Fixed text</text-to-process>\n") });
    await loadCommand("src/proofread-no-ui.ts")();
    assert.deepEqual(rc.pasted, ["Fixed text"]);
  });

  test("Execute output is not unwrapped", async () => {
    const rc = setup({ respond: () => completion("<text-to-process>kept</text-to-process>") });
    await loadCommand("src/execute.ts")();
    assert.deepEqual(rc.pasted, ["<text-to-process>kept</text-to-process>"]);
  });
});

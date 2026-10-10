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
    assert.deepEqual(req.body.messages, [
      { role: "system", content: "PROOF" },
      { role: "user", content: "Ths is a smal test." },
    ]);
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
    assert.equal(rc.requests[0].body.messages[0].content, "Uppercase it");
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
    assert.equal(rc.requests[0].body.messages[0].content, "SUM");
    assert.equal(detail().markdown, "Hello, world");
    assert.equal(detail().isLoading, false);
    const m = metadata(detail());
    assert.equal(m["Current Model"], "google/gemini-2.5-flash");
    assert.equal(m["Prompt Tokens"], "12");
    assert.equal(m["Response Tokens"], "3");
    assert.equal(m["Total Tokens"], "15");
    assert.equal(m["Cost"], "$0.000123");
    assert.equal(m["Reasoning Tokens"], undefined);
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

  test("reasoning tokens get their own row", async () => {
    setup({ respond: () => sse([chunk("x"), chunk(null, "stop"), usageChunk({ completion: 40, reasoning: 30 })]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));

    assert.equal(metadata(detail())["Reasoning Tokens"], "30");
  });

  test("missing usage or cost shows Unavailable", async () => {
    setup({ respond: () => sse([chunk("x"), chunk(null, "stop")]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));
    const m = metadata(detail());
    assert.equal(m["Total Tokens"], "Unavailable");
    assert.equal(m["Cost"], "Unavailable");

    setup({ respond: () => sse([chunk("x"), chunk(null, "stop"), usageChunk({ cost: null })]) });
    const second = await renderView(loadCommand("src/preview.tsx"));
    const m2 = metadata(second.detail());
    assert.equal(m2["Total Tokens"], "15");
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
    assert.equal(metadata(detail())["Prompt Tokens"], "10");

    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);
    assert.match(detail().markdown, /Upstream error/);
    assert.equal(metadata(detail())["Total Tokens"], "Unavailable");
    assert.equal(metadata(detail())["Cost"], "Unavailable");
    assert.equal(metadata(detail())["Response Time"], "Unavailable");

    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 3 && !detail().isLoading);
    const m = metadata(detail());
    assert.equal(m["Prompt Tokens"], "30");
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

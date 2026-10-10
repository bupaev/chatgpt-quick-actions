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
  waitFor,
} = require("./helpers");

describe("no-UI commands", () => {
  test("proofread sends system prompt and selected text to OpenAI, pastes the trimmed result", async () => {
    const rc = setup({
      prefs: { prompt_proofread_no_ui: "PROOF", model_proofread_no_ui: "global" },
      respond: () => completion("  This is a small test.  "),
    });
    await loadCommand("src/proofread-no-ui.ts")();

    const [req] = rc.requests;
    assert.match(req.url, /^https:\/\/api\.openai\.com\/v1\/chat\/completions/);
    assert.equal(req.headers.authorization, "Bearer sk-test");
    assert.equal(req.body.model, "gpt-5-mini");
    assert.deepEqual(req.body.messages, [
      { role: "system", content: "PROOF" },
      { role: "user", content: "Ths is a smal test." },
    ]);
    assert.deepEqual(rc.pasted, ["This is a small test."]);
    assert.equal(rc.huds.at(-1), "Proofread text pasted.");
  });

  test("execute uses the OpenRouter override with OpenRouter headers and no system prompt", async () => {
    const rc = setup({
      prefs: { model_execute: "global", openrouter_model_execute: "anthropic/claude-x" },
      respond: () => completion("ok"),
    });
    await loadCommand("src/execute.ts")();

    const [req] = rc.requests;
    assert.match(req.url, /^https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/);
    assert.equal(req.headers.authorization, "Bearer or-test");
    assert.equal(req.headers["x-title"], "ChatGPT Quick Actions");
    assert.equal(req.body.model, "anthropic/claude-x");
    assert.equal(req.body.messages.length, 1);
    assert.deepEqual(rc.pasted, ["ok"]);
  });

  test("API error ends in a HUD and pastes nothing", async () => {
    const rc = setup({
      prefs: { prompt_refine_no_ui: "R", model_refine_no_ui: "global" },
      respond: () => apiError(401, "Incorrect API key"),
    });
    await loadCommand("src/refine-no-ui.ts")();

    assert.deepEqual(rc.pasted, []);
    assert.ok(
      rc.huds.some((h) => h.includes("Error from OpenAI") && h.includes("Incorrect API key")),
      rc.huds,
    );
  });

  test("no selected text ends in a HUD without a request", async () => {
    const rc = setup({ prefs: { model_rewrite_no_ui: "global" }, selectedText: null, respond: () => completion("x") });
    await loadCommand("src/rewrite-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.match(rc.huds[0], /^No text selected/);
  });

  test("missing API key ends in a HUD", async () => {
    const rc = setup({ prefs: { apikey: "", model_proofread_no_ui: "global" }, respond: () => completion("x") });
    await loadCommand("src/proofread-no-ui.ts")();

    assert.ok(
      rc.huds.some((h) => h.includes("OpenAI API Key")),
      rc.huds,
    );
  });

  test("missing OpenRouter model ends in a HUD", async () => {
    const rc = setup({
      prefs: { apiProvider: "openrouter", openrouterModel: " ", model_proofread_no_ui: "global" },
      respond: () => completion("x"),
    });
    await loadCommand("src/proofread-no-ui.ts")();

    assert.equal(rc.requests.length, 0);
    assert.ok(
      rc.huds.some((h) => h.includes("OpenRouter Model ID")),
      rc.huds,
    );
  });

  test("transform uses the runtime prompt and the command model", async () => {
    const rc = setup({ prefs: { model_transform: "gpt-5-nano" }, respond: () => completion("UPPER") });
    await loadCommand("src/transform.ts")({ arguments: { prompt: "Uppercase it" } });

    assert.equal(rc.requests[0].body.model, "gpt-5-nano");
    assert.equal(rc.requests[0].body.messages[0].content, "Uppercase it");
    assert.deepEqual(rc.pasted, ["UPPER"]);
    assert.equal(rc.huds.at(-1), "Transformed text pasted.");
  });

  test("transform without selected text ends in a HUD", async () => {
    const rc = setup({ prefs: { model_transform: "global" }, selectedText: null, respond: () => completion("x") });
    await loadCommand("src/transform.ts")({ arguments: { prompt: "p" } });

    assert.equal(rc.requests.length, 0);
    assert.match(rc.huds[0], /^No text selected/);
  });
});

describe("result view", () => {
  test("streams the answer and shows metadata and actions", async () => {
    const rc = setup({
      prefs: { prompt_summarize: "SUM", model_summarize: "global" },
      respond: () => sse([chunk("Hello"), chunk(", world"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.equal(rc.requests[0].body.stream, true);
    assert.equal(rc.requests[0].body.messages[0].content, "SUM");
    assert.equal(detail().markdown, "Hello, world");
    assert.equal(detail().isLoading, false);
    const m = metadata(detail());
    assert.equal(m["Provider"], "OpenAI");
    assert.equal(m["Current Model"], "gpt-5-mini");
    assert.ok(Number(m["Response Tokens"]) > 0);
    assert.match(m["Total Cost"], /^\$/);
    const actions = actionTitles(detail());
    for (const title of ["Replace Selected", "Copy Results", "Retry", "Retry with Smartest Model"]) {
      assert.ok(actions.includes(title), `missing ${title} in ${actions}`);
    }
    assert.equal(rc.toasts[0].style, "success");
  });

  test("OpenRouter provider uses the global model and manual prices", async () => {
    setup({
      prefs: { apiProvider: "openrouter", prompt_proofread: "P", model_proofread: "global" },
      respond: (req) =>
        req.url.includes("openrouter.ai") ? sse([chunk("Fixed."), chunk(null, "stop")]) : apiError(500, "wrong host"),
    });
    const { detail } = await renderView(loadCommand("src/proofread.tsx"));

    const m = metadata(detail());
    assert.equal(detail().markdown, "Fixed.");
    assert.equal(m["Provider"], "OpenRouter");
    assert.equal(m["Current Model"], "google/gemini-2.5-flash");
    assert.match(m["Total Cost"], /^\$/);
  });

  test("API error is shown in the view", async () => {
    setup({ prefs: { prompt_rewrite: "W", model_rewrite: "global" }, respond: () => apiError(400, "Rate limit") });
    const { detail } = await renderView(loadCommand("src/rewrite.tsx"));

    assert.equal(detail().isLoading, false);
    assert.match(detail().markdown, /Rate limit/);
  });

  test("finish_reason=length finishes and flags the early stop", async () => {
    const rc = setup({
      prefs: { prompt_custom: "C", model_custom: "global" },
      respond: () => sse([chunk("Partial"), chunk(null, "length")]),
    });
    const { detail } = await renderView(loadCommand("src/custom.tsx"));

    assert.equal(detail().isLoading, false);
    assert.ok(actionTitles(detail()).includes("Copy Results"));
    assert.equal(rc.toasts[0].style, "failure");
    assert.match(rc.toasts[0].title, /Stopped early \(length\)/);
  });

  test("stream without finish_reason still finishes", async () => {
    setup({ prefs: { model_preview: "global" }, respond: () => sse([chunk("A"), chunk("B")]) });
    const { detail } = await renderView(loadCommand("src/preview.tsx"));

    assert.equal(detail().isLoading, false);
    assert.equal(detail().markdown, "AB");
  });

  test("chunks without choices are ignored", async () => {
    const rc = setup({
      prefs: { prompt_refine: "R", model_refine: "global" },
      respond: () => sse([chunk("Ok"), emptyChunk(), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/refine.tsx"));

    assert.equal(detail().markdown, "Ok");
    assert.deepEqual(rc.unhandled, []);
  });

  test("Retry keeps the command model", async () => {
    const rc = setup({
      prefs: { prompt_summarize: "S", model_summarize: "gpt-5-nano" },
      respond: () => sse([chunk("x"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.equal(rc.requests[1].body.model, "gpt-5-nano");
  });

  test("unmount aborts the in-flight request", async () => {
    const rc = setup({
      prefs: { prompt_summarize: "S", model_summarize: "global" },
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
  test("OpenAI: re-runs with the configured smartest model", async () => {
    const rc = setup({
      prefs: { prompt_summarize: "S", model_summarize: "global" },
      respond: () => sse([chunk("x"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry with Smartest Model");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.match(rc.requests[1].url, /api\.openai\.com/);
    assert.equal(rc.requests[1].body.model, "gpt-6-astra");
    const m = metadata(detail());
    assert.equal(m["Current Model"], "gpt-6-astra");
    // Already on the smartest model: the action disappears, plain Retry goes back to the command model
    assert.ok(!actionTitles(detail()).includes("Retry with Smartest Model"));
    runAction(detail(), "Retry");
    await waitFor(() => rc.requests.length === 3 && !detail().isLoading);
    assert.equal(rc.requests[2].body.model, "gpt-5-mini");
  });

  test("OpenRouter: uses the OpenRouter smartest model; manual prices do not apply to it", async () => {
    const rc = setup({
      prefs: { apiProvider: "openrouter", prompt_summarize: "S", model_summarize: "global" },
      respond: () => sse([chunk("x"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));
    runAction(detail(), "Retry with Smartest Model");
    await waitFor(() => rc.requests.length === 2 && !detail().isLoading);

    assert.match(rc.requests[1].url, /openrouter\.ai/);
    assert.equal(rc.requests[1].body.model, "anthropic/claude-opus-5.5");
    const m = metadata(detail());
    assert.equal(m["Provider"], "OpenRouter");
    assert.equal(m["Total Cost"], "Unavailable");
  });

  test("hidden when the smartest model is not configured", async () => {
    setup({
      prefs: { smartModel: "", prompt_summarize: "S", model_summarize: "global" },
      respond: () => sse([chunk("x"), chunk(null, "stop")]),
    });
    const { detail } = await renderView(loadCommand("src/summarize.tsx"));

    assert.ok(!actionTitles(detail()).includes("Retry with Smartest Model"));
    assert.ok(actionTitles(detail()).includes("Retry"));
  });
});

// Minimal stand-in for @raycast/api, driven by globalThis.__rc
const React = require("react");
const rc = () => globalThis.__rc;

function el(name) {
  const C = (props) => React.createElement(name, props, props.children);
  C.displayName = name;
  return C;
}

const Detail = el("Detail");
Detail.Metadata = el("Metadata");
Detail.Metadata.Label = el("Label");
Detail.Metadata.Separator = el("Separator");
const ActionPanel = el("ActionPanel");
const Action = el("Action");
Action.Paste = el("ActionPaste");
Action.CopyToClipboard = el("ActionCopy");
Action.Push = el("ActionPush");
const Form = el("Form");
Form.TextArea = el("TextArea");
Form.Checkbox = el("Checkbox");
Form.Description = el("Description");

module.exports = {
  getPreferenceValues: () => ({ ...rc().prefs }),
  getSelectedText: async () => {
    if (rc().selectedText === null) throw new Error("Unable to get selected text");
    return rc().selectedText;
  },
  showToast: async (style, title) => {
    const t = { style, title };
    rc().toasts.push(t);
    return t;
  },
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  showHUD: async (m) => rc().huds.push(m),
  Clipboard: { paste: async (t) => rc().pasted.push(t) },
  closeMainWindow: async () => {},
  Icon: new Proxy({}, { get: (_, k) => String(k) }),
  Keyboard: { Shortcut: { Common: {} } },
  Detail,
  ActionPanel,
  Action,
  Form,
};

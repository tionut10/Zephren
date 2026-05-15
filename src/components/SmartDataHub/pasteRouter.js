/**
 * pasteRouter — Sprint Smart Input 2026 (2.1) — logică pură paste handling.
 *
 * Extrasă din SmartDataHub.handlePaste pentru testabilitate unitară.
 * Decide ce să facă cu conținutul clipboard-ului fără side-effects React.
 *
 * API:
 *   classifyPaste(clipboardData) → { kind, file?, text? }
 *     kind ∈ "image" | "file" | "text" | "ignore"
 *
 *   routePaste({ clipboardData, callbacks })
 *     callbacks = { onImage(File), onFile(File), onText(string) }
 *     returnează { handled: bool, kind, info?: string }
 *
 * Praguri:
 *   - text plain < MIN_TEXT_CHARS → "ignore" (lăsăm browserul să paste-uiască natural)
 *   - imagine → "image" prioritar (Ctrl+C pe screenshot, ex.)
 *   - file generic → "file"
 */

export const MIN_TEXT_CHARS = 30;

// Tipare exportate pentru claritate testare
export const PASTE_KINDS = Object.freeze({
  IMAGE: "image",
  FILE: "file",
  TEXT: "text",
  IGNORE: "ignore",
});

/**
 * Examinează clipboard-ul și clasifică conținutul.
 *
 * @param {DataTransfer | { items?: DataTransferItemList | Array, getData?: Function }} clipboardData
 * @returns {{ kind: string, file?: File, text?: string }}
 */
export function classifyPaste(clipboardData) {
  if (!clipboardData) return { kind: PASTE_KINDS.IGNORE };

  // 1. Caut item imagine (kind=file + type=image/*)
  const items = clipboardData.items;
  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
        const blob = typeof item.getAsFile === "function" ? item.getAsFile() : null;
        if (blob) {
          const ext = (item.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
          // Reutilizăm Blob direct dacă e deja File; altfel construim File sintetic
          const file = (blob instanceof File)
            ? blob
            : new File([blob], `clipboard-${Date.now()}.${ext}`, { type: item.type });
          return { kind: PASTE_KINDS.IMAGE, file };
        }
      }
    }

    // 2. Caut alt fișier (rar, ex. Firefox paste cu file)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file") {
        const file = typeof item.getAsFile === "function" ? item.getAsFile() : null;
        if (file) return { kind: PASTE_KINDS.FILE, file };
      }
    }
  }

  // 3. Text plain ≥ MIN_TEXT_CHARS
  if (typeof clipboardData.getData === "function") {
    const text = clipboardData.getData("text/plain") || "";
    if (text.trim().length >= MIN_TEXT_CHARS) {
      return { kind: PASTE_KINDS.TEXT, text: text.trim() };
    }
  }

  return { kind: PASTE_KINDS.IGNORE };
}

/**
 * Rutează conținutul clipboard-ului către callback-ul corespunzător.
 *
 * @param {object} args
 * @param {DataTransfer} args.clipboardData
 * @param {object} args.callbacks
 * @param {(file: File) => void} [args.callbacks.onImage]
 * @param {(file: File) => void} [args.callbacks.onFile]
 * @param {(text: string) => void} [args.callbacks.onText]
 * @returns {{ handled: boolean, kind: string, info?: string }}
 */
export function routePaste({ clipboardData, callbacks = {} }) {
  const result = classifyPaste(clipboardData);
  const { onImage, onFile, onText } = callbacks;

  switch (result.kind) {
    case PASTE_KINDS.IMAGE:
      if (typeof onImage === "function" && result.file) {
        onImage(result.file);
        return {
          handled: true,
          kind: PASTE_KINDS.IMAGE,
          info: `Imagine din clipboard (${result.file.name}) → Planșă AI`,
        };
      }
      return { handled: false, kind: PASTE_KINDS.IMAGE };

    case PASTE_KINDS.FILE:
      if (typeof onFile === "function" && result.file) {
        onFile(result.file);
        return {
          handled: true,
          kind: PASTE_KINDS.FILE,
          info: `Fișier lipit (${result.file.name})`,
        };
      }
      return { handled: false, kind: PASTE_KINDS.FILE };

    case PASTE_KINDS.TEXT:
      if (typeof onText === "function" && result.text) {
        onText(result.text);
        return {
          handled: true,
          kind: PASTE_KINDS.TEXT,
          info: `Text lipit (${result.text.length} caractere) → Chat AI`,
        };
      }
      return { handled: false, kind: PASTE_KINDS.TEXT };

    default:
      return { handled: false, kind: PASTE_KINDS.IGNORE };
  }
}

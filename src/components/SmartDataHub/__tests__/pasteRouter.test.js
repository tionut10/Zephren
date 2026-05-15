/**
 * Teste pentru pasteRouter — Sprint Smart Input 2026 (2.1)
 *
 * Acoperă clasificarea + rutarea conținutului clipboard fără DOM real.
 * Mock-uim DataTransfer ca obiect { items: [...], getData(type) }.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from "vitest";
import {
  classifyPaste,
  routePaste,
  PASTE_KINDS,
  MIN_TEXT_CHARS,
} from "../pasteRouter.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers pentru mock-uri DataTransfer
// ─────────────────────────────────────────────────────────────────────────────

function makeImageItem(type = "image/png", blobName = "screenshot.png") {
  // Construim un File real (jsdom oferă File în Node>=18 sau via polyfill)
  // Folosim Blob nativ (disponibil în Node 18+ runtime)
  const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type });
  // Atașăm proprietatea `name` pe blob pentru a-l face „File-like"
  const file = Object.assign(blob, { name: blobName });
  return {
    kind: "file",
    type,
    getAsFile: () => file,
  };
}

function makeGenericFileItem(type = "application/pdf", blobName = "doc.pdf") {
  const blob = new Blob([new Uint8Array([37, 80, 68, 70])], { type });
  const file = Object.assign(blob, { name: blobName });
  return {
    kind: "file",
    type,
    getAsFile: () => file,
  };
}

function makeTextItem() {
  // Item de tip "string" — DataTransferItem cu getData pe parent (DataTransfer)
  return { kind: "string", type: "text/plain" };
}

function makeClipboard({ items = [], text = "" } = {}) {
  return {
    items,
    getData: (type) => (type === "text/plain" ? text : ""),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// classifyPaste
// ─────────────────────────────────────────────────────────────────────────────

describe("classifyPaste", () => {
  it("clipboardData null → IGNORE", () => {
    expect(classifyPaste(null).kind).toBe(PASTE_KINDS.IGNORE);
    expect(classifyPaste(undefined).kind).toBe(PASTE_KINDS.IGNORE);
  });

  it("clipboard gol → IGNORE", () => {
    expect(classifyPaste(makeClipboard()).kind).toBe(PASTE_KINDS.IGNORE);
  });

  it("imagine PNG → IMAGE cu file populat", () => {
    const cb = makeClipboard({ items: [makeImageItem("image/png")] });
    const result = classifyPaste(cb);
    expect(result.kind).toBe(PASTE_KINDS.IMAGE);
    expect(result.file).toBeTruthy();
    expect(result.file.type).toBe("image/png");
  });

  it("imagine JPEG → IMAGE", () => {
    const cb = makeClipboard({ items: [makeImageItem("image/jpeg", "photo.jpg")] });
    expect(classifyPaste(cb).kind).toBe(PASTE_KINDS.IMAGE);
  });

  it("PDF generic → FILE", () => {
    const cb = makeClipboard({ items: [makeGenericFileItem("application/pdf")] });
    const result = classifyPaste(cb);
    expect(result.kind).toBe(PASTE_KINDS.FILE);
    expect(result.file?.type).toBe("application/pdf");
  });

  it("imagine + text → IMAGE prioritar (chiar dacă text e prezent)", () => {
    const cb = makeClipboard({
      items: [makeImageItem(), makeTextItem()],
      text: "Bloc P+4 Iași 1985, cazan gaz condensare, 80 apartamente",
    });
    expect(classifyPaste(cb).kind).toBe(PASTE_KINDS.IMAGE);
  });

  it("text ≥ MIN_TEXT_CHARS → TEXT", () => {
    const longText = "Bloc P+4 din 1985, București, încălzire centrală cu gaz, 80 apartamente, vânzare";
    const cb = makeClipboard({ items: [makeTextItem()], text: longText });
    const result = classifyPaste(cb);
    expect(result.kind).toBe(PASTE_KINDS.TEXT);
    expect(result.text).toBe(longText);
  });

  it("text < MIN_TEXT_CHARS → IGNORE", () => {
    const shortText = "scurt"; // 5 chars
    const cb = makeClipboard({ items: [makeTextItem()], text: shortText });
    expect(classifyPaste(cb).kind).toBe(PASTE_KINDS.IGNORE);
  });

  it("text exact pe prag (MIN_TEXT_CHARS chars) → TEXT", () => {
    const exactText = "a".repeat(MIN_TEXT_CHARS);
    const cb = makeClipboard({ items: [makeTextItem()], text: exactText });
    expect(classifyPaste(cb).kind).toBe(PASTE_KINDS.TEXT);
  });

  it("text cu whitespace → trim înainte de prag", () => {
    const text = "    " + "a".repeat(28) + "    "; // 28 utile dar 36 total
    const cb = makeClipboard({ items: [makeTextItem()], text });
    expect(classifyPaste(cb).kind).toBe(PASTE_KINDS.IGNORE);
  });

  it("getAsFile întoarce null → sare la următor", () => {
    const brokenItem = { kind: "file", type: "image/png", getAsFile: () => null };
    const cb = makeClipboard({
      items: [brokenItem, makeImageItem("image/jpeg")],
    });
    const result = classifyPaste(cb);
    // Primul broken e sărit, al doilea valid intră
    expect(result.kind).toBe(PASTE_KINDS.IMAGE);
    expect(result.file?.type).toBe("image/jpeg");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// routePaste — integrare cu callbacks
// ─────────────────────────────────────────────────────────────────────────────

describe("routePaste", () => {
  it("imagine → apelează onImage cu file-ul", () => {
    const onImage = vi.fn();
    const onFile  = vi.fn();
    const onText  = vi.fn();
    const cb = makeClipboard({ items: [makeImageItem()] });

    const result = routePaste({
      clipboardData: cb,
      callbacks: { onImage, onFile, onText },
    });

    expect(result.handled).toBe(true);
    expect(result.kind).toBe(PASTE_KINDS.IMAGE);
    expect(onImage).toHaveBeenCalledTimes(1);
    expect(onImage.mock.calls[0][0].type).toBe("image/png");
    expect(onFile).not.toHaveBeenCalled();
    expect(onText).not.toHaveBeenCalled();
    expect(result.info).toMatch(/Imagine/i);
  });

  it("PDF → apelează onFile", () => {
    const onImage = vi.fn();
    const onFile  = vi.fn();
    const cb = makeClipboard({ items: [makeGenericFileItem("application/pdf")] });

    const result = routePaste({ clipboardData: cb, callbacks: { onImage, onFile } });
    expect(result.handled).toBe(true);
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onImage).not.toHaveBeenCalled();
  });

  it("text lung → apelează onText cu textul trimmed", () => {
    const onText = vi.fn();
    const text = "  Bloc P+4 Iași 1985, cazan gaz condensare, 80 apartamente  ";
    const cb = makeClipboard({ items: [makeTextItem()], text });

    const result = routePaste({ clipboardData: cb, callbacks: { onText } });
    expect(result.handled).toBe(true);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onText.mock.calls[0][0]).toBe(text.trim());
  });

  it("text scurt → handled=false (nu blochează paste browser default)", () => {
    const onText = vi.fn();
    const cb = makeClipboard({ items: [makeTextItem()], text: "scurt" });

    const result = routePaste({ clipboardData: cb, callbacks: { onText } });
    expect(result.handled).toBe(false);
    expect(onText).not.toHaveBeenCalled();
  });

  it("fără callback corespunzător → handled=false dar kind detectat", () => {
    const cb = makeClipboard({ items: [makeImageItem()] });
    const result = routePaste({ clipboardData: cb, callbacks: {} });
    expect(result.handled).toBe(false);
    expect(result.kind).toBe(PASTE_KINDS.IMAGE);
  });

  it("clipboard gol → handled=false IGNORE", () => {
    const result = routePaste({ clipboardData: makeClipboard(), callbacks: {} });
    expect(result.handled).toBe(false);
    expect(result.kind).toBe(PASTE_KINDS.IGNORE);
  });

  it("imagine + text → routează la onImage (prioritar)", () => {
    const onImage = vi.fn();
    const onText  = vi.fn();
    const cb = makeClipboard({
      items: [makeImageItem(), makeTextItem()],
      text: "Bloc P+4 1985 București cazan gaz",
    });
    routePaste({ clipboardData: cb, callbacks: { onImage, onText } });
    expect(onImage).toHaveBeenCalledTimes(1);
    expect(onText).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export constants
// ─────────────────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("MIN_TEXT_CHARS este 30 (prag stabilit)", () => {
    expect(MIN_TEXT_CHARS).toBe(30);
  });

  it("PASTE_KINDS expune toate cele 4 valori", () => {
    expect(PASTE_KINDS.IMAGE).toBe("image");
    expect(PASTE_KINDS.FILE).toBe("file");
    expect(PASTE_KINDS.TEXT).toBe("text");
    expect(PASTE_KINDS.IGNORE).toBe("ignore");
  });
});

import katex from "katex";

function isEscaped(text, index) {
  let backslashCount = 0;
  let cursor = index - 1;

  while (cursor >= 0 && text[cursor] === "\\") {
    backslashCount += 1;
    cursor = cursor - 1;
  }

  return backslashCount % 2 === 1;
}

function findClosingDelimiter(text, delimiter, startIndex) {
  for (let index = startIndex; index < text.length; index += 1) {
    if (isEscaped(text, index) || !text.startsWith(delimiter, index)) {
      continue;
    }

    if (delimiter === "$" && text.startsWith("$$", index)) {
      continue;
    }

    return index;
  }

  return -1;
}

function isValidInlineFormula(formula) {
  return (
    formula.trim().length > 0 && !/^\s/.test(formula) && !/\s$/.test(formula)
  );
}

function renderFormula(formula, displayMode) {
  return katex.renderToString(formula.trim(), {
    displayMode,
    throwOnError: false,
    trust: false,
  });
}

export function renderMathText(node, { origin }) {
  const text = node.literal ?? "";
  const tokens = [];
  let textStart = 0;
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] !== "$" || isEscaped(text, cursor)) {
      cursor += 1;
      continue;
    }

    const delimiter = text.startsWith("$$", cursor) ? "$$" : "$";
    const formulaStart = cursor + delimiter.length;
    const formulaEnd = findClosingDelimiter(text, delimiter, formulaStart);

    if (formulaEnd === -1) {
      cursor += delimiter.length;
      continue;
    }

    const formula = text.slice(formulaStart, formulaEnd);
    const displayMode = delimiter === "$$";

    if (!displayMode && !isValidInlineFormula(formula)) {
      cursor += delimiter.length;
      continue;
    }

    if (cursor > textStart) {
      tokens.push({
        type: "text",
        content: text.slice(textStart, cursor),
      });
    }

    tokens.push({
      type: "html",
      content: renderFormula(formula, displayMode),
    });

    cursor = formulaEnd + delimiter.length;
    textStart = cursor;
  }

  if (!tokens.length) {
    return origin();
  }

  if (textStart < text.length) {
    tokens.push({
      type: "text",
      content: text.slice(textStart),
    });
  }

  return tokens;
}

function replaceMathText(text) {
  const tokens = renderMathText(
    { literal: text },
    {
      origin: () => [
        {
          type: "text",
          content: text,
        },
      ],
    },
  );

  return tokens.map((token) => token.content).join("");
}

function isFenceLine(line) {
  return /^\s*(```|~~~)/.test(line);
}

function isDisplayMathFenceLine(line) {
  return line.trim() === "$$";
}

export function renderMathInMarkdown(markdown = "") {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const renderedLines = [];
  let inFence = false;
  let displayMathLines = null;

  lines.forEach((line) => {
    if (isFenceLine(line) && displayMathLines === null) {
      inFence = !inFence;
      renderedLines.push(line);
      return;
    }

    if (!inFence && isDisplayMathFenceLine(line)) {
      if (displayMathLines === null) {
        displayMathLines = [];
      } else {
        renderedLines.push(renderFormula(displayMathLines.join("\n"), true));
        displayMathLines = null;
      }
      return;
    }

    if (displayMathLines !== null) {
      displayMathLines.push(line);
      return;
    }

    if (inFence || !line.includes("$")) {
      renderedLines.push(line);
      return;
    }

    renderedLines.push(replaceMathText(line));
  });

  if (displayMathLines !== null) {
    renderedLines.push("$$", ...displayMathLines);
  }

  return renderedLines.join("\n");
}

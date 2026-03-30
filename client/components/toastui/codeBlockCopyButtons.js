function getCodeBlocks(rootElement) {
    if (!rootElement) {
        return [];
    }

    return Array.from(rootElement.querySelectorAll("pre")).filter((preElement) =>
        preElement.querySelector("code"),
    );
}

function getCodeText(preElement) {
    const codeElement = preElement.querySelector("code");
    return codeElement?.textContent ?? preElement.textContent ?? "";
}

async function writeTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}

function setButtonLabel(button, label) {
    button.textContent = label;
    button.setAttribute("aria-label", label);
}

function attachCopyButton(preElement) {
    if (preElement.querySelector(".flatnotes-copy-code-button")) {
        return;
    }

    preElement.classList.add("flatnotes-copyable-code-block");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "flatnotes-copy-code-button";
    setButtonLabel(button, "Copy");

    button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const originalLabel = button.textContent || "Copy";

        try {
            await writeTextToClipboard(getCodeText(preElement));
            setButtonLabel(button, "Copied");
        } catch {
            setButtonLabel(button, "Failed");
        }

        window.setTimeout(() => {
            setButtonLabel(button, originalLabel);
        }, 1500);
    });

    preElement.appendChild(button);
}

export function syncCodeBlockCopyButtons(rootElement) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return;
    }

    getCodeBlocks(rootElement).forEach(attachCopyButton);
}

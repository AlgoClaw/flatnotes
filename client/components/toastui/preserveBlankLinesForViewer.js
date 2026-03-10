const blankLineMarker = '<div class="flatnotes-empty-line" aria-hidden="true"></div>';

function isBlankLine(line) {
    return /^[\t ]*$/.test(line);
}

function getFenceInfo(line) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!match) {
        return null;
    }

    return {
        character: match[1][0],
        length: match[1].length,
    };
}

function isClosingFence(line, fence) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})[\t ]*$/);
    return (
        match &&
        match[1][0] === fence.character &&
        match[1].length >= fence.length
    );
}

function findPreviousNonBlankLine(lines, startIndex) {
    for (let index = startIndex; index >= 0; index -= 1) {
        if (!isBlankLine(lines[index])) {
            return lines[index];
        }
    }

    return null;
}

function findNextNonBlankLine(lines, startIndex) {
    for (let index = startIndex; index < lines.length; index += 1) {
        if (!isBlankLine(lines[index])) {
            return lines[index];
        }
    }

    return null;
}

function getListIndent(line) {
    const match = line.match(/^( {0,3})(?:[*+-]|\d+[.)])\s+/);
    return match ? match[1].length : null;
}

function isBlockquoteLine(line) {
    return /^ {0,3}>/.test(line);
}

function isIndentedCodeLine(line) {
    return /^(?: {4,}|\t+)/.test(line);
}

function isSameListContext(previousLine, nextLine) {
    const previousIndent = getListIndent(previousLine);
    const nextIndent = getListIndent(nextLine);

    return previousIndent !== null && previousIndent === nextIndent;
}

function shouldInsertBlankLineMarkers(previousLine, nextLine) {
    if (!previousLine && !nextLine) {
        return false;
    }

    if (!previousLine || !nextLine) {
        return true;
    }

    if (isSameListContext(previousLine, nextLine)) {
        return false;
    }

    if (isBlockquoteLine(previousLine) && isBlockquoteLine(nextLine)) {
        return false;
    }

    if (isIndentedCodeLine(previousLine) && isIndentedCodeLine(nextLine)) {
        return false;
    }

    return true;
}

export default function preserveBlankLinesForViewer(markdown = "") {
    const normalizedMarkdown = markdown.replace(/\r\n?/g, "\n");
    const lines = normalizedMarkdown.split("\n");
    const output = [];

    let activeFence = null;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (activeFence) {
            output.push(line);
            if (isClosingFence(line, activeFence)) {
                activeFence = null;
            }
            continue;
        }

        const openingFence = getFenceInfo(line);
        if (openingFence) {
            output.push(line);
            activeFence = openingFence;
            continue;
        }

        if (!isBlankLine(line)) {
            output.push(line);
            continue;
        }

        let blankRunEnd = index;
        while (blankRunEnd < lines.length && isBlankLine(lines[blankRunEnd])) {
            blankRunEnd += 1;
        }

        const previousLine = findPreviousNonBlankLine(lines, index - 1);
        const nextLine = findNextNonBlankLine(lines, blankRunEnd);

        if (shouldInsertBlankLineMarkers(previousLine, nextLine)) {
            if (output.length && output[output.length - 1] !== "") {
                output.push("");
            }

            for (let markerIndex = index; markerIndex < blankRunEnd; markerIndex += 1) {
                output.push(blankLineMarker);
            }

            if (blankRunEnd < lines.length) {
                output.push("");
            }
        } else {
            for (let originalIndex = index; originalIndex < blankRunEnd; originalIndex += 1) {
                output.push(lines[originalIndex]);
            }
        }

        index = blankRunEnd - 1;
    }

    return output.join("\n");
}
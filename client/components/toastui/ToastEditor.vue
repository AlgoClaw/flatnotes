<template>
  <div ref="editorElement"></div>
</template>

<script setup>
import Editor from "@toast-ui/editor";
import { onBeforeUnmount, onMounted, ref } from "vue";

import baseOptions from "./baseOptions.js";
import { syncOrderedListStartStyles } from "./orderedListStartFix.js";

const props = defineProps({
  initialValue: String,
  initialEditType: {
    type: String,
    default: "markdown",
  },
  addImageBlobHook: Function,
});

const emit = defineEmits(["change", "keydown"]);

const editorElement = ref();
let toastEditor;
const initialMarkdown = props.initialValue ?? "";
let hasUserEditedContent = false;
let lastUserInteractionAt = 0;
let orderedListSyncAnimationFrame = null;
let isRestoringOriginalMarkdown = false;

function swallowEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.stopImmediatePropagation) {
    event.stopImmediatePropagation();
  }
}

function noteUserInteraction() {
  lastUserInteractionAt = Date.now();
}

function markContentEditedIfNeeded() {
  if (isRestoringOriginalMarkdown) {
    return;
  }

  if (Date.now() - lastUserInteractionAt < 1000) {
    hasUserEditedContent = true;
  }
}

function restoreOriginalMarkdownIfNeeded() {
  if (
    isRestoringOriginalMarkdown ||
    hasUserEditedContent ||
    !toastEditor?.isMarkdownMode?.()
  ) {
    return;
  }

  const currentMarkdown = toastEditor.getMarkdown();
  if (currentMarkdown === initialMarkdown) {
    return;
  }

  isRestoringOriginalMarkdown = true;

  try {
    toastEditor.setMarkdown(initialMarkdown, false);
  } finally {
    isRestoringOriginalMarkdown = false;
  }
}

function syncOrderedListStarts() {
  syncOrderedListStartStyles(editorElement.value);
}

function scheduleOrderedListStartSync() {
  if (typeof window === "undefined") {
    syncOrderedListStarts();
    return;
  }

  if (orderedListSyncAnimationFrame !== null) {
    return;
  }

  orderedListSyncAnimationFrame = window.requestAnimationFrame(() => {
    orderedListSyncAnimationFrame = null;
    syncOrderedListStarts();
  });
}

function cancelOrderedListStartSync() {
  if (
    typeof window !== "undefined" &&
    orderedListSyncAnimationFrame !== null
  ) {
    window.cancelAnimationFrame(orderedListSyncAnimationFrame);
    orderedListSyncAnimationFrame = null;
  }
}

function handleEditorRootClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (
    event.target.closest(
      ".toastui-editor-defaultUI-toolbar button, .toastui-editor-popup button, .toastui-editor-popup-body input, .toastui-editor-popup-body label",
    )
  ) {
    noteUserInteraction();
  }
}

function getMarkdownSelection() {
  if (!toastEditor?.isMarkdownMode?.()) {
    return null;
  }

  const selection = toastEditor.getSelection?.();
  if (!Array.isArray(selection) || selection.length !== 2) {
    return null;
  }

  const [start, end] = selection;
  if (!Array.isArray(start) || !Array.isArray(end)) {
    return null;
  }

  return {
    startLine: start[0],
    startColumn: start[1],
    endLine: end[0],
    endColumn: end[1],
  };
}

function shouldInsertLiteralOrderedListSpace() {
  const selection = getMarkdownSelection();
  if (!selection) {
    return false;
  }

  if (
    selection.startLine !== selection.endLine ||
    selection.startColumn !== selection.endColumn
  ) {
    return false;
  }

  const lineText =
    toastEditor.getMarkdown().split("\n")[selection.startLine - 1] ?? "";
  const cursorIndex = Math.max(selection.startColumn - 1, 0);
  const beforeCursor = lineText.slice(0, cursorIndex);
  const afterCursor = lineText.slice(cursorIndex);

  return afterCursor.length === 0 && /^\s*\d+[.)]$/.test(beforeCursor);
}

function tryInsertLiteralOrderedListSpace(event) {
  if (!shouldInsertLiteralOrderedListSpace()) {
    return false;
  }

  swallowEvent(event);
  toastEditor.replaceSelection(" ");
  return true;
}

function handleEditorKeydown(event) {
  noteUserInteraction();

  if (event.key === " " || event.key === "Spacebar") {
    tryInsertLiteralOrderedListSpace(event);
  }
}

function handleEditorBeforeInput(event) {
  noteUserInteraction();

  if (event.inputType === "insertText" && event.data === " ") {
    tryInsertLiteralOrderedListSpace(event);
  }
}

function addInteractionTracking() {
  if (!editorElement.value) {
    return;
  }

  editorElement.value.addEventListener("keydown", handleEditorKeydown, true);
  editorElement.value.addEventListener(
    "beforeinput",
    handleEditorBeforeInput,
    true,
  );
  editorElement.value.addEventListener("paste", noteUserInteraction, true);
  editorElement.value.addEventListener("cut", noteUserInteraction, true);
  editorElement.value.addEventListener("drop", noteUserInteraction, true);
  editorElement.value.addEventListener("click", handleEditorRootClick, true);
}

function removeInteractionTracking() {
  if (!editorElement.value) {
    return;
  }

  editorElement.value.removeEventListener("keydown", handleEditorKeydown, true);
  editorElement.value.removeEventListener(
    "beforeinput",
    handleEditorBeforeInput,
    true,
  );
  editorElement.value.removeEventListener("paste", noteUserInteraction, true);
  editorElement.value.removeEventListener("cut", noteUserInteraction, true);
  editorElement.value.removeEventListener("drop", noteUserInteraction, true);
  editorElement.value.removeEventListener("click", handleEditorRootClick, true);
}

onMounted(() => {
  toastEditor = new Editor({
    ...baseOptions,
    el: editorElement.value,
    initialValue: initialMarkdown,
    initialEditType: props.initialEditType,
    events: {
      change: () => {
        markContentEditedIfNeeded();
        scheduleOrderedListStartSync();
        emit("change");
      },
      keydown: (_, event) => {
        emit("keydown", event);
      },
    },
    hooks: props.addImageBlobHook
      ? { addImageBlobHook: props.addImageBlobHook }
      : {},
  });

  toastEditor.on("changeMode", () => {
    restoreOriginalMarkdownIfNeeded();
    scheduleOrderedListStartSync();
  });

  addInteractionTracking();
  scheduleOrderedListStartSync();
});

onBeforeUnmount(() => {
  removeInteractionTracking();
  cancelOrderedListStartSync();
});

function getMarkdown() {
  return hasUserEditedContent ? toastEditor.getMarkdown() : initialMarkdown;
}

function isWysiwygMode() {
  return toastEditor.isWysiwygMode();
}

defineExpose({ getMarkdown, isWysiwygMode });
</script>

<style>
@import "@toast-ui/editor/dist/toastui-editor.css";
@import "prismjs/themes/prism.css";
@import "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css";
@import "./toastui-editor-overrides.scss";
</style>

<template>
  <div ref="editorElement"></div>
</template>

<script setup>
import Editor from "@toast-ui/editor";
import { onBeforeUnmount, onMounted, ref } from "vue";

import baseOptions from "./baseOptions.js";

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

function noteUserInteraction() {
  lastUserInteractionAt = Date.now();
}

function markContentEditedIfNeeded() {
  if (Date.now() - lastUserInteractionAt < 1000) {
    hasUserEditedContent = true;
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

function addInteractionTracking() {
  if (!editorElement.value) {
    return;
  }

  editorElement.value.addEventListener("keydown", noteUserInteraction, true);
  editorElement.value.addEventListener("beforeinput", noteUserInteraction, true);
  editorElement.value.addEventListener("paste", noteUserInteraction, true);
  editorElement.value.addEventListener("cut", noteUserInteraction, true);
  editorElement.value.addEventListener("drop", noteUserInteraction, true);
  editorElement.value.addEventListener("click", handleEditorRootClick, true);
}

function removeInteractionTracking() {
  if (!editorElement.value) {
    return;
  }

  editorElement.value.removeEventListener("keydown", noteUserInteraction, true);
  editorElement.value.removeEventListener(
    "beforeinput",
    noteUserInteraction,
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

  addInteractionTracking();
});

onBeforeUnmount(() => {
  removeInteractionTracking();
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

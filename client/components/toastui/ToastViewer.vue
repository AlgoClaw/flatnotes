<template>
  <div ref="viewerElement"></div>
</template>

<script setup>
import Viewer from "@toast-ui/editor/dist/toastui-editor-viewer";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import baseOptions from "./baseOptions.js";
import extendedAutolinks from "./extendedAutolinks.js";
import preserveBlankLinesForViewer from "./preserveBlankLinesForViewer.js";

const props = defineProps({
  initialValue: String,
});

const emit = defineEmits(["tocGenerated"]);

const viewerElement = ref();
let viewerInstance = null;

function renderViewer() {
  if (!viewerElement.value) {
    emit("tocGenerated", []);
    return;
  }

  destroyViewer();

  viewerInstance = new Viewer({
    ...baseOptions,
    extendedAutolinks,
    el: viewerElement.value,
    initialValue: preserveBlankLinesForViewer(props.initialValue ?? ""),
  });

  nextTick(generateTableOfContents);
}

function destroyViewer() {
  if (viewerInstance) {
    viewerInstance.destroy();
    viewerInstance = null;
  }
}

function generateTableOfContents() {
  if (!viewerElement.value) {
    emit("tocGenerated", []);
    return;
  }

  const headings = Array.from(
    viewerElement.value.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );

  if (!headings.length) {
    emit("tocGenerated", []);
    return;
  }

  const slugCounts = Object.create(null);
  const toc = [];

  headings.forEach((heading, index) => {
    const text = heading.textContent?.trim();
    if (!text) {
      heading.removeAttribute("id");
      return;
    }

    const baseSlug = slugify(text) || `heading-${index + 1}`;
    const count = slugCounts[baseSlug] ?? 0;
    slugCounts[baseSlug] = count + 1;
    const id = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    heading.id = id;
    toc.push({
      id,
      level: Number(heading.tagName.replace("H", "")),
      text,
    });
  });

  emit("tocGenerated", toc);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

onMounted(renderViewer);
watch(
  () => props.initialValue,
  () => {
    if (viewerElement.value) {
      renderViewer();
    }
  },
);
onBeforeUnmount(destroyViewer);
</script>

<style>
@import "@toast-ui/editor/dist/toastui-editor-viewer.css";
@import "prismjs/themes/prism.css";
@import "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css";
@import "./toastui-editor-overrides.scss";
</style>

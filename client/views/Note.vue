<template>
  <!-- Confirm Deletion Modal -->
  <ConfirmModal
    v-model="isDeleteModalVisible"
    title="Confirm Deletion"
    :message="`Are you sure you want to delete the note '${note.title}'?`"
    confirmButtonText="Delete"
    confirmButtonStyle="danger"
    @confirm="deleteConfirmedHandler"
  />

  <!-- Save Changes Modal -->
  <ConfirmModal
    v-model="isSaveChangesModalVisible"
    title="Save Changes"
    message="Do you want to save your changes?"
    confirmButtonText="Save"
    confirmButtonStyle="success"
    rejectButtonText="Discard"
    rejectButtonStyle="danger"
    @confirm="saveHandler((close = true))"
    @reject="closeNote"
  />

  <!-- Draft Modal -->
  <ConfirmModal
    v-model="isDraftModalVisible"
    title="Draft Detected"
    message="There is an unsaved draft of this note stored in this browser. Do you want to resume the draft version or delete it?"
    confirmButtonText="Resume Draft"
    confirmButtonStyle="cta"
    rejectButtonText="Delete Draft"
    rejectButtonStyle="danger"
    @confirm="setEditMode()"
    @reject="
      clearDraft();
      setEditMode();
    "
  />

  <LoadingIndicator ref="loadingIndicator" class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex flex-col-reverse md:flex-row md:items-baseline">
      <!-- Title -->
      <div class="grow truncate text-3xl leading-[1.6em]">
        <span v-show="!editMode" :title="note.title">{{ note.title }}</span>
        <input
          v-show="editMode"
          v-model.trim="newTitle"
          class="w-full bg-theme-background outline-none"
          placeholder="Title"
        />
      </div>

      <!-- Buttons -->
      <div class="flex shrink-0 self-end md:self-baseline print:hidden">
        <CustomButton
          v-if="!isNewNote"
          class="ml-1"
          label="Download"
          :iconPath="mdiDownload"
          @click="downloadNote"
        />
        <!-- Save Button -->
        <CustomButton
          v-show="editMode"
          label="Save"
          :iconPath="mdilContentSave"
          @click="saveHandler((close = false))"
          class="relative ml-1"
        >
          <!-- Unsaved Changes Indicator -->
          <div
            v-show="unsavedChanges"
            class="absolute right-1 h-1.5 w-1.5 rounded-full bg-theme-brand"
          ></div>
        </CustomButton>
        <!-- Edit Toggle -->
        <Toggle
          v-if="canModify"
          label="Edit"
          :isOn="editMode"
          class="ml-1"
          @click="toggleEditModeHandler"
        />
        <CustomButton
          v-if="canModify && !isNewNote"
          class="ml-1"
          label="Menu"
          :iconPath="mdilMenu"
          @click="toggleNoteMenu"
        />
        <PrimeMenu ref="noteMenu" :model="noteMenuItems" :popup="true" />
      </div>
    </div>

    <hr v-if="!editMode" class="my-4 border-theme-border" />

    <!-- Content -->
    <div class="flex-1">
      <div v-if="!editMode" class="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          v-if="shouldRenderTableOfContents"
          ref="tableOfContentsElement"
          class="table-of-contents mb-4 overflow-y-auto overscroll-contain rounded border border-theme-border bg-theme-background-elevated px-4 py-3 text-sm text-theme-text shadow-sm lg:sticky lg:top-4 lg:mb-0 lg:self-start"
          :style="tableOfContentsStyle"
        >
          <nav class="flex flex-col text-theme-text" aria-label="Table of contents">
            <a
              v-for="item in tableOfContents"
              :key="item.id"
              class="rounded px-2 py-1 text-sm transition-colors hover:bg-theme-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-brand"
              :href="`${currentNoteLinkBase}#${item.id}`"
              :style="{ paddingLeft: `${(item.level - topLevelTableOfContentsHeading) * 12}px` }"
            >
              {{ item.text }}
            </a>
          </nav>
        </aside>

        <div class="min-w-0 flex-1">
          <ToastViewer
            :initialValue="note.content"
            :class="toastViewerClasses"
            @tocGenerated="handleTocGenerated"
          />
        </div>
      </div>

      <ToastEditor
        v-else
        ref="toastEditor"
        :initialValue="getInitialEditorValue()"
        :addImageBlobHook="addImageBlobHook"
        @change="startContentChangedTimeout"
        @keydown.capture="keydownHandler"
      />
    </div>
  </LoadingIndicator>
</template>

<style>
/* Disable checkboxes in view mode. See https://github.com/nhn/tui.editor/issues/1087. */
.toast-viewer li.task-list-item {
  pointer-events: none;
}
.toast-viewer li.task-list-item a {
  pointer-events: auto;
}
</style>

<script setup>
import { mdiDownload, mdiNoteOffOutline } from "@mdi/js";
import { mdilContentSave, mdilDelete, mdilMenu } from "@mdi/light-js";
import Mousetrap from "mousetrap";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  apiErrorHandler,
  createAttachment,
  createNote,
  deleteNote,
  getNote,
  updateNote,
} from "../api.js";
import { Note } from "../classes.js";
import ConfirmModal from "../components/ConfirmModal.vue";
import CustomButton from "../components/CustomButton.vue";
import LoadingIndicator from "../components/LoadingIndicator.vue";
import PrimeMenu from "../components/PrimeMenu.vue";
import Toggle from "../components/Toggle.vue";
import ToastEditor from "../components/toastui/ToastEditor.vue";
import ToastViewer from "../components/toastui/ToastViewer.vue";
import { authTypes } from "../constants.js";
import { useGlobalStore } from "../globalStore.js";
import { getToastOptions } from "../helpers.js";
import { isCurrentTokenStored } from "../tokenStorage.js";

const props = defineProps({
  title: String,
});

const canModify = computed(
  () => globalStore.config.authType != authTypes.readOnly,
);
let contentChangedTimeout = null;
const editMode = ref(false);
const globalStore = useGlobalStore();
const isSaveChangesModalVisible = ref(false);
const isDeleteModalVisible = ref(false);
const isDraftModalVisible = ref(false);
const isNewNote = computed(() => !props.title);
const loadingIndicator = ref();
const note = ref({});
const noteMenu = ref();
const reservedFilenameCharacters = /[<>:"/\\|?*]/;
const router = useRouter();
const newTitle = ref();
const toast = useToast();
const tableOfContentsElement = ref();
const tableOfContentsMaxHeight = ref("calc(100vh - 2rem)");
const toastEditor = ref();
const tableOfContents = ref([]);
let tableOfContentsHeightAnimationFrame = null;
const currentNoteLinkBase = computed(() => {
  const fullPath = router.currentRoute.value.fullPath || "/";
  return fullPath.split("#")[0];
});
const shouldDisplayTableOfContentsSetting = computed(() => {
  const value = globalStore.settings.displayTableOfContents;
  return value === undefined ? true : value;
});
const shouldRenderTableOfContents = computed(
  () =>
    shouldDisplayTableOfContentsSetting.value &&
    tableOfContents.value.length > 0,
);
const topLevelTableOfContentsHeading = computed(() => {
  if (tableOfContents.value.length === 0) {
    return 1;
  }

  return Math.min(...tableOfContents.value.map((item) => item.level));
});
const tableOfContentsStyle = computed(() => ({
  maxWidth: "16rem",
  maxHeight: tableOfContentsMaxHeight.value,
}));
const ctrlSSavesNote = computed(
  () => globalStore.settings.ctrlSSavesNote === true,
);
const justifyNoteText = computed(
  () => globalStore.settings.justifyNoteText === true,
);
const standardParagraphSpacing = computed(
  () => globalStore.settings.standardParagraphSpacing === true,
);
const bulletListSpacing = computed(
  () => globalStore.settings.bulletListSpacing === true,
);
const numberedListSpacing = computed(
  () => globalStore.settings.numberedListSpacing === true,
);
const toastViewerClasses = computed(() => {
  const classes = ["toast-viewer", "pb-4"];
  if (justifyNoteText.value) classes.push("setting-justify-text");
  if (standardParagraphSpacing.value)
    classes.push("setting-paragraph-spacing");
  if (bulletListSpacing.value) classes.push("setting-bullet-spacing");
  if (numberedListSpacing.value) classes.push("setting-numbered-spacing");
  return classes;
});
const noteMenuItems = computed(() => [
  {
    label: "Delete",
    icon: mdilDelete,
    command: deleteHandler,
  },
]);
const unsavedChanges = ref(false);

function toggleNoteMenu(event) {
  noteMenu.value?.toggle(event);
}

function downloadNote() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const content = editMode.value
    ? (toastEditor.value?.getMarkdown?.() ?? note.value.content ?? "")
    : (note.value.content ?? "");
  const title = note.value.title?.trim() || "note";
  const filename = `${title.replace(/[<>:"/\\|?*]/g, "_")}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function init() {
  // Return if we already have the note e.g. When we rename a note, the route prop would change but we’d already have the note.
  if (props.title && props.title == note.value.title) {
    return;
  }

  loadingIndicator.value.setLoading();
  if (props.title) {
    getNote(props.title)
      .then((data) => {
        note.value = data;
        loadingIndicator.value.setLoaded();
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          loadingIndicator.value.setFailed("Note not found", mdiNoteOffOutline);
        } else {
          loadingIndicator.value.setFailed();
          apiErrorHandler(error, toast);
        }
      });
  } else {
    newTitle.value = "";
    note.value = new Note();
    // Set the editMode to false to close any existing editors.
    // This ensures the editor is cleanly reinitialised in an empty state.
    // Simple fix for #266 without requiring a full re-work of the logic.
    editMode.value = false;
    nextTick(() => {
      editHandler();
      loadingIndicator.value.setLoaded();
    });
  }
}

// Note Editing
function toggleEditModeHandler() {
  if (editMode.value) {
    closeHandler();
  } else {
    editHandler();
  }
}

function editHandler() {
  const draftContent = loadDraft();
  if (draftContent) {
    isDraftModalVisible.value = true;
  } else {
    setEditMode();
  }
}

function setEditMode() {
  newTitle.value = note.value.title;
  unsavedChanges.value = false;
  editMode.value = true;
}

function getInitialEditorValue() {
  const draftContent = loadDraft();
  return draftContent ? draftContent : note.value.content;
}

// Note Deletion
function deleteHandler() {
  isDeleteModalVisible.value = true;
}

function deleteConfirmedHandler() {
  deleteNote(note.value.title)
    .then(() => {
      toast.add(getToastOptions("Note deleted ✓", "Success", "success"));
      router.push({ name: "home" });
    })
    .catch((error) => {
      apiErrorHandler(error, toast);
    });
}

// Note Saving
function saveHandler(close = false) {
  // Save Default Editor Mode
  saveDefaultEditorMode();

  // Empty Title Validation
  if (!newTitle.value) {
    toast.add(
      getToastOptions("Cannot save note without a title.", "Invalid", "error"),
    );
    return;
  }

  // Invalid Character Validation
  if (reservedFilenameCharacters.test(newTitle.value)) {
    badFilenameToast("Title");
    return;
  }

  // Save Note
  let newContent = toastEditor.value.getMarkdown();
  if (isNewNote.value) {
    saveNew(newTitle.value, newContent, close);
  } else {
    saveExisting(newTitle.value, newContent, close);
  }
}

function saveNew(newTitle, newContent, close = false) {
  createNote(newTitle, newContent)
    .then((data) => {
      clearDraft();
      note.value = data;
      router
        .push({
          name: "note",
          params: { title: note.value.title },
        })
        .then(() => {
          // Wait for the route to be updated before setting edit mode to false
          // as the route is used to determine the action.
          noteSaveSuccess(close);
        });
    })
    .catch(noteSaveFailure);
}

function saveExisting(newTitle, newContent, close = false) {
  // Return if no changes
  if (newTitle == note.value.title && newContent == note.value.content) {
    noteSaveSuccess(close);
    return;
  }

  updateNote(note.value.title, newTitle, newContent)
    .then((data) => {
      clearDraft();
      note.value = data;
      router.replace({ name: "note", params: { title: note.value.title } });
      noteSaveSuccess(close);
    })
    .catch(noteSaveFailure);
}

function noteSaveFailure(error) {
  if (error.response?.status === 409) {
    toast.add(
      getToastOptions(
        "A note with this title already exists. Please try again with a new title.",
        "Duplicate",
        "error",
      ),
    );
  } else if (error.response?.status === 413) {
    entityTooLargeToast("note");
  } else {
    apiErrorHandler(error, toast);
  }
}

function noteSaveSuccess(close = false) {
  unsavedChanges.value = false;
  if (close) {
    closeNote();
  }
  setBeforeUnloadConfirmation(false);
  toast.add(getToastOptions("Note saved successfully ✓", "Success", "success"));
}

// Note Closure
function closeHandler() {
  if (isContentChanged()) {
    isSaveChangesModalVisible.value = true;
  } else {
    closeNote();
  }
}

function closeNote() {
  clearDraft();
  editMode.value = false;
  if (isNewNote.value) {
    router.push({ name: "home" });
  } else {
    editMode.value = false;
  }
}

// Image Upload
function addImageBlobHook(file, callback) {
  const altTextInputValue = document.getElementById(
    "toastuiAltTextInput",
  )?.value;

  // Upload the image then use the callback to insert the URL into the editor
  postAttachment(file).then(function (data) {
    if (data) {
      // If the user has entered an alt text, use it. Otherwise, use the filename returned by the API.
      const altText = altTextInputValue ? altTextInputValue : data.filename;
      callback(data.url, altText);
    }
  });
}

function postAttachment(file) {
  // Invalid Character Validation
  if (reservedFilenameCharacters.test(file.name)) {
    badFilenameToast("Title");
    return;
  }

  // Uploading Toast
  toast.add(getToastOptions("Uploading attachment..."));

  // Upload the attachment
  return createAttachment(file)
    .then((data) => {
      // Success Toast
      toast.add(
        getToastOptions(
          "Attachment uploaded successfully ✓",
          "Success",
          "success",
        ),
      );
      return data;
    })
    .catch((error) => {
      if (error.response?.status === 409) {
        // Note: The current implementation will append a datetime to the filename if it already exists.
        // Error Toast
        toast.add(
          getToastOptions(
            "An attachment with this filename already exists.",
            "Duplicate",
            "error",
          ),
        );
      } else if (error.response?.status == 413) {
        entityTooLargeToast("attachment");
      } else {
        apiErrorHandler(error, toast);
      }
    });
}

// Content Change Watcher
function startContentChangedTimeout() {
  clearContentChangedTimeout();
  contentChangedTimeout = setTimeout(contentChangedHandler, 1000);
}

function clearContentChangedTimeout() {
  if (contentChangedTimeout != null) {
    clearTimeout(contentChangedTimeout);
  }
}

function contentChangedHandler() {
  if (isContentChanged()) {
    unsavedChanges.value = true;
    setBeforeUnloadConfirmation(true);
    saveDraft();
  } else {
    unsavedChanges.value = false;
    setBeforeUnloadConfirmation(false);
    clearDraft();
  }
}

// Drafts
function saveDraft() {
  const content = toastEditor.value.getMarkdown();
  const userHasPersistedToken = isCurrentTokenStored();
  if (content) {
    if (userHasPersistedToken) {
      localStorage.setItem(note.value.title, content);
    } else {
      sessionStorage.setItem(note.value.title, content);
    }
  }
}

function clearDraft() {
  localStorage.removeItem(note.value.title);
  sessionStorage.removeItem(note.value.title);
}

function loadDraft() {
  const localDraft = localStorage.getItem(note.value.title);
  const sessionDraft = sessionStorage.getItem(note.value.title);
  return localDraft || sessionDraft;
}

// Table of Contents
function updateTableOfContentsMaxHeight() {
  if (!tableOfContentsElement.value || typeof window === "undefined") {
    tableOfContentsMaxHeight.value = "calc(100vh - 2rem)";
    return;
  }

  const viewportBottomPadding = 16;
  const { top } = tableOfContentsElement.value.getBoundingClientRect();
  const availableHeight = Math.floor(
    window.innerHeight - top - viewportBottomPadding,
  );

  tableOfContentsMaxHeight.value =
    availableHeight > 0 ? `${availableHeight}px` : "calc(100vh - 2rem)";
}

function scheduleTableOfContentsMaxHeightUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  if (tableOfContentsHeightAnimationFrame !== null) {
    return;
  }

  tableOfContentsHeightAnimationFrame = window.requestAnimationFrame(() => {
    tableOfContentsHeightAnimationFrame = null;
    updateTableOfContentsMaxHeight();
  });
}

function cancelTableOfContentsMaxHeightUpdate() {
  if (
    typeof window !== "undefined" &&
    tableOfContentsHeightAnimationFrame !== null
  ) {
    window.cancelAnimationFrame(tableOfContentsHeightAnimationFrame);
    tableOfContentsHeightAnimationFrame = null;
  }
}

function handleTocGenerated(entries = []) {
  tableOfContents.value = entries;
}

// Keyboard Shortcuts
// 'e' to edit
Mousetrap.bind("e", () => {
  if (editMode.value === false && canModify.value) {
    editHandler();
  }
});

function swallowEvent(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  if (event.stopPropagation) {
    event.stopPropagation();
  }
  if (event.stopImmediatePropagation) {
    event.stopImmediatePropagation();
  }
}

function keydownHandler(event) {
  if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === "s") {
    if (ctrlSSavesNote.value) {
      swallowEvent(event);
      saveHandler((close = false));
      return;
    }
  }
  // Ctrl + Enter to save
  if ((event.ctrlKey || event.metaKey) && event.key == "Enter") {
    saveHandler((close = false));
  }
  // Escape to exit edit mode
  if (event.key == "Escape") {
    closeHandler();
  }
}

// Helpers
function entityTooLargeToast(entityName) {
  toast.add(
    getToastOptions(
      `This ${entityName} is too large. Please try again with a smaller ${entityName} or adjust your server configuration.`,
      "Failure",
      "error",
    ),
  );
}

function badFilenameToast(entityName) {
  toast.add(
    getToastOptions(
      'Due to filename restrictions, the following characters are not allowed: <>:"/\\|?*',
      `Invalid ${entityName}`,
      "error",
    ),
  );
}

function setBeforeUnloadConfirmation(enable = true) {
  if (enable) {
    window.onbeforeunload = () => {
      return true;
    };
  } else {
    window.onbeforeunload = null;
  }
}

function saveDefaultEditorMode() {
  localStorage.setItem("defaultEditorMode", "markdown");
}

function isContentChanged() {
  return (
    newTitle.value != note.value.title ||
    toastEditor.value.getMarkdown() != note.value.content
  );
}

watch(() => props.title, init);
watch(shouldRenderTableOfContents, (shouldRender) => {
  if (!shouldRender) {
    tableOfContentsMaxHeight.value = "calc(100vh - 2rem)";
    return;
  }

  nextTick(scheduleTableOfContentsMaxHeightUpdate);
});
watch(tableOfContents, () => {
  nextTick(scheduleTableOfContentsMaxHeightUpdate);
});
onMounted(() => {
  init();
  window.addEventListener("scroll", scheduleTableOfContentsMaxHeightUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleTableOfContentsMaxHeightUpdate, {
    passive: true,
  });
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", scheduleTableOfContentsMaxHeightUpdate);
  window.removeEventListener("resize", scheduleTableOfContentsMaxHeightUpdate);
  cancelTableOfContentsMaxHeightUpdate();
});
</script>

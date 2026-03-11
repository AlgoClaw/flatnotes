<template>
  <div
    class="mx-auto mt-6 mb-6 max-w-3xl rounded border border-theme-border bg-theme-background-elevated p-6 shadow-sm"
  >
    <h1 class="text-2xl font-semibold text-theme-text">Settings</h1>

    <section class="mt-6 space-y-8">
      <div>
        <p class="text-base font-medium text-theme-text">Site Name</p>
        <p class="text-sm text-theme-text-muted">
          Displayed in the browser tab and other areas that reference this installation.
        </p>
        <div
          class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <TextInput
            v-model="siteTitleInput"
            class="w-full sm:max-w-sm"
            aria-label="Site Name"
            @keyup.enter="saveSiteTitle"
          />
          <CustomButton
            label="Save"
            :disabled="isSaving || !isSiteTitleDirty"
            @click="saveSiteTitle"
          />
        </div>
      </div>

      <div>
        <p class="text-base font-medium text-theme-text">Light Mode Logo</p>
        <p class="text-sm text-theme-text-muted">
          Upload an image to replace the square brand mark in light mode. Square images work best.
        </p>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            class="flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-theme-border bg-theme-background"
          >
            <img
              v-if="hasCustomLogo"
              :src="customLogoDataUrl"
              alt="Custom logo preview"
              class="h-full w-full object-contain"
            />
            <div
              v-else
              class="flex h-9 w-9 items-center justify-center rounded bg-theme-brand text-lg font-semibold text-white"
            >
              f
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref="customLogoInput"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              class="hidden"
              @change="handleLogoSelected($event, 'customLogoDataUrl')"
            />
            <CustomButton
              label="Upload Logo"
              :disabled="isSaving"
              @click="openLogoPicker(customLogoInput)"
            />
            <CustomButton
              v-if="hasCustomLogo"
              label="Reset"
              style="danger"
              :disabled="isSaving"
              @click="resetLogo('customLogoDataUrl')"
            />
          </div>
        </div>
        <p class="mt-2 text-sm text-theme-text-muted">
          PNG, JPG, GIF, WEBP, or SVG. Maximum 512 KB.
        </p>
      </div>

      <div>
        <p class="text-base font-medium text-theme-text">Dark Mode Logo</p>
        <p class="text-sm text-theme-text-muted">
          Optional image used instead of the light logo when dark mode is enabled.
        </p>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            class="flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-theme-border bg-slate-900"
          >
            <img
              v-if="hasCustomDarkLogo"
              :src="customDarkLogoDataUrl"
              alt="Dark logo preview"
              class="h-full w-full object-contain"
            />
            <div
              v-else
              class="flex h-9 w-9 items-center justify-center rounded bg-theme-brand text-lg font-semibold text-white"
            >
              f
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref="customDarkLogoInput"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              class="hidden"
              @change="handleLogoSelected($event, 'customDarkLogoDataUrl')"
            />
            <CustomButton
              label="Upload Dark Logo"
              :disabled="isSaving"
              @click="openLogoPicker(customDarkLogoInput)"
            />
            <CustomButton
              v-if="hasCustomDarkLogo"
              label="Reset"
              style="danger"
              :disabled="isSaving"
              @click="resetLogo('customDarkLogoDataUrl')"
            />
          </div>
        </div>
        <p class="mt-2 text-sm text-theme-text-muted">
          If no dark logo is uploaded, the light logo is used as fallback.
        </p>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="hideLogoMarkEnabled"
          :disabled="isSaving"
          aria-label="Hide icon logo"
          @click="toggleHideLogoMark"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Hide Icon Logo</p>
          <p class="text-sm text-theme-text-muted">
            Remove the square “f” mark from the header.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="hideLogoWordmarkEnabled"
          :disabled="isSaving"
          aria-label="Hide wordmark logo"
          @click="toggleHideLogoWordmark"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Hide Wordmark</p>
          <p class="text-sm text-theme-text-muted">
            Remove the “flatnotes” text next to the icon.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="hideSiteIconEnabled"
          :disabled="isSaving"
          aria-label="Hide site favicon"
          @click="toggleHideSiteIcon"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Hide Site Icon</p>
          <p class="text-sm text-theme-text-muted">
            Remove the favicon / browser tab icon.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="displayTableOfContentsEnabled"
          :disabled="isSaving"
          aria-label="Display Table of Contents in Notes"
          @click="toggleDisplayTableOfContents"
        />
        <div>
          <p class="text-base font-medium text-theme-text">
            Display Table of Contents in Notes
          </p>
          <p class="text-sm text-theme-text-muted">
            Automatically show a generated outline when a note includes headings.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="ctrlSSavesNoteEnabled"
          :disabled="isSaving"
          aria-label="Use Ctrl+S to save notes"
          @click="toggleCtrlSSavesNote"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Ctrl + S Behavior</p>
          <p class="text-sm text-theme-text-muted">
            Choose whether Ctrl+S saves the current note (on) or formats text with strikethrough (off).
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="compactHeaderEnabled"
          :disabled="isSaving"
          aria-label="Use compact header spacing"
          @click="toggleCompactHeader"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Compact Header</p>
          <p class="text-sm text-theme-text-muted">
            Reduce the vertical spacing below the navigation bar.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="wideLayoutEnabled"
          :disabled="isSaving"
          aria-label="Increase site width"
          @click="toggleWideLayout"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Wider Layout</p>
          <p class="text-sm text-theme-text-muted">
            Expand the main content width (approx. 80% of the viewport) on larger screens.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="compactSearchResultsEnabled"
          :disabled="isSaving"
          aria-label="Use compact search result spacing"
          @click="toggleCompactSearchResults"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Compact Search Results</p>
          <p class="text-sm text-theme-text-muted">
            Reduce the spacing between items in the search results list.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="hideSearchTagsEnabled"
          :disabled="isSaving"
          aria-label="Hide search tags"
          @click="toggleHideSearchTags"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Hide Search Tags</p>
          <p class="text-sm text-theme-text-muted">
            Hide the #tags displayed alongside titles in search results.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="justifyNoteTextEnabled"
          :disabled="isSaving"
          aria-label="Justify note text"
          @click="toggleJustifyNoteText"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Justify Note Text</p>
          <p class="text-sm text-theme-text-muted">
            Align note content with straight edges on both sides.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="standardParagraphSpacingEnabled"
          :disabled="isSaving"
          aria-label="Standard paragraph spacing"
          @click="toggleStandardParagraphSpacing"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Paragraph Spacing</p>
          <p class="text-sm text-theme-text-muted">
            Add spacing before paragraphs and remove the extra spacing after them.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="bulletListSpacingEnabled"
          :disabled="isSaving"
          aria-label="Bullet list spacing"
          @click="toggleBulletListSpacing"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Bullet List Spacing</p>
          <p class="text-sm text-theme-text-muted">
            Remove spacing above bullet lists and add more space below.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Toggle
          :isOn="numberedListSpacingEnabled"
          :disabled="isSaving"
          aria-label="Numbered list spacing"
          @click="toggleNumberedListSpacing"
        />
        <div>
          <p class="text-base font-medium text-theme-text">Numbered List Spacing</p>
          <p class="text-sm text-theme-text-muted">
            Remove spacing above numbered lists and add more space below.
          </p>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup>
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";

import { apiErrorHandler, updateSettings } from "../api.js";
import CustomButton from "../components/CustomButton.vue";
import TextInput from "../components/TextInput.vue";
import Toggle from "../components/Toggle.vue";
import { defaultSiteTitle } from "../constants.js";
import { useGlobalStore } from "../globalStore.js";
import { getToastOptions } from "../helpers.js";

const globalStore = useGlobalStore();
const isSaving = ref(false);
const siteTitleInput = ref(defaultSiteTitle);
const customLogoInput = ref();
const customDarkLogoInput = ref();
const toast = useToast();
const maxCustomLogoFileSizeBytes = 512 * 1024;
const acceptedCustomLogoTypes = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const displayTableOfContentsEnabled = computed(() => {
  const value = globalStore.settings.displayTableOfContents;
  return value === undefined ? true : value;
});

const ctrlSSavesNoteEnabled = computed(
  () => globalStore.settings.ctrlSSavesNote === true,
);

const compactHeaderEnabled = computed(
  () => globalStore.settings.compactHeader === true,
);

const wideLayoutEnabled = computed(
  () => globalStore.settings.wideLayout === true,
);
const hideLogoMarkEnabled = computed(
  () => globalStore.settings.hideLogoMark === true,
);
const hideLogoWordmarkEnabled = computed(
  () => globalStore.settings.hideLogoWordmark === true,
);
const hideSiteIconEnabled = computed(
  () => globalStore.settings.hideSiteIcon === true,
);
const compactSearchResultsEnabled = computed(
  () => globalStore.settings.compactSearchResults === true,
);
const hideSearchTagsEnabled = computed(
  () => globalStore.settings.hideSearchTags === true,
);
const justifyNoteTextEnabled = computed(
  () => globalStore.settings.justifyNoteText === true,
);
const standardParagraphSpacingEnabled = computed(
  () => globalStore.settings.standardParagraphSpacing === true,
);
const bulletListSpacingEnabled = computed(
  () => globalStore.settings.bulletListSpacing === true,
);
const numberedListSpacingEnabled = computed(
  () => globalStore.settings.numberedListSpacing === true,
);
const customLogoDataUrl = computed(() => {
  const value = globalStore.settings.customLogoDataUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
});
const hasCustomLogo = computed(() => customLogoDataUrl.value !== null);
const customDarkLogoDataUrl = computed(() => {
  const value = globalStore.settings.customDarkLogoDataUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
});
const hasCustomDarkLogo = computed(() => customDarkLogoDataUrl.value !== null);

const isSiteTitleDirty = computed(() => {
  return (
    normalizeSiteTitle(siteTitleInput.value) !==
    normalizeSiteTitle(globalStore.settings.siteTitle)
  );
});

watch(
  () => globalStore.settings.siteTitle,
  (newValue) => {
    siteTitleInput.value = normalizeSiteTitle(newValue);
  },
  { immediate: true },
);

function toggleDisplayTableOfContents() {
  toggleSettingValue("displayTableOfContents", displayTableOfContentsEnabled.value);
}

function toggleCtrlSSavesNote() {
  toggleSettingValue("ctrlSSavesNote", ctrlSSavesNoteEnabled.value);
}

function toggleCompactHeader() {
  toggleSettingValue("compactHeader", compactHeaderEnabled.value);
}

function toggleWideLayout() {
  toggleSettingValue("wideLayout", wideLayoutEnabled.value);
}

function toggleSettingValue(settingKey, currentValue) {
  if (isSaving.value) {
    return;
  }
  persistSettings({ [settingKey]: !currentValue });
}

function toggleHideLogoMark() {
  toggleSettingValue("hideLogoMark", hideLogoMarkEnabled.value);
}

function toggleHideLogoWordmark() {
  toggleSettingValue("hideLogoWordmark", hideLogoWordmarkEnabled.value);
}

function toggleHideSiteIcon() {
  toggleSettingValue("hideSiteIcon", hideSiteIconEnabled.value);
}

function toggleCompactSearchResults() {
  toggleSettingValue(
    "compactSearchResults",
    compactSearchResultsEnabled.value,
  );
}

function toggleHideSearchTags() {
  toggleSettingValue("hideSearchTags", hideSearchTagsEnabled.value);
}

function toggleJustifyNoteText() {
  toggleSettingValue("justifyNoteText", justifyNoteTextEnabled.value);
}

function toggleStandardParagraphSpacing() {
  toggleSettingValue(
    "standardParagraphSpacing",
    standardParagraphSpacingEnabled.value,
  );
}

function toggleBulletListSpacing() {
  toggleSettingValue("bulletListSpacing", bulletListSpacingEnabled.value);
}

function toggleNumberedListSpacing() {
  toggleSettingValue("numberedListSpacing", numberedListSpacingEnabled.value);
}

function saveSiteTitle() {
  if (isSaving.value || !isSiteTitleDirty.value) {
    return;
  }
  persistSettings({ siteTitle: normalizeSiteTitle(siteTitleInput.value) });
}

function openLogoPicker(inputElement) {
  if (isSaving.value) {
    return;
  }

  inputElement?.click?.();
}

async function handleLogoSelected(event, settingKey) {
  const input = event.target;
  const file = input?.files?.[0];

  if (!file) {
    return;
  }

  try {
    validateCustomLogoFile(file);
    const dataUrl = await readFileAsDataUrl(file);
    persistSettings({ [settingKey]: dataUrl });
  } catch (error) {
    toast.add(
      getToastOptions(
        error instanceof Error ? error.message : "Unable to read logo file.",
        "Invalid Logo",
        "error",
      ),
    );
  } finally {
    if (input) {
      input.value = "";
    }
  }
}

function resetLogo(settingKey) {
  const hasValue =
    settingKey === "customDarkLogoDataUrl"
      ? hasCustomDarkLogo.value
      : hasCustomLogo.value;

  if (isSaving.value || !hasValue) {
    return;
  }

  persistSettings({ [settingKey]: null });
}

function validateCustomLogoFile(file) {
  if (!acceptedCustomLogoTypes.includes(file.type)) {
    throw new Error(
      "Please choose a PNG, JPG, GIF, WEBP, or SVG image.",
    );
  }

  if (file.size > maxCustomLogoFileSizeBytes) {
    throw new Error("Logo image must be 512 KB or smaller.");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read logo file."));
    };

    reader.onerror = () => {
      reject(new Error("Unable to read logo file."));
    };

    reader.readAsDataURL(file);
  });
}

function normalizeSiteTitle(value) {
  if (typeof value !== "string") {
    return defaultSiteTitle;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : defaultSiteTitle;
}

function persistSettings(payload) {
  isSaving.value = true;
  updateSettings(payload)
    .then((data) => {
      globalStore.settings = {
        ...globalStore.settings,
        ...data,
      };
      toast.add(
        getToastOptions(
          "Settings updated successfully ✓",
          "Success",
          "success",
        ),
      );
    })
    .catch((error) => {
      apiErrorHandler(error, toast);
    })
    .finally(() => {
      isSaving.value = false;
    });
}
</script>

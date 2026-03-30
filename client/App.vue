<template>
  <LoadingIndicator
    ref="loadingIndicator"
    :class="appContainerClasses"
  >
    <PrimeToast />
    <SearchModal v-model="isSearchModalVisible" />
    <NavBar
      v-if="showNavBar"
      ref="navBar"
      :class="{ 'print:hidden': route.name == 'note' }"
      :hide-logo="!showNavBarLogo"
      @toggleSearchModal="toggleSearchModal"
    />
    <RouterView />
  </LoadingIndicator>
</template>

<script setup>
import Mousetrap from "mousetrap";
import "mousetrap/plugins/global-bind/mousetrap-global-bind";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import { apiErrorHandler, getConfig, getSettings } from "./api.js";
import PrimeToast from "./components/PrimeToast.vue";
import { authTypes, defaultSiteTitle } from "./constants.js";
import { useGlobalStore } from "./globalStore.js";
import { loadTheme } from "./helpers.js";
import NavBar from "./partials/NavBar.vue";
import SearchModal from "./partials/SearchModal.vue";
import LoadingIndicator from "./components/LoadingIndicator.vue";

const globalStore = useGlobalStore();
const isSearchModalVisible = ref(false);
const loadingIndicator = ref();
const navBar = ref();
const route = useRoute();
const router = useRouter();
const toast = useToast();

// '/' to search
Mousetrap.bind("/", () => {
  if (route.name !== "login") {
    toggleSearchModal();
    return false;
  }
});

// 'CTRL + ALT/OPT + N' to create new note
Mousetrap.bindGlobal("ctrl+alt+n", () => {
  if (route.name !== "login") {
    router.push({ name: "new" });
    return false;
  }
});

// 'CTRL + ALT/OPT + H' to go to home
Mousetrap.bindGlobal("ctrl+alt+h", () => {
  if (route.name !== "login") {
    router.push({ name: "home" });
    return false;
  }
});

const defaultSettings = {
  displayTableOfContents: true,
  siteTitle: defaultSiteTitle,
  ctrlSSavesNote: false,
  compactHeader: false,
  wideLayout: false,
  hideLogoMark: false,
  hideLogoWordmark: false,
  customLogoDataUrl: null,
  customDarkLogoDataUrl: null,
  hideSiteIcon: false,
  compactSearchResults: false,
  hideSearchTags: false,
  justifyNoteText: false,
  standardParagraphSpacing: false,
  bulletListSpacing: false,
  numberedListSpacing: false,
};

Promise.all([
  getConfig(),
  getSettings().catch((error) => {
    console.error("Failed to load settings. Using defaults.", error);
    return {};
  }),
])
  .then(([configData, settingsData]) => {
    globalStore.config = configData;
    globalStore.settings = {
      ...defaultSettings,
      ...settingsData,
    };
    loadingIndicator.value.setLoaded();
    updateDocumentTitle();
  })
  .catch((error) => {
    apiErrorHandler(error, toast);
    loadingIndicator.value.setFailed();
  });

watch(
  () => [route.name, route.params.title, globalStore.settings.siteTitle],
  () => updateDocumentTitle(),
);

watch(
  () => [route.name, globalStore.config.authType],
  ([routeName, authType]) => {
    if (routeName === "settings" && authType === authTypes.readOnly) {
      router.replace({ name: "home" });
    }
  },
  { immediate: true },
);

const showNavBar = computed(() => {
  return route.name !== "login";
});

const showNavBarLogo = computed(() => {
  return route.name !== "home";
});

const wideLayout = computed(() => globalStore.settings.wideLayout === true);
const hideSiteIconSetting = computed(
  () => globalStore.settings.hideSiteIcon === true,
);

const appContainerClasses = computed(() => [
  "container mx-auto flex min-h-screen flex-col px-2 py-4 print:max-w-full",
  wideLayout.value ? "md:max-w-[80vw]" : "",
]);

watch(
  () => hideSiteIconSetting.value,
  (hide) => updateSiteIconVisibility(!hide),
  { immediate: true },
);

function getSiteTitle() {
  const rawTitle = globalStore.settings.siteTitle;
  if (typeof rawTitle !== "string") {
    return defaultSiteTitle;
  }
  const trimmed = rawTitle.trim();
  return trimmed.length ? trimmed : defaultSiteTitle;
}

function updateDocumentTitle() {
  const baseTitle = getSiteTitle();
  if (route.name === "note") {
    if (route.params.title) {
      document.title = `${route.params.title} - ${baseTitle}`;
      return;
    }
    document.title = `New Note - ${baseTitle}`;
    return;
  }
  if (route.name === "settings") {
    document.title = `Settings - ${baseTitle}`;
    return;
  }
  document.title = baseTitle;
}

const defaultIconLinks = [];
const blankIconHref = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function cacheDefaultIconLinks() {
  if (defaultIconLinks.length) {
    return;
  }
  document
    .querySelectorAll('link[rel*="icon"], link[rel="shortcut icon"]')
    .forEach((link) => {
      defaultIconLinks.push({
        rel: link.getAttribute("rel"),
        href: link.getAttribute("href"),
        sizes: link.getAttribute("sizes"),
        type: link.getAttribute("type"),
      });
    });
}

function updateSiteIconVisibility(shouldShow) {
  cacheDefaultIconLinks();
  const selector = 'link[rel*="icon"], link[rel="shortcut icon"]';
  document.querySelectorAll(selector).forEach((link) => link.remove());
  if (!shouldShow) {
    const blankLink = document.createElement("link");
    blankLink.setAttribute("rel", "icon");
    blankLink.setAttribute("href", blankIconHref);
    document.head.appendChild(blankLink);
    return;
  }
  const head = document.head;
  defaultIconLinks.forEach((data) => {
    const link = document.createElement("link");
    link.setAttribute("rel", data.rel ?? "icon");
    if (data.href) {
      link.setAttribute("href", data.href);
    }
    if (data.sizes) {
      link.setAttribute("sizes", data.sizes);
    }
    if (data.type) {
      link.setAttribute("type", data.type);
    }
    head.appendChild(link);
  });
}

function toggleSearchModal() {
  isSearchModalVisible.value = !isSearchModalVisible.value;
}

loadTheme();
</script>

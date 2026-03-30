import { defineStore } from "pinia";
import { ref } from "vue";

export const useGlobalStore = defineStore("global", () => {
  const config = ref({});
  const settings = ref({});
  const version = ref({});

  return { config, settings, version };
});

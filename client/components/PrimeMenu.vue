<template>
  <Menu ref="menu" :pt="style">
    <template #item="{ item, props }">
      <a
        class="flex items-center justify-between"
        v-bind="props.action"
        @click="handleItemClick($event, item, props)"
        :aria-disabled="item.disabled"
        :class="{
          'pointer-events-none cursor-default opacity-50': item.disabled,
        }"
      >
        <IconLabel :iconPath="item.icon" :label="item.label" />
        <span
          v-if="item.keyboardShortcut"
          class="ml-4 rounded bg-theme-background-elevated px-3 py-1 text-xs"
          >{{ item.keyboardShortcut }}</span
        >
      </a>
    </template>
  </Menu>
</template>
<script setup>
import Menu from "primevue/menu";
import { ref } from "vue";
import { useRouter } from "vue-router";

import IconLabel from "./IconLabel.vue";

const menu = ref();
const router = useRouter();

const style = {
  root: "border p-1 rounded border-theme-border bg-theme-background",
  menuitem: ({ context }) => ({
    class: [
      "text-theme-text-muted rounded px-2 py-1",
      "hover:bg-theme-background-elevated hover:cursor-pointer",
      {
        "bg-theme-background-elevated": context.focused,
      },
    ],
  }),
  separator: "border-t border-theme-border my-2",
};

function toggle(event) {
  menu.value.toggle(event);
}

function hide() {
  menu.value.hide();
}

function handleItemClick(event, item) {
  if (item?.disabled) {
    event.preventDefault();
    return;
  }
  if (!item?.to) {
    return;
  }
  event.preventDefault();
  router.push(item.to);
  hide();
}

defineExpose({ toggle });
</script>

export function syncOrderedListStartStyles(rootElement) {
  if (!(rootElement instanceof Element)) {
    return;
  }

  rootElement.querySelectorAll("ol").forEach((listElement) => {
    const start = Number(listElement.getAttribute("start"));

    if (Number.isInteger(start) && start > 1) {
      listElement.style.counterReset = `li ${start - 1}`;
    } else {
      listElement.style.removeProperty("counter-reset");
    }
  });
}

import codeSyntaxHighlight from "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js";

function getCurrentPageHref(hash) {
  if (typeof window === "undefined") {
    return hash;
  }

  return `${window.location.pathname}${window.location.search}${hash}`;
}

const customHTMLRenderer = {
  // Add id attribute to headings
  heading(node, { entering, getChildrenText, origin }) {
    const original = origin();
    if (entering) {
      original.attributes = {
        id: getChildrenText(node)
          .toLowerCase()
          .replace(/[^a-z0-9-\s]*/g, "")
          .trim()
          .replace(/\s/g, "-"),
      };
    }
    return original;
  },
  // Convert relative hash links to absolute links
  link(_, { entering, origin }) {
    const original = origin();
    if (entering) {
      const href = original.attributes.href;
      if (href.startsWith("#")) {
        original.attributes.href = getCurrentPageHref(href);
      }
    }
    return original;
  },
};

const baseOptions = {
  height: "100%",
  plugins: [codeSyntaxHighlight],
  customHTMLRenderer: customHTMLRenderer,
  usageStatistics: false,
};

export default baseOptions;

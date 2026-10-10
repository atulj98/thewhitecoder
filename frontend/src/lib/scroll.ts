export function scrollToSheets() {
  const section = document.getElementById("sheets");
  const heading = document.getElementById("catalog-title");
  if (!section) return;

  section.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
  heading?.focus({ preventScroll: true });
}

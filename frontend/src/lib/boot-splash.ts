const BOOT_SPLASH_ID = "labelhub-boot-splash";

/** Remove the static HTML splash shown while JS bundles download on slow links. */
export function dismissBootSplash() {
  const splash = document.getElementById(BOOT_SPLASH_ID);
  if (!splash) {
    return;
  }
  splash.setAttribute("aria-busy", "false");
  splash.classList.add("labelhub-boot-splash--hide");
  window.setTimeout(() => splash.remove(), 360);
}

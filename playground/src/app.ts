import type { AppManifest } from "../../src/build/manifest.ts";
import { CATEGORIES, type Demo } from "./types.ts";
import { getDemos } from "./demos/registry.ts";
import { createEditor, destroyEditor } from "./components/editor.ts";
import type { EditorView } from "codemirror";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  currentDemo: Demo;
  currentFileIndex: number;
  swReady: boolean;
  searchQuery: string;
  /** mutable copy of demo files (editable by the user) */
  editedFiles: string[];
}

const allDemos = getDemos();

const state: State = {
  currentDemo: allDemos[0],
  currentFileIndex: 0,
  swReady: false,
  searchQuery: "",
  editedFiles: allDemos[0].files.map((f) => f.content),
};

// ---------------------------------------------------------------------------
// Service Worker
// ---------------------------------------------------------------------------

let swReg: ServiceWorkerRegistration | null = null;
let editorView: EditorView | null = null;

async function registerSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const waitForActive = (): Promise<void> =>
      new Promise((resolve) => {
        const sw = swReg!.installing ?? swReg!.waiting ?? swReg!.active;
        if (swReg!.active) {
          resolve();
          return;
        }
        const onStateChange = () => {
          if (sw && sw.state === "activated") {
            sw.removeEventListener("statechange", onStateChange);
            resolve();
          }
        };
        sw?.addEventListener("statechange", onStateChange);
      });

    await waitForActive();
    state.swReady = true;
    render();
    sendManifestToSW(state.currentDemo.manifest);
  } catch (_e) {
    // SW registration failed — playground still works without preview
  }
}

function sendManifestToSW(manifest: AppManifest): void {
  if (!swReg?.active) return;
  swReg.active.postMessage({ type: "UPDATE_MANIFEST", manifest });
}

// ---------------------------------------------------------------------------
// Render helpers — DOM API only, no innerHTML
// ---------------------------------------------------------------------------

function createIcon(name: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "material-symbols-outlined";
  span.textContent = name;
  span.style.fontSize = "18px";
  span.style.lineHeight = "1";
  return span;
}

function createLogoEl(): HTMLElement {
  const logo = document.createElement("div");
  logo.className = "top-bar-logo";
  logo.style.cssText =
    "font-size:18px;font-weight:700;color:var(--md-primary);letter-spacing:-0.5px;margin-right:8px;";
  logo.textContent = "⬡ Ten.net playground";
  return logo;
}

function createDemoItem(demo: Demo, isActive: boolean): HTMLElement {
  const div = document.createElement("div");
  div.className = isActive ? "demo-item active" : "demo-item";
  div.dataset.demoId = demo.id;

  const title = document.createElement("div");
  title.className = "demo-title";
  title.textContent = demo.title;
  div.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "demo-desc";
  desc.textContent = demo.description;
  div.appendChild(desc);

  return div;
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function renderTopBar(container: HTMLElement): void {
  const bar = document.createElement("div");
  bar.className = "top-bar";

  // Hamburger menu (visible on mobile via CSS)
  const menuBtn = document.createElement("button");
  menuBtn.className = "btn-text sidebar-drawer";
  menuBtn.id = "btn-menu";
  menuBtn.appendChild(createIcon("menu"));
  bar.appendChild(menuBtn);

  bar.appendChild(createLogoEl());

  // spacer
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  bar.appendChild(spacer);

  // SW status chip
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.id = "sw-chip";
  chip.appendChild(createIcon(state.swReady ? "check_circle" : "sync"));
  const chipLabel = document.createElement("span");
  chipLabel.textContent = state.swReady ? "SW ready" : "SW loading…";
  chip.appendChild(chipLabel);
  bar.appendChild(chip);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn-text";
  resetBtn.id = "btn-reset";
  resetBtn.appendChild(createIcon("restart_alt"));
  const resetLabel = document.createElement("span");
  resetLabel.textContent = "Reset";
  resetBtn.appendChild(resetLabel);
  bar.appendChild(resetBtn);

  // Run button
  const runBtn = document.createElement("button");
  runBtn.className = "btn-filled";
  runBtn.id = "btn-run";
  runBtn.appendChild(createIcon("play_arrow"));
  const runLabel = document.createElement("span");
  runLabel.textContent = "Run";
  runBtn.appendChild(runLabel);
  bar.appendChild(runBtn);

  container.appendChild(bar);
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function renderSidebar(container: HTMLElement): void {
  const sidebar = document.createElement("nav");
  sidebar.className = "sidebar";

  // Search wrapper
  const searchWrapper = document.createElement("div");
  searchWrapper.style.cssText = "position:relative;margin-bottom:8px;";

  const searchIcon = createIcon("search");
  searchIcon.style.cssText =
    "position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--md-on-surface-tertiary);pointer-events:none;font-size:16px;";
  searchWrapper.appendChild(searchIcon);

  const search = document.createElement("input");
  search.type = "search";
  search.className = "sidebar-search";
  search.placeholder = "Search demos…";
  search.id = "sidebar-search";
  search.value = state.searchQuery;
  searchWrapper.appendChild(search);
  sidebar.appendChild(searchWrapper);

  const demos = getDemos();
  const query = state.searchQuery.toLowerCase();
  const filtered = query
    ? demos.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query),
    )
    : demos;

  for (const cat of CATEGORIES) {
    const catDemos = filtered.filter((d) => d.category === cat.id);
    if (catDemos.length === 0) continue;

    // Category header
    const header = document.createElement("div");
    header.className = "category-header";
    header.appendChild(createIcon(cat.icon));
    const label = document.createElement("span");
    label.className = "category-label";
    label.textContent = cat.label;
    header.appendChild(label);
    sidebar.appendChild(header);

    for (const demo of catDemos) {
      const item = createDemoItem(demo, demo.id === state.currentDemo.id);
      item.id = "demo-" + demo.id;
      sidebar.appendChild(item);
    }
  }

  container.appendChild(sidebar);
}

// ---------------------------------------------------------------------------
// Editor panel
// ---------------------------------------------------------------------------

function renderEditorPanel(container: HTMLElement): void {
  const panel = document.createElement("div");
  panel.className = "editor-panel";

  // Tabs row
  const tabsRow = document.createElement("div");
  tabsRow.className = "tabs-row";
  tabsRow.style.cssText =
    "display:flex;flex-direction:row;gap:6px;padding:10px 12px;border-bottom:1px solid var(--md-outline);background:var(--md-surface-card);";

  const files = state.currentDemo.files;
  files.forEach((file, idx) => {
    const tab = document.createElement("button");
    tab.className = idx === state.currentFileIndex ? "tab active" : "tab";
    tab.dataset.tabIndex = String(idx);
    tab.id = "tab-" + idx;

    const fileIcon = createIcon(
      file.language === "typescript" ? "code" : "html",
    );
    tab.appendChild(fileIcon);
    const tabLabel = document.createElement("span");
    tabLabel.textContent = file.name;
    tab.appendChild(tabLabel);
    tabsRow.appendChild(tab);
  });

  panel.appendChild(tabsRow);

  // Split: code area + preview
  const split = document.createElement("div");
  split.className = "editor-split";
  split.style.cssText =
    "display:flex;flex-direction:row;flex:1;overflow:hidden;";

  // Code area
  const codeArea = document.createElement("div");
  codeArea.style.cssText =
    "flex:1;display:flex;flex-direction:column;background:var(--md-surface-editor);overflow:hidden;";

  const currentFile = files[state.currentFileIndex];
  const editorDiv = document.createElement("div");
  editorDiv.id = "code-editor";
  editorDiv.style.cssText = "flex:1;overflow:auto;height:100%;";
  codeArea.appendChild(editorDiv);
  split.appendChild(codeArea);

  // CodeMirror is initialised after the element is appended to the DOM tree.
  // We store the view in the module-level variable so render() can destroy it
  // on the next call.
  requestAnimationFrame(() => {
    const fileWithEdits: typeof currentFile = {
      ...currentFile,
      content: state.editedFiles[state.currentFileIndex],
    };
    editorView = createEditor(editorDiv, fileWithEdits, (content) => {
      state.editedFiles[state.currentFileIndex] = content;
    });
  });

  // Preview pane
  const previewPane = document.createElement("div");
  previewPane.style.cssText =
    "flex:1;display:flex;flex-direction:column;background:#fff;border-left:1px solid var(--md-outline);overflow:hidden;";

  // Preview top bar
  const previewBar = document.createElement("div");
  previewBar.className = "preview-bar";
  previewBar.style.cssText =
    "display:flex;flex-direction:row;align-items:center;gap:8px;padding:8px 12px;background:var(--md-surface);border-bottom:1px solid var(--md-outline);";

  const previewDot = document.createElement("div");
  previewDot.style.cssText =
    "width:8px;height:8px;border-radius:50%;background:var(--md-primary);";
  previewBar.appendChild(previewDot);

  const previewLabel = document.createElement("span");
  previewLabel.style.cssText =
    "font-size:12px;color:var(--md-on-surface-secondary);font-family:var(--md-font-mono);";
  previewLabel.textContent = "/preview" + state.currentDemo.previewPath;
  previewBar.appendChild(previewLabel);

  previewPane.appendChild(previewBar);

  const iframe = document.createElement("iframe");
  iframe.id = "preview-frame";
  iframe.src = "/preview" + state.currentDemo.previewPath;
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  iframe.style.cssText = "flex:1;border:none;width:100%;";
  previewPane.appendChild(iframe);

  split.appendChild(previewPane);
  panel.appendChild(split);
  container.appendChild(panel);
}

// ---------------------------------------------------------------------------
// Mobile sidebar drawer
// ---------------------------------------------------------------------------

function renderSidebarDrawer(container: HTMLElement): void {
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  overlay.id = "sidebar-overlay";

  const panel = document.createElement("div");
  panel.className = "sidebar-panel";
  panel.id = "sidebar-panel";

  // Reuse sidebar content rendering
  const demos = getDemos();
  const query = state.searchQuery.toLowerCase();
  const filtered = query
    ? demos.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query),
    )
    : demos;

  for (const cat of CATEGORIES) {
    const catDemos = filtered.filter((d) => d.category === cat.id);
    if (catDemos.length === 0) continue;

    const header = document.createElement("div");
    header.className = "category-header";
    header.appendChild(createIcon(cat.icon));
    const label = document.createElement("span");
    label.className = "category-label";
    label.textContent = cat.label;
    header.appendChild(label);
    panel.appendChild(header);

    for (const demo of catDemos) {
      const item = createDemoItem(demo, demo.id === state.currentDemo.id);
      item.dataset.demoId = demo.id;
      item.classList.add("drawer-demo-item");
      panel.appendChild(item);
    }
  }

  container.appendChild(overlay);
  container.appendChild(panel);
}

function openDrawer(): void {
  document.getElementById("sidebar-overlay")?.classList.add("open");
  document.getElementById("sidebar-panel")?.classList.add("open");
}

function closeDrawer(): void {
  document.getElementById("sidebar-overlay")?.classList.remove("open");
  document.getElementById("sidebar-panel")?.classList.remove("open");
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  // Destroy CodeMirror instance before clearing DOM
  if (editorView) {
    destroyEditor(editorView);
    editorView = null;
  }

  // Clear existing content via DOM API
  while (app.firstChild) {
    app.removeChild(app.firstChild);
  }

  // Top bar
  renderTopBar(app);

  // Body row (sidebar + editor)
  const body = document.createElement("div");
  body.className = "body-row";
  body.style.cssText =
    "display:flex;flex-direction:row;flex:1;gap:12px;padding:12px;overflow:hidden;";

  renderSidebar(body);
  renderEditorPanel(body);

  app.appendChild(body);

  // Mobile sidebar drawer
  renderSidebarDrawer(app);

  bindEvents();
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

function reloadPreviewIframe(): void {
  const iframe = document.getElementById("preview-frame") as
    | HTMLIFrameElement
    | null;
  if (iframe) {
    iframe.src = "/preview" + state.currentDemo.previewPath;
  }
}

function switchDemo(demo: Demo): void {
  state.currentDemo = demo;
  state.currentFileIndex = 0;
  state.editedFiles = demo.files.map((f) => f.content);
  sendManifestToSW(demo.manifest);
  render();
}

function buildManifestFromEdits(): AppManifest {
  const base = state.currentDemo.manifest;
  const files = state.currentDemo.files;

  // Reconstruct manifest applying user edits
  const routes = base.routes.map((r) => {
    const routeIdx = files.findIndex((f) => f.name === "route.ts");
    const pageIdx = files.findIndex((f) => f.name === "page.html");
    return {
      ...r,
      transpiledCode: routeIdx >= 0
        ? state.editedFiles[routeIdx]
        : r.transpiledCode,
      pageContent: pageIdx >= 0 ? state.editedFiles[pageIdx] : r.pageContent,
    };
  });

  // Reconstruct layouts if user edited layout.html
  const layoutIdx = files.findIndex((f) => f.name === "layout.html");
  const layouts = layoutIdx >= 0
    ? Object.fromEntries(
      Object.entries(base.layouts).map(([path, arr]) => [
        path,
        arr.map(() => state.editedFiles[layoutIdx]),
      ]),
    )
    : base.layouts;

  return { ...base, routes, layouts };
}

function bindEvents(): void {
  // Demo items
  const sidebar = document.querySelector("nav.sidebar");
  sidebar?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-demo-id]") as
      | HTMLElement
      | null;
    if (!target) return;
    const demoId = target.dataset.demoId;
    if (!demoId) return;
    const demo = getDemos().find((d) => d.id === demoId);
    if (demo) switchDemo(demo);
  });

  // Search input — filter in-place to keep focus
  const search = document.getElementById("sidebar-search") as
    | HTMLInputElement
    | null;
  search?.addEventListener("input", () => {
    state.searchQuery = search.value;
    const query = state.searchQuery.toLowerCase();
    document.querySelectorAll("nav.sidebar .demo-item").forEach((el) => {
      const title =
        el.querySelector(".demo-title")?.textContent?.toLowerCase() ?? "";
      const desc = el.querySelector(".demo-desc")?.textContent?.toLowerCase() ??
        "";
      const match = !query || title.includes(query) || desc.includes(query);
      (el as HTMLElement).style.display = match ? "" : "none";
    });
    // Also hide category headers with no visible items
    document.querySelectorAll("nav.sidebar .category-header").forEach((hdr) => {
      let hasVisible = false;
      let sibling = hdr.nextElementSibling;
      while (sibling && !sibling.classList.contains("category-header")) {
        if (
          sibling.classList.contains("demo-item") &&
          (sibling as HTMLElement).style.display !== "none"
        ) {
          hasVisible = true;
        }
        sibling = sibling.nextElementSibling;
      }
      (hdr as HTMLElement).style.display = hasVisible ? "" : "none";
    });
  });

  // Tab clicks
  const tabsRow = document.querySelector("[data-tab-index]")?.parentElement;
  tabsRow?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-tab-index]") as
      | HTMLElement
      | null;
    if (!target) return;
    const idx = parseInt(target.dataset.tabIndex ?? "0", 10);
    state.currentFileIndex = idx;
    render();
  });

  // Mobile drawer
  const menuBtn = document.getElementById("btn-menu");
  menuBtn?.addEventListener("click", openDrawer);

  const overlayEl = document.getElementById("sidebar-overlay");
  overlayEl?.addEventListener("click", closeDrawer);

  // Drawer demo items
  document.querySelectorAll(".drawer-demo-item").forEach((el) => {
    el.addEventListener("click", () => {
      const demoId = (el as HTMLElement).dataset.demoId;
      if (!demoId) return;
      const demo = getDemos().find((d) => d.id === demoId);
      if (demo) {
        closeDrawer();
        switchDemo(demo);
      }
    });
  });

  // Run button
  const runBtn = document.getElementById("btn-run");
  runBtn?.addEventListener("click", () => {
    sendManifestToSW(buildManifestFromEdits());
    reloadPreviewIframe();
  });

  // Reset button
  const resetBtn = document.getElementById("btn-reset");
  resetBtn?.addEventListener("click", () => {
    state.editedFiles = state.currentDemo.files.map((f) => f.content);
    sendManifestToSW(state.currentDemo.manifest);
    render();
    reloadPreviewIframe();
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

render();
registerSW();

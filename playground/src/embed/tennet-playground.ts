class TennetPlayground extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const demoId = this.getAttribute("demo") || "hello-world";
    const height = this.getAttribute("height") || "300";
    this.render(demoId, height);
  }

  private render(demoId: string, height: string) {
    // Create style element
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      .embed-container { display: flex; height: ${height}px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; background: #fff; }
      .embed-editor { flex: 1; background: #1b1b1f; padding: 16px; font-family: 'Roboto Mono', monospace; font-size: 11px; line-height: 1.9; color: #e3e2e6; overflow: auto; white-space: pre; }
      .embed-preview { flex: 1; border: none; }
      .embed-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: center; }
      .embed-chip { border: 1px solid #dadce0; border-radius: 8px; padding: 4px 12px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: #fff; font-family: 'Google Sans', sans-serif; text-decoration: none; }
      .embed-chip-primary { color: #3178c6; }
      .embed-chip-secondary { color: #5f6368; }
      @media (max-width: 600px) {
        .embed-container { flex-direction: column; height: auto; }
        .embed-editor, .embed-preview { height: ${parseInt(height) / 2}px; }
      }
    `;
    this.shadow.appendChild(style);

    // Container
    const container = document.createElement("div");
    container.className = "embed-container";

    // Editor (read-only code display)
    const editor = document.createElement("div");
    editor.className = "embed-editor";
    editor.id = "editor";
    container.appendChild(editor);

    // Preview iframe
    const iframe = document.createElement("iframe");
    iframe.className = "embed-preview";
    iframe.src = "/preview/";
    container.appendChild(iframe);

    this.shadow.appendChild(container);

    // Action chips
    const actions = document.createElement("div");
    actions.className = "embed-actions";

    const openLink = document.createElement("a");
    openLink.className = "embed-chip embed-chip-primary";
    openLink.href = "/playground?demo=" + demoId;
    openLink.target = "_blank";
    openLink.textContent = "Abrir no Playground";
    actions.appendChild(openLink);

    const copyBtn = document.createElement("button");
    copyBtn.className = "embed-chip embed-chip-secondary";
    copyBtn.textContent = "Copiar codigo";
    copyBtn.addEventListener("click", () => {
      const code = editor.textContent || "";
      navigator.clipboard.writeText(code);
      copyBtn.textContent = "Copiado!";
      setTimeout(() => {
        copyBtn.textContent = "Copiar codigo";
      }, 2000);
    });
    actions.appendChild(copyBtn);

    this.shadow.appendChild(actions);
  }
}

customElements.define("tennet-playground", TennetPlayground);

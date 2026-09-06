import * as bitty from '/bitty.js';

const el = bitty.el;

class ShareForm {
  constructor() {
    // element created
  }

  parse(form) { 
    let formData = new FormData(form);
    let formObj = Object.fromEntries(formData);
    console.log("DATA", formObj);

    let url = formData.get("url");
    formData.delete("url");
    let title = formData.get("t");
    formData.delete("t");

    if (!title.length) return;
    let path = `/${dashspaces(title)}/`;
    let encodedFields = ["i", "v"];
    formData.forEach((value, key) => {
      if (!value.length) return;
      if (encodedFields.includes(key)) value = btoa(key);
      path += `/${key}/${value}`;
    });
    formData.forEach((value, key) => { if (value.length) object[key] = value; });
    
    path += "#" + url;
    console.log(path);
    let rurl = document.getElementById("rurl");
    if (rurl) rurl.value = `https://redirect.app${path}`;
  }

  render() {
    return el("form#share-form.flex-column",
        el("input", {type: "image", target: "i", class: "thumbnail", onclick: "getURL(this)", src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%%3C/svg%3E%0A"}),
        el("div.flex-row",
          el("div.flex-column",
            el("input", {name: "t", oninput: this.parse, placeholder: "Title"}),
            el("input", {name: "d", oninput: this.parse, placeholder: "Description"}),
            el("input", {id: "i", name: "i", type: "hidden", oninput: this.parse}),
            el("input", {id: "f", name: "i", type: "hidden", oninput: this.parse}),
            el("input", {name: "url", oninput: this.parse, placeholder: "example.com"}),
            el("button", {type: "sumbit", style: "display:none"}, "submit")
          ),
          el("input", {type: "image", src: "", id: "favicon", target: "f", onclick: "getURL(this)", oninput: this.parse, placeholder: "icon"})
        )
    );
  }
}

class Menu {
  /**
   * @constructor
   */
  constructor(button) {
    this.button = button;
    this._cleanupStatus = null;
  }

  makeTinyurl() {
    location.href = 'https://tinyurl.com/create.php?url=' + encodeURIComponent(location.href);
  }

  makeText() {
    location.href = 'imessage:&body=' + encodeURIComponent(location.href);
  }  

  makeQR() {
    bitty.loadScript('/js/qrious.min.js', null, "").then(() => {
      let qrDialog = el("dialog#qr-dialog.dialog",
        el("canvas", {id: "qr"}),
        el("div.qr-title", document.title || "Bitty Box App")
      );
      qrDialog.onclick = (e) => {
        if (e.target === qrDialog || e.target.tagName === 'DIALOG') {
          qrDialog.close();
          if (qrDialog.parentNode) qrDialog.parentNode.removeChild(qrDialog);
        }
      };
      document.body.append(qrDialog);
      qrDialog.showModal();
      if (typeof QRious !== 'undefined') {
        new QRious({
          element: document.getElementById("qr"),
          background: 'transparent',
          foreground: 'currentColor',
          size: 400,
          value: location.href,
        });
      }
    });
  }  

  sendEmail() {
    location.href = 'mailto:?subject=' + encodeURIComponent(document.title || 'Bitty Box App') + '&body=' + encodeURIComponent(location.href);
  }

  makeToot() {
    return false;
  }

  makeTweet() {
    var url = "https://twitter.com/intent/tweet?url=" + encodeURIComponent(location.href);
    window.open(url, "_blank");
    return false;
  }

  showAbout() {
    var url = "https://about.bitty.site";
    window.open(url, "_blank");
    return false;
  }

  async copyLink(buttonElement) {
    const fullUrl = window.location.href;
    let copiedSuccessfully = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(fullUrl);
        copiedSuccessfully = true;
      } catch (err) {
        console.warn("Clipboard API failed, falling back to execCommand", err);
      }
    }

    if (!copiedSuccessfully) {
      let dummy = document.createElement("textarea");
      dummy.value = fullUrl;
      dummy.setAttribute("readonly", "");
      dummy.style.position = "fixed";
      dummy.style.left = "-9999px";
      dummy.style.top = "-9999px";
      dummy.style.opacity = "0";
      document.body.appendChild(dummy);
      dummy.focus();
      dummy.select();
      try {
        copiedSuccessfully = document.execCommand("copy");
      } catch (err) {
        console.error("execCommand copy error:", err);
      }
      document.body.removeChild(dummy);
    }

    document.body.classList.add("copied");

    const targetBtn = buttonElement || document.getElementById("menu-copy-btn");
    if (targetBtn) {
      targetBtn.classList.add("copied");
      const labelEl = targetBtn.querySelector(".menu-copy-label");
      const iconEl = targetBtn.querySelector(".menu-copy-icon-wrap");
      if (labelEl) labelEl.textContent = "Copied to Clipboard!";
      if (iconEl) {
        iconEl.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
      setTimeout(() => {
        targetBtn.classList.remove("copied");
        if (labelEl) labelEl.textContent = "Copy to Clipboard";
        if (iconEl) {
          iconEl.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }
      }, 2000);
    }

    setTimeout(() => {
      document.body.classList.remove("copied");
    }, 2000);

    return copiedSuccessfully;
  }
  
  systemShare(info) {
    if (!info || !info.url) info = { title: document.title, text: document.title, url: location.href };
    
    if (navigator.share) {
      navigator.share(info)
        .then(() => { console.log('Shared!'); })
        .catch(console.error);
    } else {
      this.copyLink();
    }
  }

  icons = {
    "qr": `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><g id="qr_code"><mask id="mask0_1400_318" width="24" height="24" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path id="Bounding box" d="M0 0h24v24H0z"/></mask><g mask="url(#mask0_1400_318)"><path id="qr_code_2" d="M3 11V3h8v8H3Zm2-2h4V5H5v4ZM3 21v-8h8v8H3Zm2-2h4v-4H5v4Zm8-8V3h8v8h-8Zm2-2h4V5h-4v4Zm4 12v-2h2v2h-2Zm-6-6v-2h2v2h-2Zm2 2v-2h2v2h-2Zm-2 2v-2h2v2h-2Zm2 2v-2h2v2h-2Zm2-2v-2h2v2h-2Zm0-4v-2h2v2h-2Zm2 2v-2h2v2h-2Z"/></g></g></svg>`,
    "text": `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><g id="chat_bubble"><mask id="mask0_1406_423" width="24" height="24" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path id="Bounding box" d="M0 0h24v24H0z"/></mask><g mask="url(#mask0_1406_423)"><path id="chat_bubble_2" d="M1.2 23.05V3.55c0-.733.259-1.358.775-1.875A2.554 2.554 0 0 1 3.85.9h16.3a2.55 2.55 0 0 1 1.875.775c.517.517.775 1.142.775 1.875v12.2c0 .733-.258 1.358-.775 1.875a2.554 2.554 0 0 1-1.875.775H5.85L1.2 23.05Zm2.65-6.4.9-.9h15.4V3.55H3.85v13.1Z"/></g></g></svg>`,
    "email": `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><g id="mail"><mask id="mask0_1406_417" width="24" height="24" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path id="Bounding box" d="M0 0h24v24H0z"/></mask><g mask="url(#mask0_1406_417)"><path id="mail_2" d="M3.85 20.75a2.554 2.554 0 0 1-1.875-.775A2.554 2.554 0 0 1 1.2 18.1V5.9c0-.733.259-1.358.775-1.875A2.554 2.554 0 0 1 3.85 3.25h16.3a2.55 2.55 0 0 1 1.875.775c.517.517.775 1.142.775 1.875v12.2c0 .733-.258 1.358-.775 1.875a2.554 2.554 0 0 1-1.875.775H3.85ZM12 13.575 3.85 8.6v9.5h16.3V8.6L12 13.575ZM12 11l8.35-5.1H3.65L12 11Z"/></g></g></svg>`,
    "twitter": `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><g id="twitter 1"><path id="Vector" d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23Z"/></g></svg>`,
  };

  selectField(target) {
    if (!target) return;
    target.select();
    target.scrollLeft = 0;
  }

  getMockShortCode(str) {
    if (!str) return "app";
    let hash1 = 5381;
    let hash2 = 0xdeadbeef;
    for (let i = 0; i < str.length; i++) {
      let ch = str.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1) ^ ch;
      hash2 = Math.imul(hash2 ^ ch, 2654435761);
    }
    let combined = Math.abs(hash1 ^ hash2) % 2176782336;
    return combined.toString(36).padStart(6, '0').slice(0, 7);
  }

  async copyShortLink(shortUrl, btn) {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shortUrl);
        success = true;
      }
    } catch (err) {
      console.warn("Async clipboard copy failed:", err);
    }

    if (!success) {
      let dummy = document.createElement("textarea");
      dummy.value = shortUrl;
      dummy.setAttribute("readonly", "");
      dummy.style.position = "fixed";
      dummy.style.opacity = "0";
      document.body.appendChild(dummy);
      dummy.select();
      try {
        success = document.execCommand("copy");
      } catch (e) {
        success = false;
      }
      document.body.removeChild(dummy);
    }

    if (btn) {
      let label = btn.querySelector(".menu-short-copy-label");
      let iconWrap = btn.querySelector(".menu-short-copy-icon");
      let prevText = label ? label.textContent : "Copy Short URL";
      let prevIcon = iconWrap ? iconWrap.innerHTML : "";

      btn.classList.add("copied");
      if (label) label.textContent = "Copied!";
      if (iconWrap) {
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }

      setTimeout(() => {
        btn.classList.remove("copied");
        if (label) label.textContent = prevText;
        if (iconWrap) iconWrap.innerHTML = prevIcon;
      }, 2000);
    }

    return success;
  }

  close(dialog) {
    if (!dialog) dialog = document.querySelector("dialog.menu");
    if (!dialog || dialog.classList.contains("menu-closing")) return;

    dialog.classList.remove("menu-open");
    dialog.classList.add("menu-closing");
    this.button?.classList.remove("open");

    if (this._cleanupStatus) {
      this._cleanupStatus();
      this._cleanupStatus = null;
    }

    setTimeout(() => {
      try {
        dialog.close();
      } catch (e) {}
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 220);
  }

  show(info) {
    let existingMenu = document.querySelector("dialog.menu");
    if (existingMenu) {
      this.close(existingMenu);
      return;
    }

    let url = window.location.href;
    this.button?.classList.add("open");

    // Connection or compression status indicator
    let statusDot = el("span.status-indicator-dot");
    let statusLabel = el("span.status-indicator-label");
    let statusBadge = el("span.status-indicator-badge");
    let statusBar = el("div.menu-status-bar", {
      id: "menu-status-bar",
      role: "status",
      "aria-live": "polite"
    },
      el("div.menu-status-left", statusDot, statusLabel),
      statusBadge
    );

    const updateStatus = (st) => {
      st = st || (bitty.getStatus ? bitty.getStatus() : window.bittyStatus) || {};
      let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      let state = (!isOnline ? 'offline' : (st.state || 'ready')).toLowerCase();

      statusDot.className = "status-indicator-dot status-" + state;

      if (!isOnline) {
        statusLabel.textContent = "Offline • Local cache";
        statusBadge.textContent = "OFFLINE";
      } else if (state === 'decompressing') {
        let fmt = (st.format || 'payload').toUpperCase();
        statusLabel.textContent = `Decompressing ${fmt}…`;
        statusBadge.textContent = fmt;
      } else if (state === 'loading') {
        statusLabel.textContent = st.message || "Loading content…";
        statusBadge.textContent = "LOADING";
      } else if (state === 'error') {
        statusLabel.textContent = st.message || "Decompression error";
        statusBadge.textContent = "ERROR";
      } else {
        let fmt = (st.format || 'Ready').toUpperCase();
        let sizePart = st.sizeLabel ? ` • ${st.sizeLabel}` : '';
        statusLabel.textContent = "Decompressed & ready" + sizePart;
        statusBadge.textContent = fmt === 'READY' ? 'READY' : fmt;
      }
    };

    updateStatus();

    const onStatusChange = (e) => updateStatus(e.detail);
    const onOnline = () => updateStatus({ online: true });
    const onOffline = () => updateStatus({ online: false, state: 'offline' });

    window.addEventListener('bitty:status', onStatusChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    this._cleanupStatus = () => {
      window.removeEventListener('bitty:status', onStatusChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };

    // Full URL input field
    let urlField = el("input.url", {
      value: url,
      readonly: true,
      title: "Current full app URL",
      "aria-label": "Full application URL"
    });
    urlField.onclick = () => this.selectField(urlField);

    // Dedicated Copy to Clipboard button
    let copyBtn = el("button#menu-copy-btn.menu-copy-btn", {
      type: "button",
      title: "Copy full app URL to clipboard",
      "aria-label": "Copy full app URL to clipboard",
      onclick: () => this.copyLink(copyBtn)
    },
      el("span.menu-copy-icon-wrap", {
        innerHTML: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
      }),
      el("span.menu-copy-label", "Copy to Clipboard")
    );

    // Check if current URL fragment exceeds 2000 characters
    let fragment = "";
    if (info && typeof info.fragment === "string") {
      fragment = info.fragment;
    } else if (window.location.hash) {
      fragment = window.location.hash.substring(1);
    } else if (info && info.url && info.url.indexOf("#") !== -1) {
      fragment = info.url.substring(info.url.indexOf("#") + 1);
    } else if (url && url.indexOf("#") !== -1) {
      fragment = url.substring(url.indexOf("#") + 1);
    }

    let shortenCard = null;
    if (fragment && fragment.length > 2000) {
      let shortCode = this.getMockShortCode(fragment);
      let shortUrl = `https://bitty.short/s/${shortCode}`;

      let shortInput = el("input.menu-short-input", {
        value: shortUrl,
        readonly: true,
        title: "Suggested shortened URL placeholder",
        "aria-label": "Suggested shortened URL format"
      });
      shortInput.onclick = () => this.selectField(shortInput);

      let shortCopyBtn = el("button.menu-short-copy-btn", {
        type: "button",
        title: "Copy suggested shortened URL format",
        "aria-label": "Copy suggested shortened URL format",
        onclick: () => this.copyShortLink(shortUrl, shortCopyBtn)
      },
        el("span.menu-short-copy-icon", {
          innerHTML: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
        }),
        el("span.menu-short-copy-label", "Copy Short URL")
      );

      let externalLink = el("a.menu-short-ext-link", {
        href: `https://tinyurl.com/create.php?url=${encodeURIComponent(url)}`,
        target: "_blank",
        rel: "noopener noreferrer",
        title: "Create live redirecting short link using TinyURL"
      }, "Create live short link ↗");

      shortenCard = el("div.menu-shorten-card", {
        id: "menu-shorten-suggestion",
        role: "region",
        "aria-label": "Suggested shortened URL"
      },
        el("div.menu-shorten-header",
          el("span.menu-shorten-badge",
            el("span.menu-shorten-badge-icon", {
              innerHTML: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
            }),
            el("span.menu-shorten-badge-text", `Fragment exceeds 2,000 chars (${fragment.length.toLocaleString()} chars)`)
          )
        ),
        el("p.menu-shorten-desc", "Long URL fragments may exceed limit thresholds in messaging apps or QR codes. Suggested shortened format:"),
        el("div.menu-shorten-input-row",
          shortInput,
          shortCopyBtn
        ),
        el("div.menu-shorten-meta",
          el("span.menu-shorten-tag", "Mock Service Placeholder"),
          externalLink
        )
      );
    }

    let menu = el("dialog.menu", {
      id: "bitty-share-menu",
      "aria-label": "Application menu and sharing"
    },
      el("div.menu-container", {},
        statusBar,
        el("div.menu-body",
          el("div.menu-url-row", urlField),
          copyBtn,
          ...(shortenCard ? [shortenCard] : []),
          el("div.menu-divider"),
          el("div.menu-icons",
            el("button.menu-icon-btn", { id: "qrcode", type: "button", title: "Show QR Code", "aria-label": "Show QR Code", onclick: () => this.makeQR(), innerHTML: this.icons.qr }),
            el("button.menu-icon-btn", { id: "text", type: "button", title: "Share via Message", "aria-label": "Message", onclick: () => this.makeText(), innerHTML: this.icons.text }),
            el("button.menu-icon-btn", { id: "email", type: "button", title: "Share via Email", "aria-label": "Email", onclick: () => this.sendEmail(), innerHTML: this.icons.email }),
            el("button.menu-icon-btn", { id: "twitter", type: "button", title: "Share on Twitter / X", "aria-label": "Twitter", onclick: () => this.makeTweet(), innerHTML: this.icons.twitter })
          )
        )
      )
    );

    menu.addEventListener("click", (e) => {
      if (e.target === menu || e.target.tagName === 'DIALOG') {
        this.close(menu);
      }
    });

    menu.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.close(menu);
    });

    document.body.appendChild(menu);

    if (info && info.offset) {
      menu.style.display = "block";
      
      let x = info.offset.left;
      let y = info.offset.top;
      let w = menu.offsetWidth || 280;
      let h = menu.offsetHeight || 220;
      x -= w / 2;

      let overflowX = x + w - window.innerWidth + 12;
      let overflowY = y + h - window.innerHeight + 12;

      if (overflowX > 0) x -= overflowX;
      if (overflowY > 0) y -= overflowY;

      x = Math.round(Math.max(12, x));
      y = Math.round(Math.max(12, y));

      menu.style.left = x + "px";
      menu.style.top = y + "px";
      menu.style.right = "auto";
      menu.style.bottom = "auto";

      menu.style.removeProperty("display");
    }

    menu.showModal();

    requestAnimationFrame(() => {
      menu.classList.add("menu-open");
    });

    this.selectField(urlField);
  }
}
    
export {
  Menu
};

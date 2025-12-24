class DeliveryCart extends HTMLElement {
  connectedCallback() {
    this.handleUpdate = this.handleUpdate.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.render();
    this.cacheEls();
    this.addEventListener("click", this.handleClick);
    window.addEventListener("delivery-cart-updated", this.handleUpdate);
    this.load();
  }

  disconnectedCallback() {
    window.removeEventListener("delivery-cart-updated", this.handleUpdate);
    this.removeEventListener("click", this.handleClick);
  }

  render() {
    this.innerHTML = `
      <div class="delivery-cart">
        <div class="delivery-cart__header">
          <h3>Хүргэлтийн сагс</h3>
          <span class="delivery-cart__count">0</span>
        </div>
        <div class="delivery-cart__list"></div>
        <p class="delivery-cart__empty">Одоогоор хүргэлт сонгоогүй байна.</p>
        <button class="delivery-cart__go" type="button">Хүргэлт рүү</button>
      </div>
    `;
  }

  cacheEls() {
    this.listEl = this.querySelector(".delivery-cart__list");
    this.emptyEl = this.querySelector(".delivery-cart__empty");
    this.countEl = this.querySelector(".delivery-cart__count");
    this.goBtn = this.querySelector(".delivery-cart__go");
  }

  load() {
    this.items = this.readItems();
    this.renderList();
  }

  readItems() {
    try {
      const raw = localStorage.getItem("deliveryCart");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("deliveryCart parse error", e);
    }
    return [];
  }

  writeItems(items) {
    localStorage.setItem("deliveryCart", JSON.stringify(items));
  }

  renderList() {
    if (!this.listEl) return;
    const items = Array.isArray(this.items) ? this.items : [];
    this.listEl.innerHTML = "";
    const layout = this.closest(".offers-layout");

    if (!items.length) {
      this.style.display = "none";
      if (layout) layout.classList.remove("has-cart");
      if (this.emptyEl) this.emptyEl.style.display = "block";
      if (this.countEl) this.countEl.textContent = "0";
      if (this.goBtn) this.goBtn.style.display = "none";
      return;
    }

    this.style.display = "block";
    if (layout) layout.classList.add("has-cart");
    if (this.emptyEl) this.emptyEl.style.display = "none";
    if (this.goBtn) this.goBtn.style.display = "inline-flex";

    let count = 0;
    items.forEach((item) => {
      const qty = Number(item.qty || 1);
      const price = this.parsePrice(item.price);
      count += qty;

      const sub = Array.isArray(item.sub) ? item.sub : [];
      const subText = sub.length
        ? sub.map((s) => s.name).filter(Boolean).join(", ")
        : "Бараа алга";

      const row = document.createElement("div");
      row.className = "delivery-cart__item";
      row.dataset.id = item.id || "";
      row.innerHTML = `
        <div class="delivery-cart__thumb">
          <img src="${this.escapeAttr(item.thumb || "assets/img/box.svg")}" alt="">
        </div>
        <div class="delivery-cart__info">
          <div class="delivery-cart__title">${this.escapeHtml(item.title || "")}</div>
          <div class="delivery-cart__meta">${this.escapeHtml(item.meta || "")}</div>
          <div class="delivery-cart__sub">${this.escapeHtml(subText)}</div>
        </div>
        <div class="delivery-cart__price">
          <span>${this.formatPrice(price * qty)}</span>
          <button class="delivery-cart__remove" type="button" data-action="remove">−</button>
          <span class="delivery-cart__qty">x${qty}</span>
        </div>
      `;
      this.listEl.appendChild(row);
    });

    if (this.countEl) this.countEl.textContent = String(count);
  }

  handleClick(e) {
    const goBtn = e.target.closest(".delivery-cart__go");
    if (goBtn) {
      location.hash = "#delivery";
      return;
    }
    const btn = e.target.closest("[data-action='remove']");
    if (!btn) return;
    const itemEl = btn.closest(".delivery-cart__item");
    const id = itemEl?.dataset?.id;
    if (!id) return;

    const items = this.readItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = items[idx];
    const qty = Number(item.qty || 1);
    if (qty > 1) {
      item.qty = qty - 1;
    } else {
      items.splice(idx, 1);
    }
    this.writeItems(items);
    this.items = items;
    this.renderList();
    window.dispatchEvent(new Event("delivery-cart-updated"));
  }

  handleUpdate() {
    this.load();
  }

  parsePrice(str) {
    return parseInt(String(str || "").replace(/[^\d]/g, ""), 10) || 0;
  }

  formatPrice(n) {
    return Number(n || 0).toLocaleString("mn-MN") + "₮";
  }

  escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  escapeAttr(s) {
    return String(s || "").replace(/"/g, "&quot;");
  }
}

customElements.define("delivery-cart", DeliveryCart);

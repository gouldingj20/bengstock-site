(function () {
  const key = "jbg-basket";
  const legacy = { software: 1, "software-basic": 1, "software-pro": 1, bengstock: 1, "bengstock-basic": 1, "bengstock-pro": 1, "bengstock-extra": 1 };
  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(key) || "[]");
      return items.filter((item) => !legacy[item.id]);
    } catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(key, JSON.stringify(items));
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = items.reduce((n, item) => n + item.qty, 0);
    });
  }
  function add(id, name, qty) {
    const items = read();
    const found = items.find((item) => item.id === id);
    const n = Math.max(1, Number(qty) || 1);
    if (found) found.qty += n;
    else items.push({ id, name, qty: n });
    write(items);
  }
  function bind() {
    document.querySelectorAll("[data-add]:not([data-bound])").forEach((btn) => {
      btn.dataset.bound = "1";
      const label = btn.textContent;
      btn.addEventListener("click", () => {
        const input = btn.parentElement.querySelector("[data-qty]");
        add(btn.dataset.add, btn.dataset.name, input && input.value);
        btn.textContent = "Added ✓";
        setTimeout(() => { btn.textContent = label; }, 1600);
      });
    });
  }
  write(read());
  bind();
  window.JBG = {
    list: read,
    bind,
    remove(id) { write(read().filter((item) => item.id !== id)); },
    setQty(id, qty) {
      const items = read();
      const found = items.find((item) => item.id === id);
      if (!found) return;
      found.qty = Math.max(1, Number(qty) || 1);
      write(items);
    }
  };
})();

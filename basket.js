(function () {
  const key = "jbg-basket";
  function read() {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch (e) { return []; }
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
  write(read());
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("[data-qty]");
      add(btn.dataset.add, btn.dataset.name, input && input.value);
      btn.textContent = "Added";
    });
  });
  window.JBG = {
    list: read,
    remove(id) { write(read().filter((item) => item.id !== id)); }
  };
})();

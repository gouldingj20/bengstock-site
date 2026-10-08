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
  function add(id, name) {
    const items = read();
    const found = items.find((item) => item.id === id);
    if (found) found.qty += 1;
    else items.push({ id, name, qty: 1 });
    write(items);
  }
  write(read());
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      add(btn.dataset.add, btn.dataset.name);
      btn.textContent = "Added";
    });
  });
  window.JBG = {
    list: read,
    remove(id) { write(read().filter((item) => item.id !== id)); }
  };
})();

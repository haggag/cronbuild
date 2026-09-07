try {
  var saved = localStorage.getItem("cronbuild:preferences:v1");
  var prefs = saved && saved.length <= 1024 ? JSON.parse(saved) : null;
  document.documentElement.dataset.theme =
    prefs && prefs.theme === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

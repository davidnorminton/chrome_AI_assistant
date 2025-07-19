// options.js

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["apiKey", "model"], (data) => {
    document.getElementById("apiKey").value = data.apiKey || "";
    // Set a default model that exists in the new list, e.g., 'sonar-small-online'
    document.getElementById("modelSelect").value = data.model || "sonar-small-online";
  });

  document.getElementById("saveSettings").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value.trim();
    const model = document.getElementById("modelSelect").value;

    chrome.storage.local.set({ apiKey, model }, () => {
      const msg = document.getElementById("saveMsg");
      msg.style.display = "block";
      setTimeout(() => msg.style.display = "none", 2000);
    });
  });
});
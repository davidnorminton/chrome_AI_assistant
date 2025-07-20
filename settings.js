const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");
const historyList = document.getElementById("queryHistory");

// Perplexity models that work in the sidebar context
const modelOptions = [
  // 'pplx-7b-chat',
  // 'pplx-70b-chat',
  // 'sonar-deep-research',
  // 'sonar-reasoning-pro',
  // 'sonar-reasoning',
  'sonar-pro',
  'sonar',
];

function populateModels() {
  modelOptions.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model;
    opt.textContent = model;
    modelEl.appendChild(opt);
  });
}

saveBtn.addEventListener("click", () => {
  const model = modelEl.value;
  const apiKey = apiKeyEl.value;

  if (!apiKey || !model) {
    statusEl.textContent = "API key and model are required.";
    return;
  }

  chrome.storage.local.set({ model, apiKey }, () => {
    statusEl.textContent = "Settings saved.";
    setTimeout(() => (statusEl.textContent = ""), 2000);
  });
});

window.onload = () => {
  populateModels();
  chrome.storage.local.get(["model", "apiKey", "queryHistory"], (data) => {
    if (data.model) modelEl.value = data.model;
    if (data.apiKey) apiKeyEl.value = data.apiKey;

    const history = data.queryHistory || [];
    history.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.query} → ${entry.response}`;
      historyList.appendChild(li);
    });
  });
};
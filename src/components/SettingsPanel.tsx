/// <reference types="chrome" />
import { useEffect, useState } from "react";

// Define both the values _and_ user-friendly labels
const modelOptions = [
  { value: "sonar-small-online", label: "Sonar Small (Online)" },
  { value: "sonar-pro",        label: "Sonar Pro"          },
  { value: "sonar",            label: "Sonar"              },
];

export default function SettingsPanel() {
  const [apiKey, setApiKey]   = useState("");
  // Default to the first option so there's always a match
  const [model,   setModel]   = useState(modelOptions[0].value);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["apiKey", "model"], (data: { apiKey?: string; model?: string }) => {
      if (data.apiKey)   setApiKey(data.apiKey);
      if (data.model && modelOptions.some(opt => opt.value === data.model)) {
        setModel(data.model);
      }
    });
  }, []);

  const saveSettings = () => {
    if (!apiKey) {
      setSaveMsg("API key is required!");
      return;
    }
    chrome.storage.local.set({ apiKey, model }, () => {
      setSaveMsg("Settings saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    });
  };

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      <label>API Key:</label>
      <input
        type="text"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="Enter your API key"
      />

      <label>Model:</label>
      <select value={model} onChange={e => setModel(e.target.value)}>
        {modelOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button onClick={saveSettings}>Save</button>
      {saveMsg && <div className="save-msg">{saveMsg}</div>}
    </div>
  );
}
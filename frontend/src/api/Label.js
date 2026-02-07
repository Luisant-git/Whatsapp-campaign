// src/api/Label.js
import { API_BASE_URL } from "./config";

/* =======================
COLOR HELPERS (localStorage)
======================= */

const COLOR_KEY = "label_colors";

export const getLabelColor = (name) => {
  if (typeof window === "undefined") return null;
  const map = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
  return map[name] || null; // Return null if not found
};

export const saveLabelColor = (name, color) => {
  if (typeof window === "undefined" || !color) return;
  const map = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
  map[name] = color;
  localStorage.setItem(COLOR_KEY, JSON.stringify(map));
};

export const removeLabelColor = (name) => {
  if (typeof window === "undefined") return;
  const map = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
  delete map[name];
  localStorage.setItem(COLOR_KEY, JSON.stringify(map));
};

/* =======================
GET CUSTOM LABELS
Backend returns: ["new lead", "vip"]
We convert to: [{ name, color }]
======================= */

export const getCustomLabels = async () => {
  const res = await fetch(`${API_BASE_URL}/contact/labels/custom`, {
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load labels");
  }

  const labels = await res.json(); // ["new lead", "vip"]

  return labels.map((name) => ({
    name,
    color: getLabelColor(name),
  }));
};

/* =======================
ADD LABEL (STRING ONLY)
======================= */

export const addCustomLabel = async (labelName) => {
  const res = await fetch(`${API_BASE_URL}/contact/labels/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      label: labelName, // STRING ONLY
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to add label");
  }

  // don't assume backend color; just keep local
  return res.json();
};

/* =======================
UPDATE LABELS (STRING[])
======================= */

export const updateLabels = async (labels) => {
  // labels: [{ name, color }]
  const labelNames = labels.map((l) => l.name);

  const res = await fetch(`${API_BASE_URL}/contact/labels/custom`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      labels: labelNames, // STRING[]
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update labels");
  }

  // Persist colors locally
  labels.forEach((l) => saveLabelColor(l.name, l.color));

  return res.json();
};

/* =======================
DELETE LABEL
======================= */

export const deleteCustomLabel = async (labelName) => {
  const res = await fetch(
    `${API_BASE_URL}/contact/labels/custom/${encodeURIComponent(labelName)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete label");
  }

  removeLabelColor(labelName);
  return res.json();
};
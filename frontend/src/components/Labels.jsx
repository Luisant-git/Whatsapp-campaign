// src/components/Labels.jsx
import { useState, useEffect } from "react";
import { Tag, Plus, X, Edit2, Trash2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";

import "../styles/Label.css";
import {
  addCustomLabel,
  deleteCustomLabel,
  getCustomLabels,
  updateLabels,
  getLabelColor,
  saveLabelColor,
} from "../api/Label";

export default function Labels() {
  const [labels, setLabels] = useState([]); // [{ name, color }]
  const [showModal, setShowModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null); // { name, color } or null
  const [formData, setFormData] = useState({
    name: "",
    color: "#22c55e",
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const data = await getCustomLabels(); // [{ name, color }]
      setLabels(data);
    } catch (err) {
      showToast(err.message || "Failed to load labels", "error");
    }
  };

  const openAdd = () => {
    setEditingLabel(null);
    setFormData({ name: "", color: "#22c55e" });
    setShowModal(true);
  };

  const openEdit = (label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showToast("Label name is required", "error");
      return;
    }

    try {
      if (editingLabel) {
        // We are renaming / recoloring an existing label
        const updatedLabels = labels.map((l) =>
          l.name === editingLabel.name
            ? { name: trimmedName, color: formData.color }
            : l
        );

        // Backend only needs names
        await updateLabels(updatedLabels);

        // Save colors locally
        updatedLabels.forEach((l) => saveLabelColor(l.name, l.color));

        showToast("Label updated successfully", "success");
      } else {
        // Add new label (backend expects STRING)
        await addCustomLabel(trimmedName);

        // Save color locally
        saveLabelColor(trimmedName, formData.color);

        showToast("Label added successfully", "success");
      }

      setShowModal(false);
      await loadLabels();
    } catch (err) {
      showToast(err.message || "Operation failed", "error");
    }
  };

  const handleDelete = async (label) => {
    if (!window.confirm(`Delete label "${label.name}"?`)) return;

    try {
      await deleteCustomLabel(label.name);
      showToast("Label deleted successfully", "success");
      await loadLabels();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  return (
    <div className="labels-container">
      {/* Header */}
      <div className="labels-header">
        <div className="header-left">
          <Tag size={24} />
          <h2>Labels</h2>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> Add Label
        </button>
      </div>

      {/* Labels Grid */}
      <div className="labels-grid">
        {labels.map((label) => (
          <div key={label.name} className="label-card">
            <span
              className="label-dot"
              style={{ backgroundColor: label.color }}
            />
            <span className="label-name">{label.name}</span>

            <div className="label-actions">
              {/* <button
                className="btn-icon"
                onClick={() => openEdit(label)}
                title="Edit"
              >
                <Edit2 size={16} />
              </button> */}
              <button
                className="btn-icon danger"
                onClick={() => handleDelete(label)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingLabel ? "Edit Label" : "Add Label"}</h3>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Label Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Eg: VIP, Pending, Paid"
                  required
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    style={{ width: "80px" }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingLabel ? "Update" : "Add"} Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
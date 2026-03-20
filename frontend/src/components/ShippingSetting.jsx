import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Loader2,
    AlertCircle,
    Truck,
} from "lucide-react";
import "../styles/ShippingSettings.css";
import { useToast } from "../contexts/ToastContext";
import { ecommerceApi } from "../api/ecommerce";
import Select from "react-select";

export default function ShippingSettings() {
    const [shippingRates, setShippingRates] = useState([]);
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingRate, setEditingRate] = useState(null);

    const [formData, setFormData] = useState({
        state: "",
        flatShippingRate: "",
    });

    const [validationError, setValidationError] = useState("");

    const { showSuccess, showError } = useToast();

    useEffect(() => {
        loadShippingRates();
    }, []);
    const stateOptions = [
        { value: "ANDHRA_PRADESH", label: "Andhra Pradesh" },
        { value: "ARUNACHAL_PRADESH", label: "Arunachal Pradesh" },
        { value: "ASSAM", label: "Assam" },
        { value: "BIHAR", label: "Bihar" },
        { value: "CHHATTISGARH", label: "Chhattisgarh" },
        { value: "GOA", label: "Goa" },
        { value: "GUJARAT", label: "Gujarat" },
        { value: "HARYANA", label: "Haryana" },
        { value: "HIMACHAL_PRADESH", label: "Himachal Pradesh" },
        { value: "JHARKHAND", label: "Jharkhand" },
        { value: "KARNATAKA", label: "Karnataka" },
        { value: "KERALA", label: "Kerala" },
        { value: "MADHYA_PRADESH", label: "Madhya Pradesh" },
        { value: "MAHARASHTRA", label: "Maharashtra" },
        { value: "MANIPUR", label: "Manipur" },
        { value: "MEGHALAYA", label: "Meghalaya" },
        { value: "MIZORAM", label: "Mizoram" },
        { value: "NAGALAND", label: "Nagaland" },
        { value: "ODISHA", label: "Odisha" },
        { value: "PUNJAB", label: "Punjab" },
        { value: "RAJASTHAN", label: "Rajasthan" },
        { value: "SIKKIM", label: "Sikkim" },
        { value: "TAMIL_NADU", label: "Tamil Nadu" },
        { value: "TELANGANA", label: "Telangana" },
        { value: "TRIPURA", label: "Tripura" },
        { value: "UTTAR_PRADESH", label: "Uttar Pradesh" },
        { value: "UTTARAKHAND", label: "Uttarakhand" },
        { value: "WEST_BENGAL", label: "West Bengal" },
        { value: "ANDAMAN_AND_NICOBAR_ISLANDS", label: "Andaman and Nicobar Islands" },
        { value: "CHANDIGARH", label: "Chandigarh" },
        { value: "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU", label: "Dadra and Nagar Haveli and Daman and Diu" },
        { value: "DELHI", label: "Delhi" },
        { value: "JAMMU_AND_KASHMIR", label: "Jammu and Kashmir" },
        { value: "LADAKH", label: "Ladakh" },
        { value: "LAKSHADWEEP", label: "Lakshadweep" },
        { value: "PUDUCHERRY", label: "Puducherry" },
    ];
    const loadShippingRates = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await ecommerceApi.getShippingRates();
            setShippingRates(res.data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load shipping rates");
        } finally {
            setLoading(false);
        }
    };

    const filteredRates = useMemo(() => {
        return shippingRates.filter((item) =>
            item.state?.toLowerCase().includes(searchInput.toLowerCase())
        );
    }, [shippingRates, searchInput]);

    const resetForm = () => {
        setFormData({
            state: "",
            flatShippingRate: "",
        });
        setEditingRate(null);
        setValidationError("");
    };

    const handleOpenAdd = () => {
        resetForm();
        setShowModal(true);
    };

    const handleOpenEdit = (rate) => {
        setEditingRate(rate);
        setFormData({
            state: rate.state || "",
            flatShippingRate: rate.flatShippingRate?.toString() || "",
        });
        setValidationError("");
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.state.trim()) {
            setValidationError("State is required");
            return;
        }

        if (!formData.flatShippingRate || Number(formData.flatShippingRate) < 0) {
            setValidationError("Please enter a valid shipping rate");
            return;
        }

        setValidationError("");
        setLoading(true);

        try {
            const payload = {
                state: formData.state.trim().toUpperCase(),
                flatShippingRate: Number(formData.flatShippingRate),
            };

            if (editingRate) {
                await ecommerceApi.updateShippingRate(editingRate.id, payload);
                showSuccess("Shipping rate updated successfully");
            } else {
                await ecommerceApi.createShippingRate(payload);
                showSuccess("Shipping rate created successfully");
            }

            setShowModal(false);
            resetForm();
            await loadShippingRates();
        } catch (err) {
            console.error(err);
            showError(
                editingRate
                    ? "Failed to update shipping rate"
                    : "Failed to create shipping rate"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, state) => {
        if (!window.confirm(`Delete shipping rate for "${state}"?`)) return;

        setLoading(true);
        try {
            await ecommerceApi.deleteShippingRate(id);
            showSuccess("Shipping rate deleted successfully");
            await loadShippingRates();
        } catch (err) {
            console.error(err);
            showError("Failed to delete shipping rate");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-container">
            {/* Header */}
            <div className="contact-header">
                <div className="header-left">
                    <Truck size={24} />
                    <div>
                        <h2>Shipping Settings</h2>
                        <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
                            Manage shipping rates by state
                        </p>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn-primary" onClick={handleOpenAdd}>
                        <Plus size={18} /> Add Shipping
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="filters-section">
                <div className="search-bar" style={{ maxWidth: "400px" }}>
                    <Search size={20} />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search shipping..."
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div
                    className="error-banner"
                    style={{
                        background: "#fee",
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}
                >
                    <AlertCircle size={20} color="#d00" />
                    <span>{error}</span>
                </div>
            )}

            {/* Table */}
            {loading && filteredRates.length === 0 ? (
                <div className="empty-state">
                    <Loader2 size={48} className="spin" />
                    <p>Loading…</p>
                </div>
            ) : filteredRates.length === 0 ? (
                <div className="empty-state">
                    <Truck size={48} />
                    <p>No shipping rates found.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="contacts-table">
                        <thead>
                            <tr>
                                <th>State</th>
                                <th>Shipping Rate</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRates.map((rate) => (
                                <tr key={rate.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Truck size={16} />
                                            {rate.state}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>₹{rate.flatShippingRate}</td>
                                    <td>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            <button
                                                className="btn-icon"
                                                title="Edit"
                                                style={{
                                                    color: "#25d366",
                                                   
                                                    borderRadius: "6px",
                                                    padding: "8px",
                                                }}
                                                onClick={() => handleOpenEdit(rate)}
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            <button
                                                className="btn-icon"
                                                title="Delete"
                                                style={{
                                                    color: "#dc2626",
                                                   
                                                    borderRadius: "6px",
                                                    padding: "8px",
                                                }}
                                                onClick={() => handleDelete(rate.id, rate.state)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 520 }}
                    >
                        <div className="modal-header">
                            <h3>{editingRate ? "Edit Shipping Rate" : "Add Shipping Rate"}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {validationError && (
                            <div
                                style={{
                                    background: "#fef2f2",
                                    color: "#991b1b",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: 4,
                                    marginBottom: "0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                            >
                                <AlertCircle size={18} color="#dc2626" />
                                <span>{validationError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>State *</label>
                                <Select
                                    options={stateOptions}
                                    value={stateOptions.find((opt) => opt.value === formData.state) || null}
                                    onChange={(selected) =>
                                        setFormData({ ...formData, state: selected?.value || "" })
                                    }
                                    isSearchable
                                    placeholder="Search and select state..."
                                    styles={{
                                        control: (base, state) => ({
                                            ...base,
                                            minHeight: 46,
                                            borderRadius: 8,
                                            borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
                                            boxShadow: state.isFocused ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
                                            "&:hover": {
                                                borderColor: "#2563eb",
                                            },
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isSelected
                                                ? "#2563eb"
                                                : state.isFocused
                                                    ? "#eff6ff"
                                                    : "#fff",
                                            color: state.isSelected ? "#fff" : "#111827",
                                            cursor: "pointer",
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: "#111827",
                                        }),
                                        placeholder: (base) => ({
                                            ...base,
                                            color: "#6b7280",
                                        }),
                                        dropdownIndicator: (base, state) => ({
                                            ...base,
                                            color: state.isFocused ? "#2563eb" : "#6b7280",
                                            "&:hover": {
                                                color: "#2563eb",
                                            },
                                        }),
                                        indicatorSeparator: () => ({
                                            display: "none",
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            zIndex: 9999,
                                        }),
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Flat Shipping Rate *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.flatShippingRate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, flatShippingRate: e.target.value })
                                    }
                                    placeholder="Enter shipping rate"
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="spin" />{" "}
                                            {editingRate ? "Updating…" : "Adding…"}
                                        </>
                                    ) : (
                                        <>{editingRate ? "Update" : "Add"} Shipping</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
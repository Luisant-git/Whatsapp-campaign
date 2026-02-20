import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import { Pencil, Trash2 } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cats, subs] = await Promise.all([
      ecommerceApi.getCategories(),
      ecommerceApi.getSubCategories(),
    ]);
    setCategories(cats.data);
    setSubCategories(subs.data);
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (editingCat) {
      await ecommerceApi.updateCategory(editingCat.id, { name: catName });
      setEditingCat(null);
    } else {
      await ecommerceApi.createCategory({ name: catName });
    }
    setCatName('');
    loadData();
  };

  const deleteCategory = async (id) => {
    if (confirm('Delete this category? All subcategories and products will be deleted.')) {
      await ecommerceApi.deleteCategory(id);
      loadData();
    }
  };

  const addSubCategory = async (e) => {
    e.preventDefault();
    if (editingSub) {
      await ecommerceApi.updateSubCategory(editingSub.id, { name: subCatName, categoryId: parseInt(selectedCat) });
      setEditingSub(null);
    } else {
      await ecommerceApi.createSubCategory({ name: subCatName, categoryId: parseInt(selectedCat) });
    }
    setSubCatName('');
    setSelectedCat('');
    loadData();
  };

  const deleteSubCategory = async (id) => {
    if (confirm('Delete this subcategory? All products will be deleted.')) {
      await ecommerceApi.deleteSubCategory(id);
      loadData();
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <h2>Categories & SubCategories</h2>
        {/* <p>Organize your products into categories</p> */} 
      </div>

      <div className="ecommerce-grid">
        <div className="ecommerce-card">
          <h3>{editingCat ? 'Edit' : 'Add'} Category</h3>
          <form onSubmit={addCategory}>
            <div className="form-group">
              <label>Category Name</label>
              <input
                className="form-input"
                placeholder="e.g., Electronics"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">{editingCat ? 'Update' : 'Add'} Category</button>
            {editingCat && <button type="button" className="btn-secondary" onClick={() => { setEditingCat(null); setCatName(''); }}>Cancel</button>}
          </form>
          <ul className="category-list">
            {categories.map((cat) => (
              <li key={cat.id}>
                {cat.name}
                <div>
                  <button onClick={() => { setEditingCat(cat); setCatName(cat.name); }}><Pencil size={16} /></button>
                  <button onClick={() => deleteCategory(cat.id)} style={{color: '#ef4444'}}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="ecommerce-card">
          <h3>{editingSub ? 'Edit' : 'Add'} SubCategory</h3>
          <form onSubmit={addSubCategory}>
            <div className="form-group">
              <label>Select Category</label>
              <select
                className="form-select"
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                required
              >
                <option value="">Choose category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>SubCategory Name</label>
              <input
                className="form-input"
                placeholder="e.g., Smartphones"
                value={subCatName}
                onChange={(e) => setSubCatName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">{editingSub ? 'Update' : 'Add'} SubCategory</button>
            {editingSub && <button type="button" className="btn-secondary" onClick={() => { setEditingSub(null); setSubCatName(''); setSelectedCat(''); }}>Cancel</button>}
          </form>
          <ul className="category-list">
            {subCategories.map((sub) => (
              <li key={sub.id}>
                {sub.name} <span style={{color: '#9ca3af'}}>({sub.category?.name})</span>
                <div>
                  <button onClick={() => { setEditingSub(sub); setSubCatName(sub.name); setSelectedCat(sub.categoryId); }}><Pencil size={16} /></button>
                  <button onClick={() => deleteSubCategory(sub.id)} style={{color: '#ef4444'}}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

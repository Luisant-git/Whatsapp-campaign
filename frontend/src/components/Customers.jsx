import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import * as XLSX from 'xlsx';
import { Download, Eye, X, Search } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const res = await ecommerceApi.getCustomers();
    const customersWithStatus = res.data.map(c => ({
      ...c,
      status: c.status || 'active'
    }));
    setCustomers(customersWithStatus);
  };

  const updateCustomerStatus = async (phone, status) => {
    setCustomers(customers.map(c => 
      c.customerPhone === phone ? { ...c, status } : c
    ));
  };

  const filteredCustomers = customers.filter(c =>
    c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customerPhone?.includes(searchQuery) ||
    c.customerAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToExcel = () => {
    const exportData = customers.map(customer => ({
      'Customer Name': customer.customerName,
      'Phone': customer.customerPhone,
      'Address': customer.customerAddress || 'N/A',
      'Total Orders': customer.totalOrders,
      'Total Spent': `₹${customer.totalSpent}`,
      'Last Order Date': new Date(customer.lastOrderDate).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Customers</h2>
        </div>
        <button className="btn-primary" onClick={exportToExcel}>
          <Download size={18} /> Export Report
        </button>
      </div>

      <div className="filters-section">
        <div style={{position: 'relative', width: '300px'}}>
          <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} />
          <input
            type="text"
            className="form-input"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{paddingLeft: '40px', padding: '8px 12px 8px 40px'}}
          />
        </div>
        <div className="total-count">
          Showing: {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="table-container">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Total Orders</th>
              <th>Total Spent</th>
              <th>Last Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.customerPhone}>
                <td style={{fontWeight: 500}}>{customer.customerName}</td>
                <td>{customer.customerPhone}</td>
                <td style={{fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {customer.customerAddress || 'N/A'}
                </td>
                <td style={{fontWeight: 600}}>{customer.totalOrders}</td>
                <td style={{fontWeight: 600, color: '#10b981'}}>₹{customer.totalSpent}</td>
                <td>{new Date(customer.lastOrderDate).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-${customer.status}`}>
                    {customer.status}
                  </span>
                </td>
                <td>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <select
                      className="form-select"
                      value={customer.status}
                      onChange={(e) => updateCustomerStatus(customer.customerPhone, e.target.value)}
                      style={{padding: '4px 8px', fontSize: '12px', minWidth: '100px'}}
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                      <option value="vip">VIP</option>
                    </select>
                    <button
                      style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s'}}
                      onClick={() => setViewCustomer(customer)}
                      title="View Orders"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px'}}>
            <div className="modal-header">
              <h3>Order History - {viewCustomer.customerName}</h3>
              <button className="modal-close" onClick={() => setViewCustomer(null)}>×</button>
            </div>
            <div style={{padding: '20px'}}>
              <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <p><strong>Phone:</strong> {viewCustomer.customerPhone}</p>
                <p><strong>Total Orders:</strong> {viewCustomer.totalOrders}</p>
                <p><strong>Total Spent:</strong> ₹{viewCustomer.totalSpent}</p>
                <p><strong>Address:</strong> {viewCustomer.customerAddress || 'N/A'}</p>
              </div>
              <table className="contacts-table" style={{fontSize: '13px'}}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {viewCustomer.orders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.productName}</td>
                      <td style={{fontWeight: 600}}>₹{order.amount}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

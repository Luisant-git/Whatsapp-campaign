import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import * as XLSX from 'xlsx';
import { Download, Eye, Search } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await ecommerceApi.getCustomers();
      setCustomers(res.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  };

  const parseInputDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Search only for table display
  const searchedCustomers = customers.filter((customer) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      customer.customerName?.toLowerCase().includes(query) ||
      customer.customerPhone?.includes(searchQuery) ||
      customer.customerAddress?.toLowerCase().includes(query)
    );
  });

  // Date filter only for Excel export
  const dateFilteredCustomers = customers.filter((customer) => {
    if (!customer.lastOrderDate) return false;

    const rawDate = new Date(customer.lastOrderDate);
    if (isNaN(rawDate.getTime())) return false;

    const customerDate = new Date(
      rawDate.getFullYear(),
      rawDate.getMonth(),
      rawDate.getDate()
    );

    const from = parseInputDate(fromDate);
    const to = parseInputDate(toDate);

    if (from && customerDate < from) return false;
    if (to && customerDate > to) return false;

    return true;
  });

  const exportToExcel = () => {
    const exportData = dateFilteredCustomers.map((customer) => ({
      'Customer Name': customer.customerName || 'N/A',
      Phone: customer.customerPhone || 'N/A',
      Address: customer.customerAddress || 'N/A',
      'Total Orders': customer.totalOrders ?? 0,
      'Total Spent': `₹${customer.totalSpent ?? 0}`,
      'Last Order Date': customer.lastOrderDate
        ? new Date(customer.lastOrderDate).toLocaleDateString()
        : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    XLSX.writeFile(
      wb,
      `customers_${fromDate || 'all'}_${toDate || 'all'}.xlsx`
    );
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Customers</h2>
        </div>
      </div>

      <div
        className="filters-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          flexWrap: 'nowrap',
          paddingBottom: '4px',
        }}
      >
        <div style={{ position: 'relative', width: '220px', flexShrink: 0 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 10px 7px 34px',
              fontSize: '13px',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            From:
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="form-input"
            style={{ padding: '6px 8px', width: '135px', fontSize: '13px' }}
          />

          <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            To:
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="form-input"
            style={{ padding: '6px 8px', width: '135px', fontSize: '13px' }}
          />
        </div>

        <button
          className="btn-primary"
          onClick={exportToExcel}
          style={{ padding: '8px 14px', fontSize: '13px', flexShrink: 0 }}
        >
          <Download size={16} /> Export Report
        </button>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {searchedCustomers.length > 0 ? (
              searchedCustomers.map((customer) => (
                <tr key={customer.customerPhone}>
                  <td style={{ fontWeight: 500 }}>
                    {customer.customerName || 'N/A'}
                  </td>
                  <td>{customer.customerPhone || 'N/A'}</td>
                  <td
                    style={{
                      fontSize: '13px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {customer.customerAddress || 'N/A'}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {customer.totalOrders ?? 0}
                  </td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>
                    ₹{customer.totalSpent ?? 0}
                  </td>
                  <td>
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => setViewCustomer(customer)}
                      title="View Orders"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px' }}
          >
            <div className="modal-header">
              <h3>Order History - {viewCustomer.customerName || 'Customer'}</h3>
              <button
                className="modal-close"
                onClick={() => setViewCustomer(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div
                style={{
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <p><strong>Phone:</strong> {viewCustomer.customerPhone || 'N/A'}</p>
                <p><strong>Total Orders:</strong> {viewCustomer.totalOrders ?? 0}</p>
                <p><strong>Total Spent:</strong> ₹{viewCustomer.totalSpent ?? 0}</p>
                <p><strong>Address:</strong> {viewCustomer.customerAddress || 'N/A'}</p>
              </div>

              <table className="contacts-table" style={{ fontSize: '13px' }}>
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
                  {viewCustomer.orders && viewCustomer.orders.length > 0 ? (
                    viewCustomer.orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.productName || 'N/A'}</td>
                        <td style={{ fontWeight: 600 }}>₹{order.amount ?? 0}</td>
                        <td>
                          <span className={`status-badge status-${order.status}`}>
                            {order.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {order.date
                            ? new Date(order.date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import * as XLSX from 'xlsx';
import {
  Download,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  ShoppingCart,          // 👈 add this
} from 'lucide-react';
import '../styles/Ecommerce.css';
import '../styles/Analytics.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewOrder, setViewOrder] = useState(null); // 👈 for modal

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const res = await ecommerceApi.getOrders();
    setOrders(res.data);
  };

  const updateStatus = async (id, status) => {
    await ecommerceApi.updateOrderStatus(id, status);
    loadOrders();
  };

  const exportToExcel = () => {
    const exportData = orders.map((order) => ({
      'Order ID': `#${order.id}`,
      'Customer Name': order.customerName,
      Phone: order.customerPhone,
      Address: order.customerAddress || 'N/A',
      Product: order.items?.[0]?.product?.name || 'N/A',
      Amount: `₹${order.totalAmount}`,
      Status: order.status,
      Date: new Date(order.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(
      wb,
      `orders_report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const placedOrders = orders.filter(o => o.status === 'placed');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const processingOrders = orders.filter((o) => o.status === 'processing');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const filteredOrders = orders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .filter(
      (o) =>
        o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone?.includes(searchQuery) ||
        o.items?.[0]?.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id?.toString().includes(searchQuery)
    );

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Orders</h2>
        </div>
        <button className="btn-primary" onClick={exportToExcel}>
          <Download size={18} /> Export Report
        </button>
      </div>

      <div
        className="analytics-grid"
        style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(5, 1fr)' }}
      >

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: '#e0f2fe', color: '#0369a1' }}
          >
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h3>Placed</h3>
            <p className="stat-number">{placedOrders.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: '#fef3c7', color: '#d97706' }}
          >
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-number">{pendingOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: '#dbeafe', color: '#2563eb' }}
          >
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>Processing</h3>
            <p className="stat-number">{processingOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Completed</h3>
            <p className="stat-number">{completedOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon failed">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Cancelled</h3>
            <p className="stat-number">{cancelledOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div style={{ position: 'relative', width: '300px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px', padding: '8px 12px 8px 40px' }}
          />
        </div>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '200px', padding: '8px 12px' }}
        >
          <option value="all">All Orders ({orders.length})</option>
          <option value="placed">Placed ({placedOrders.length})</option>
          <option value="pending">Pending ({pendingOrders.length})</option>
          <option value="processing">Processing ({processingOrders.length})</option>
          <option value="completed">Completed ({completedOrders.length})</option>
          <option value="cancelled">Cancelled ({cancelledOrders.length})</option>
        </select>
        <div className="total-count">
          Showing: {filteredOrders.length} Order
          {filteredOrders.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="table-container">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ minWidth: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>#{order.id}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{order.customerName}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginTop: '2px',
                    }}
                  >
                    {order.customerAddress?.substring(0, 30)}
                  </div>
                </td>
                <td>{order.customerPhone}</td>
                <td style={{ fontWeight: 500 }}>
                  {order.items?.length || 0} items
                </td>
                <td style={{ fontWeight: 500 }}>
                  {order.items?.reduce((total, item) => total + item.quantity, 0) || 0}
                </td>
                <td style={{ fontWeight: 600 }}>₹{order.totalAmount}</td>
                <td style={{ fontSize: '13px' }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    {/* 👇 View button */}
                    <button
                      type="button"
                      className="order-view-btn"
                      onClick={() => setViewOrder(order)}
                      title="View order details"
                    >
                      <Eye size={16} />
                    </button>

                    {/* existing status select */}
                    <select
                      className="form-select"
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(order.id, e.target.value)
                      }
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                    >
                      <option value="placed">Placed</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order details modal */}
      {viewOrder && (
        <div
          className="order-modal-overlay"
          onClick={() => setViewOrder(null)}
        >
          <div
            className="order-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-modal-header">
              <h3>Order Details - #{viewOrder.id}</h3>
              <button
                className="order-modal-close"
                type="button"
                onClick={() => setViewOrder(null)}
              >
                ×
              </button>
            </div>

            <div className="order-modal-body">
              {/* Left column: info + shipping */}
              <div className="order-modal-column">
                <div className="order-info-card">
                  <h4>Order Information</h4>
                  <div className="order-info-row">
                    <span>Customer:</span>
                    <span>{viewOrder.customerName || 'N/A'}</span>
                  </div>

                  <div className="order-info-row">
                    <span>Status:</span>
                    <span className={`status-badge status-${viewOrder.status}`}>
                      {viewOrder.status}
                    </span>
                  </div>
                  <div className="order-info-row">
                    <span>Payment:</span>
                    <span>{viewOrder.paymentMethod || 'N/A'}</span>
                  </div>
                  <div className="order-info-row">
                    <span>Total:</span>
                    <span>₹{viewOrder.totalAmount}</span>
                  </div>
                  <div className="order-info-row">
                    <span>Date:</span>
                    <span>
                      {new Date(viewOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="order-info-card">
                  <h4>Shipping Address</h4>
                  <div className="order-info-row">
                    <span>Customer:</span>
                    <span>{viewOrder.customerName || 'N/A'}</span>
                  </div>
                  <div className="order-info-row">
                    <span>Phone:</span>
                    <span>{viewOrder.customerPhone || 'N/A'}</span>
                  </div>
                  <div className="order-info-row">
                    <span>Address:</span>
                    <span>{viewOrder.customerAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Right column: items */}
              <div className="order-modal-column">
                <div className="order-info-card">
                  <h4>Order Items</h4>
                  <div className="order-items-list">
                    {viewOrder.items?.map((item, index) => (
                      <div key={index} className="order-item-card">
                        {item.product?.imageUrl && (
                          <img
                            src={
                              item.product.imageUrl.startsWith('http')
                                ? item.product.imageUrl
                                : `http://localhost:3010${item.product.imageUrl}`
                            }
                            alt={item.product.name}
                            className="order-item-image"
                          />
                        )}
                        <div className="order-item-info">
                          <div className="order-item-name">
                            {item.product?.name || 'Product'}
                          </div>
                          {item.product?.description && (
                            <div className="order-item-desc">
                              {item.product.description}
                            </div>
                          )}
                          <div className="order-item-meta">
                            Qty: {item.quantity} × ₹{item.price}
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="order-item-card">
                        <div className="order-item-info">
                          <div className="order-item-name">No items found</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
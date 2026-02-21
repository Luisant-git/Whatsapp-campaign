import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import * as XLSX from 'xlsx';
import { Download, Package, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import '../styles/Ecommerce.css';
import '../styles/Analytics.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    const exportData = orders.map(order => ({
      'Order ID': `#${order.id}`,
      'Customer Name': order.customerName,
      'Phone': order.customerPhone,
      'Address': order.customerAddress || 'N/A',
      'Product': order.product?.name,
      'Amount': `₹${order.totalAmount}`,
      'Status': order.status,
      'Date': new Date(order.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `orders_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const processingOrders = orders.filter(o => o.status === 'processing');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const filteredOrders = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => 
      o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone?.includes(searchQuery) ||
      o.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

      <div className="analytics-grid" style={{marginBottom: '24px', gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#fef3c7', color: '#d97706'}}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-number">{pendingOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#dbeafe', color: '#2563eb'}}>
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
        <div style={{position: 'relative', width: '300px'}}>
          <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} />
          <input
            type="text"
            className="form-input"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{paddingLeft: '40px', padding: '8px 12px 8px 40px'}}
          />
        </div>
        <select 
          className="form-select" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{width: '200px', padding: '8px 12px'}}
        >
          <option value="all">All Orders ({orders.length})</option>
          <option value="pending">Pending ({pendingOrders.length})</option>
          <option value="processing">Processing ({processingOrders.length})</option>
          <option value="completed">Completed ({completedOrders.length})</option>
          <option value="cancelled">Cancelled ({cancelledOrders.length})</option>
        </select>
        <div className="total-count">
          Showing: {filteredOrders.length} Order{filteredOrders.length !== 1 ? 's' : ''}
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
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td style={{fontWeight: 600}}>#{order.id}</td>
                <td>
                  <div style={{fontWeight: 500}}>{order.customerName}</div>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '2px'}}>
                    {order.customerAddress?.substring(0, 30)}
                  </div>
                </td>
                <td>{order.customerPhone}</td>
                <td>{order.product?.name}</td>
                <td style={{fontWeight: 600}}>₹{order.totalAmount}</td>
                <td style={{fontSize: '13px'}}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <select
                    className="form-select"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    style={{padding: '6px 10px', fontSize: '13px'}}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import '../styles/Ecommerce.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);

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

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Orders</h2>
        </div>
      </div>

      <div className="filters-section">
        <div className="total-count">
          Total: {orders.length} Order{orders.length !== 1 ? 's' : ''}
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{fontWeight: 600}}>#{order.id}</td>
                <td>
                  <div style={{fontWeight: 500}}>{order.customerName}</div>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '2px'}}>{order.customerAddress?.substring(0, 30)}</div>
                </td>
                <td>{order.customerPhone}</td>
                <td>{order.product?.name}</td>
                <td style={{fontWeight: 600}}>₹{order.totalAmount}</td>
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
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

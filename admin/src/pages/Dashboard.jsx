import { MdPeople, MdCampaign, MdMessage, MdCheckCircle } from 'react-icons/md';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const stats = [
    { label: 'Total Users', value: '1,234', icon: MdPeople, color: '#3b82f6' },
    { label: 'Active Campaigns', value: '45', icon: MdCampaign, color: '#10b981' },
    { label: 'Messages Sent', value: '12.5K', icon: MdMessage, color: '#f59e0b' },
    { label: 'Success Rate', value: '94%', icon: MdCheckCircle, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard Overview</h1>
      
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
                <Icon size={28} color={stat.color} />
              </div>
              <div className="stat-info">
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <h2>Recent Activity</h2>
          <p>No recent activity to display</p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '../styles/Layout.css';

export default function Layout({ children }) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth <= 1023);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1023);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      const smallScreen = window.innerWidth <= 1023;
      setIsMobileOrTablet(smallScreen);
      setSidebarOpen(!smallScreen);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {isMobileOrTablet && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <div className={`main-content ${sidebarOpen && !isMobileOrTablet ? 'sidebar-open' : ''}`}>
        <Header toggleSidebar={toggleSidebar} />
        <main className="content-area">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
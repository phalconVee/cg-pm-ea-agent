import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose: _onMobileClose }) => {
  return (
    <>
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <img src="/logo.png" alt="TurboTax" className="logo-image" />
          <div className="logo-text">
            <div className="logo-title">Do It Yourself</div>
            <div className="logo-subtitle">Free Edition</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item nav-item-active">
            Tax Home
          </li>
          <li className="nav-item">
            Documents
          </li>
        </ul>
        
        <div className="nav-divider"></div>
        
        <div className="nav-section">
          <div className="nav-section-heading">2025 TAXES</div>
          <ul className="nav-list">
            <li className="nav-item">My Info</li>
            <li className="nav-item nav-item-expandable">
              Federal
              <span className="nav-chevron">›</span>
            </li>
            <li className="nav-item nav-item-expandable">
              State Taxes
              <span className="nav-chevron">›</span>
            </li>
            <li className="nav-item">Review</li>
            <li className="nav-item">File</li>
          </ul>
        </div>
        
        <div className="nav-divider"></div>
        
        <ul className="nav-list">
          <li className="nav-item nav-item-expandable">
            Tax Tools
            <span className="nav-chevron">›</span>
          </li>
        </ul>
        
        <div className="nav-divider"></div>
        
        <ul className="nav-list nav-list-bottom">
          <li className="nav-item">Refer and Earn</li>
          <li className="nav-item">Intuit Account</li>
          <li className="nav-item">Cambiar a español</li>
          <li className="nav-item nav-item-expandable">
            Switch Products
            <span className="nav-chevron">›</span>
          </li>
          <li className="nav-item">Sign Out</li>
        </ul>
      </nav>
    </aside>
    </>
  );
};

export default Sidebar;

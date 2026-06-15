import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, FolderOpen, User, Plus, LogOut, Vault } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon"><Vault size={18} /></div>
          AlgoVault
        </Link>

        {user ? (
          <>
            <div className="navbar-links">
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <Flame size={16} /> Feed
              </Link>
              <Link to="/lists" className={`nav-link ${isActive('/lists') ? 'active' : ''}`}>
                <FolderOpen size={16} /> Lists
              </Link>
              <Link to="/submit" className={`nav-link ${isActive('/submit') ? 'active' : ''}`}>
                <Plus size={16} /> Submit
              </Link>
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
                <User size={16} /> Profile
              </Link>
            </div>
            <div className="navbar-auth">
              <span className="nav-user">
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: user.tier_color || '#808080',
                  display: 'inline-block'
                }} />
                {user.username}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

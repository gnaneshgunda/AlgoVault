import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, FolderOpen, User, Plus, LogOut, Vault, Menu, X } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const close = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" onClick={close}>
          <div className="logo-icon"><Vault size={18} /></div>
          AlgoVault
        </Link>

        {/* Desktop nav */}
        {user ? (
          <>
            <div className="navbar-links navbar-links-desktop">
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}><Flame size={16} /> Feed</Link>
              <Link to="/lists" className={`nav-link ${isActive('/lists') ? 'active' : ''}`}><FolderOpen size={16} /> Lists</Link>
              <Link to="/submit" className={`nav-link ${isActive('/submit') ? 'active' : ''}`}><Plus size={16} /> Submit</Link>
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}><User size={16} /> Profile</Link>
            </div>
            <div className="navbar-auth navbar-auth-desktop">
              <span className="nav-user">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: user.tier_color || '#808080', display: 'inline-block' }} />
                {user.username}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}><LogOut size={14} /> Logout</button>
            </div>
            {/* Mobile hamburger */}
            <button className="btn btn-ghost btn-sm navbar-hamburger" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {user && menuOpen && (
        <div className="navbar-mobile-menu">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={close}><Flame size={16} /> Feed</Link>
          <Link to="/lists" className={`nav-link ${isActive('/lists') ? 'active' : ''}`} onClick={close}><FolderOpen size={16} /> Lists</Link>
          <Link to="/submit" className={`nav-link ${isActive('/submit') ? 'active' : ''}`} onClick={close}><Plus size={16} /> Submit</Link>
          <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`} onClick={close}><User size={16} /> Profile</Link>
          <div className="navbar-mobile-footer">
            <span className="nav-user">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: user.tier_color || '#808080', display: 'inline-block' }} />
              {user.username}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { onLogout(); close(); }}><LogOut size={14} /> Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

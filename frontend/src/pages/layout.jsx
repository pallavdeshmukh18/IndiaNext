import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Layout = ({ children, session }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const content = children || <Outlet />;

  return (
    <div className="app-container">
      {!isAuthPage && <Navbar session={session} />}
      <main className={`main-content ${isAuthPage ? 'auth-main-content' : ''}`}>
        {content}
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default Layout;

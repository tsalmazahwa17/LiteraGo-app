import React from 'react';
import './globals.css'; 

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        
        {/* Ikon Sosial */}
        <div className="footer-socials">
          <a href="#"><i className="fab fa-instagram"></i> Instagram</a>
          <a href="#"><i className="fas fa-envelope"></i> Email</a>
          <a href="#"><i className="fas fa-phone"></i> Telepon</a>
        </div>

        {/* Link Navigasi */}
        <nav className="footer-nav">
          <a href="#home">Home</a>
          <a href="#about">Tentang Kami</a>
          <a href="#features">Fitur</a>
          <a href="#flow">Alur</a>
          <a href="#contact">Kontak</a>
        </nav>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>Created by kelompok 40 | LiteraGo &copy; 2026</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
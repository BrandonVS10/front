import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';

// Registrar el Service Worker (asegúrate de que sw.js esté en /public si usas Vite)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { type: 'module' })
      .then((registro) => {
        console.log("✅ Service Worker registrado correctamente:", registro);
      })
      .catch(error => {
        console.error("❌ Error al registrar el Service Worker:", error);
      });
  });
}

// Inicializar IndexedDB
let db = window.indexedDB.open('database');

db.onupgradeneeded = event => {
  let result = event.target.result;
  if (!result.objectStoreNames.contains('libros')) {
    result.createObjectStore('libros', { autoIncrement: true });
  }
};

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

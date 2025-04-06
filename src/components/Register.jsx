import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [nombre, setNombre] = useState('');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      setError('No estás conectado a Internet. Los datos se guardarán localmente.');
      insertIndexedDB({ email, nombre, password });
      return;
    }

    try {
      const response = await fetch('https://elservidor.onrender.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, nombre, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        navigate('/login');
      } else {
        setError(data.message || 'Error al registrarte.');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor. Inténtalo nuevamente.');
    }
  };

  function insertIndexedDB(data) {
    let dbRequest = window.indexedDB.open("database", 2);

    dbRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("Usuarios")) {
        db.createObjectStore("Usuarios", { keyPath: "email" });
        console.log("✅ 'Usuarios' object store creado.");
      }
    };

    dbRequest.onsuccess = (event) => {
      const db = event.target.result;

      if (db.objectStoreNames.contains("Usuarios")) {
        const transaction = db.transaction("Usuarios", "readwrite");
        const objStore = transaction.objectStore("Usuarios");

        const addRequest = objStore.add(data);

        addRequest.onsuccess = () => {
          console.log("✅ Datos insertados en IndexedDB:", addRequest.result);

          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then((registration) => {
              console.log("Intentando registrar la sincronización...");
              registration.sync.register("syncUsuarios");
              self.registration.sync.register("sync");
            }).then(() => {
              console.log("✅ Sincronización registrada con éxito");
            }).catch((err) => {
              console.error("❌ Error registrando la sincronización:", err);
            });
          } else {
            console.warn("⚠️ Background Sync no es soportado en este navegador.");
          }
        };

        addRequest.onerror = () => {
          console.error("❌ Error insertando en IndexedDB");
        };
      }
    };

    dbRequest.onerror = () => {
      console.error("❌ Error abriendo IndexedDB");
    };
  }

  return (
    <div style={styles.container}>
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        padding: '10px 20px',
        borderRadius: '8px',
        backgroundColor: isOnline ? '#4CAF50' : '#f44336',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}>
        {isOnline ? '🟢 En línea' : '🔴 Sin conexión'}
      </div>

      <form style={styles.form} onSubmit={handleRegister}>
        <h2 style={styles.heading}>Registro</h2>
        {error && <div style={styles.error}>{error}</div>}
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={styles.input}
        />
        <input
          type="email"
          placeholder="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Registrar</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#bc1bcb',
  },
  form: {
    backgroundColor: 'black',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
    width: '320px',
    textAlign: 'center',
  },
  heading: {
    fontSize: '2rem',
    color: '#ffffff',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  input: {
    width: '90%',
    padding: '8px',
    marginBottom: '15px',
    border: '1px solid #bbb',
    borderRadius: '6px',
    fontSize: '1.2rem',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#c82284',
    color: 'black',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    color: '#ff4444',
    marginBottom: '10px',
  },
};

export default Register;

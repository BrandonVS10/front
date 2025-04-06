import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

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

    const userData = { email, nombre, password };

    if (!isOnline) {
      setError('No estás conectado a Internet. Los datos se guardarán localmente.');
      insertIndexedDB(userData);
      return;
    }

    try {
      const response = await fetch('https://elservidor.onrender.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
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
    const dbRequest = indexedDB.open("database", 2);

    dbRequest.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("Usuarios")) {
        db.createObjectStore("Usuarios", { keyPath: "id", autoIncrement: true });
        console.log("✅ 'Usuarios' store creado.");
      }
    };

    dbRequest.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction("Usuarios", "readwrite");
      const store = transaction.objectStore("Usuarios");

      const request = store.add(data);
      request.onsuccess = () => {
        console.log("✅ Datos guardados offline:", request.result);

        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(registration => {
            registration.sync.register("syncUsuarios");
          }).then(() => {
            console.log("🔄 Background Sync registrado");
          }).catch(err => {
            console.error("❌ Error registrando sync:", err);
          });
        } else {
          console.warn("⚠️ Este navegador no soporta Background Sync.");
        }
      };

      request.onerror = () => {
        console.error("❌ Error al guardar en IndexedDB");
      };
    };

    dbRequest.onerror = () => {
      console.error("❌ Error al abrir IndexedDB");
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
    backgroundColor: '#f7f7f7',
    fontFamily: 'Arial, sans-serif',
    position: 'relative',
  },
  form: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  heading: {
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '16px',
    color: '#333',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  error: {
    color: 'red',
    fontSize: '14px',
    marginBottom: '15px',
    textAlign: 'center',
  },
};

export default Register;


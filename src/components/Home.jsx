import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Bienvenido a la Zona Futbolera</h1>
      
      <div style={styles.buttonContainer}>
        <Link to="/login" style={styles.button}>Iniciar sesión</Link>
        <Link to="/register" style={styles.button}>Registrarse</Link>
      </div>
    </div>
  );
};

// Estilos en línea
const styles = {
  container: {
    textAlign: 'center',
    padding: '50px',
    backgroundImage: 'url(https://source.unsplash.com/1600x900/?soccer,stadium)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  heading: {
    fontSize: '2.5rem',
    color: '#FFD700', // Dorado para un estilo de trofeo
    marginBottom: '20px',
    textShadow: '2px 2px 4px #000',
  },
  buttonContainer: {
    display: 'flex',
    gap: '20px',
  },
  button: {
    backgroundColor: '#808080', // Gris
    color: '#FFD700', // Amarillo dorado
    padding: '15px 25px',
    textDecoration: 'none',
    borderRadius: '5px',
    fontSize: '1rem',
    transition: 'background-color 0.3s ease',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
  },
};

export default HomePage;
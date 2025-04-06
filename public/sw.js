// Definir los nombres de las cachés
const APP_SHELL_CACHE = 'AppShellv6';
const DYNAMIC_CACHE = 'DinamicoV6';

// Archivos esenciales para la PWA
const APP_SHELL_FILES = [
  '/', '/index.html', '/offline.html', '/index.css', '/App.css', '/App.jsx',
  '/main.jsx', '/components/Home.jsx', '/components/Login.jsx', '/components/Register.jsx',
  '/icons/sao_1.png', '/icons/sao_2.png', '/icons/sao_3.png', '/icons/carga.png',
  '/screenshots/cap.png', '/screenshots/cap1.png'
];

// 🔧 Instalación: caché de los archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(cache => cache.addAll(APP_SHELL_FILES)) // Guardar archivos de la shell en caché
  );
  self.skipWaiting(); // Permite que el nuevo SW se active inmediatamente
});

// 🔄 Activación: limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          // Eliminar cachés antiguas que no sean las actuales
          if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) {
            console.log("🗑️ Eliminando caché antigua:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim()) // Asegura que el SW controle las páginas abiertas
  );
});

// 💾 Guardar datos en IndexedDB cuando la red no esté disponible
function InsertIndexedDB(data) {
  const dbRequest = indexedDB.open("database", 2); // Abre o crea la base de datos con versión 2

  dbRequest.onupgradeneeded = event => {
    const db = event.target.result;
    // Crear un object store llamado 'Usuarios' con autoIncremento para el 'id'
    if (!db.objectStoreNames.contains("Usuarios")) {
      db.createObjectStore("Usuarios", { keyPath: "id", autoIncrement: true });
      console.log("✅ 'Usuarios' store creado.");
    }
  };

  dbRequest.onsuccess = event => {
    const db = event.target.result;
    const transaction = db.transaction("Usuarios", "readwrite");
    const store = transaction.objectStore("Usuarios");

    const request = store.add(data); // Guardar datos en la base de datos
    request.onsuccess = () => {
      console.log("✅ Datos guardados en IndexedDB");

      // Si el navegador soporta Background Sync, registrar la sincronización
      if ('sync' in self.registration) {
        self.registration.sync.register("syncUsuarios").catch(err => {
          console.error("❌ Error registrando sincronización:", err);
        });
      } else {
        console.warn("⚠️ SyncManager no soportado");
      }
    };

    request.onerror = event => {
      console.error("❌ Error al guardar en IndexedDB:", event.target.error);
    };
  };

  dbRequest.onerror = event => {
    console.error("❌ Error al abrir IndexedDB:", event.target.error);
  };
}

// 🌐 Interceptar las solicitudes fetch (para manejar offline)
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith("http")) return; // Ignorar solicitudes que no sean HTTP

  // Si es una solicitud POST (registro o similar)
  if (event.request.method === "POST") {
    event.respondWith(
      event.request.clone().json()
        .then(body =>
          fetch(event.request) // Intentar hacer la solicitud normalmente
            .catch(() => {
              // Si no se puede hacer la solicitud, guardar en IndexedDB
              InsertIndexedDB(body);
              return new Response(JSON.stringify({ message: "Datos guardados offline" }), {
                headers: { "Content-Type": "application/json" }
              });
            })
        )
        .catch(error => console.error("❌ Error procesando cuerpo del POST:", error))
    );
  } else {
    // Para otras solicitudes (GET, etc.), intentar hacer la solicitud
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          // Guardar la respuesta en la caché dinámica
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => {
          // Si falla la solicitud, intentar cargar desde la caché
          return caches.match(event.request).then(res => res || caches.match('/offline.html'));
        })
    );
  }
});

// 🔄 Sincronización en segundo plano para registrar usuarios cuando hay conexión
self.addEventListener('sync', event => {
  if (event.tag === "syncUsuarios") {
    event.waitUntil(
      new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open("database", 2);

        dbRequest.onsuccess = event => {
          const db = event.target.result;

          if (!db.objectStoreNames.contains("Usuarios")) {
            console.warn("⚠️ No hay store de Usuarios.");
            resolve();
            return;
          }

          const transaction = db.transaction("Usuarios", "readonly");
          const store = transaction.objectStore("Usuarios");
          const getAll = store.getAll(); // Obtener todos los usuarios pendientes

          getAll.onsuccess = () => {
            const usuarios = getAll.result;
            if (usuarios.length === 0) {
              console.log("✅ No hay usuarios pendientes.");
              resolve();
              return;
            }

            const postAll = usuarios.map(user =>
              fetch('https://backend-5it1.onrender.com/auth/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-from-service-worker': 'true'
                },
                body: JSON.stringify(user)
              })
            );

            Promise.all(postAll)
              .then(responses => {
                if (responses.every(res => res.ok)) {
                  // Si todos los usuarios se sincronizan correctamente, limpiar IndexedDB
                  const delTransaction = db.transaction("Usuarios", "readwrite");
                  delTransaction.objectStore("Usuarios").clear();
                  console.log("✅ Usuarios sincronizados y limpiados.");
                } else {
                  console.error("❌ Algunos registros no se sincronizaron correctamente.");
                }
                resolve();
              })
              .catch(error => {
                console.error("❌ Error en sincronización:", error);
                reject(error);
              });
          };

          getAll.onerror = () => {
            console.error("❌ Error obteniendo usuarios:", getAll.error);
            reject(getAll.error);
          };
        };

        dbRequest.onerror = event => {
          console.error("❌ Error abriendo IndexedDB:", event.target.error);
          reject(event.target.error);
        };
      })
    );
  }
});

// 🔔 Notificaciones Push: manejar eventos de notificaciones
self.addEventListener("push", event => {
  const options = {
    body: event.data.text(),
    image: "./icons/fut1.png", // Imagen para la notificación
  };
  self.registration.showNotification("Notificación", options);
});

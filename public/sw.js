const APP_SHELL_CACHE = 'AppShellv6';
const DYNAMIC_CACHE = 'DinamicoV6';

const APP_SHELL_FILES = [
  '/', '/index.html', '/offline.html', '/index.css', '/App.css', '/App.jsx',
  '/main.jsx', '/components/Home.jsx', '/components/Login.jsx', '/components/Register.jsx',
  '/icons/sao_1.png', '/icons/sao_2.png', '/icons/sao_3.png', '/icons/carga.png',
  '/screenshots/cap.png', '/screenshots/cap1.png'
];

// 🔧 Instalación y precache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(cache => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

// 🔄 Activación y limpieza de cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) {
            console.log("🗑️ Eliminando caché antigua:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 💾 Guardar datos en IndexedDB
function InsertIndexedDB(data) {
  const dbRequest = indexedDB.open("database", 2);

  dbRequest.onupgradeneeded = event => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("Usuarios")) {
      db.createObjectStore("Usuarios", { keyPath: "id", autoIncrement: true });
    }
  };

  dbRequest.onsuccess = event => {
    const db = event.target.result;
    const transaction = db.transaction("Usuarios", "readwrite");
    const store = transaction.objectStore("Usuarios");

    const request = store.add(data);

    request.onsuccess = () => {
      console.log("✅ Datos guardados en IndexedDB");
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

// 🌐 Interceptar fetch
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith("http")) return;

  if (event.request.method === "POST") {
    event.respondWith(
      event.request.clone().json()
        .then(body =>
          fetch(event.request)
            .catch(() => {
              InsertIndexedDB(body);
              return new Response(JSON.stringify({ message: "Datos guardados offline" }), {
                headers: { "Content-Type": "application/json" }
              });
            })
        )
        .catch(error => console.error("❌ Error procesando cuerpo del POST:", error))
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request).then(res => res || caches.match('/offline.html')))
    );
  }
});

// 🔄 Sincronización en segundo plano
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
          const getAll = store.getAll();

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

// 🔔 Notificaciones Push
self.addEventListener("push", event => {
  const options = {
    body: event.data.text(),
    image: "./icons/fut1.png",
  };
  self.registration.showNotification("Notificación", options);
});

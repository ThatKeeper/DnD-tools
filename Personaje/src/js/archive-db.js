(function (global) {
  const DB_NAME = 'arke-archive';
  const DB_VERSION = 1;
  let connection;
  let writeQueue = Promise.resolve();

  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('posts')) db.createObjectStore('posts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('comments')) db.createObjectStore('comments', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('relationships')) db.createObjectStore('relationships', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('No se pudo abrir la base local de personajes.'));
      request.onblocked = () => reject(new Error('Cierra otras pestañas del archivo de personajes y vuelve a intentarlo.'));
    });
    connection.catch(() => { connection = null; });
    return connection;
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falló una operación de la base local.'));
    });
  }

  function readAll(db, storeName) {
    return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
  }

  async function loadState(legacyState) {
    const db = await open();
    const migration = db.transaction(['characters', 'meta'], 'readwrite');
    const meta = migration.objectStore('meta');
    const imported = await requestResult(meta.get('legacy-v1-imported'));
    if (!imported && Array.isArray(legacyState.chars) && legacyState.chars.length) {
      const chars = migration.objectStore('characters');
      legacyState.chars.forEach(character => chars.put(character));
      meta.put({ key: 'legacy-v1-imported', at: Date.now() });
    } else if (!imported) {
      meta.put({ key: 'legacy-v1-imported', at: Date.now() });
    }
    await new Promise((resolve, reject) => {
      migration.oncomplete = resolve;
      migration.onerror = () => reject(migration.error || new Error('No se pudieron migrar los personajes guardados.'));
      migration.onabort = () => reject(migration.error || new Error('Se canceló la migración de personajes.'));
    });

    const [chars, media, posts, comments, relationships, events, settings] = await Promise.all([
      readAll(db, 'characters'),
      readAll(db, 'media'),
      readAll(db, 'posts'),
      readAll(db, 'comments'),
      readAll(db, 'relationships'),
      readAll(db, 'events'),
      readAll(db, 'settings'),
    ]);
    const savedSettings = Object.fromEntries(settings.map(item => [item.key, item.value]));
    return {
      state: {
        ...legacyState,
        chars: chars.length ? chars : legacyState.chars,
        posts,
        comments,
        relationships,
        events,
        settings: { ...legacyState.settings, ...savedSettings },
      },
      media,
    };
  }

  function saveState(state) {
    const snapshot = JSON.parse(JSON.stringify(state));
    writeQueue = writeQueue.catch(() => {}).then(async () => {
      const db = await open();
      const names = ['characters', 'posts', 'comments', 'relationships', 'events', 'settings'];
      const tx = db.transaction(names, 'readwrite');
      const arrays = {
        characters: snapshot.chars || [],
        posts: snapshot.posts || [],
        comments: snapshot.comments || [],
        relationships: snapshot.relationships || [],
        events: snapshot.events || [],
        settings: Object.entries(snapshot.settings || {}).map(([key, value]) => ({ key, value })),
      };
      names.forEach(name => {
        const store = tx.objectStore(name);
        store.clear();
        arrays[name].forEach(record => store.put(record));
      });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('No se pudieron guardar los cambios en IndexedDB.'));
        tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado en IndexedDB.'));
      });
    });
    return writeQueue;
  }

  function replaceArchive(state, mediaRecords) {
    const snapshot = JSON.parse(JSON.stringify(state));
    writeQueue = writeQueue.catch(() => {}).then(async () => {
      const db = await open();
      const names = ['characters', 'media', 'posts', 'comments', 'relationships', 'events', 'settings'];
      const tx = db.transaction(names, 'readwrite');
      const arrays = {
        characters: snapshot.chars || [],
        media: mediaRecords || [],
        posts: snapshot.posts || [],
        comments: snapshot.comments || [],
        relationships: snapshot.relationships || [],
        events: snapshot.events || [],
        settings: Object.entries(snapshot.settings || {}).map(([key, value]) => ({ key, value })),
      };
      names.forEach(name => {
        const store = tx.objectStore(name);
        store.clear();
        arrays[name].forEach(record => store.put(record));
      });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('No se pudo restaurar la copia del archivo.'));
        tx.onabort = () => reject(tx.error || new Error('Se canceló la restauración del archivo.'));
      });
    });
    return writeQueue;
  }

  async function putMedia(record) {
    const db = await open();
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la imagen.'));
      tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado de la imagen.'));
    });
  }

  async function deleteMedia(id) {
    const db = await open();
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('No se pudo borrar la imagen.'));
      tx.onabort = () => reject(tx.error || new Error('Se canceló el borrado de la imagen.'));
    });
  }

  global.ArkeArchiveDB = { open, loadState, saveState, replaceArchive, putMedia, deleteMedia, requestResult, readAll };
})(window);

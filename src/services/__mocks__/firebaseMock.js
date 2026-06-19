// In-memory Firebase Realtime Database mock for integration tests.
// Mimics the subset of firebase/database used by database.js:
//   ref(db, path), get(ref), set(ref, val), update(ref, partial),
//   onValue(ref, cb), off(ref), serverTimestamp()
//
// Paths are slash-separated ("rooms/123/scores"). Values are stored in a
// nested plain-object tree, matching RTDB semantics closely enough for the
// tournament flow (sequential writes, no sparse-array compaction needed).

export const createFirebaseMock = () => {
  const root = {};

  const splitPath = (path) => path.split('/').filter(Boolean);

  const readPath = (parts) => {
    let node = root;
    for (const key of parts) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[key];
    }
    return node;
  };

  const writePath = (parts, value) => {
    if (parts.length === 0) return;
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (node[key] == null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[parts[parts.length - 1]] = deepClone(value);
  };

  const deepClone = (v) =>
    v === undefined ? undefined : JSON.parse(JSON.stringify(v));

  // listeners keyed by joined path
  const listeners = {};

  const notify = (path) => {
    const parts = splitPath(path);
    // notify any listener whose path is a prefix of, or equal to, the write path
    Object.entries(listeners).forEach(([listenPath, cbs]) => {
      const lp = splitPath(listenPath);
      const isPrefix = lp.every((seg, i) => parts[i] === seg);
      const isEqualOrChild = parts.every((seg, i) => lp[i] === seg);
      if (isPrefix || isEqualOrChild) {
        const snap = makeSnapshot(readPath(lp));
        cbs.forEach((cb) => cb(snap));
      }
    });
  };

  const makeSnapshot = (value) => ({
    exists: () => value !== undefined && value !== null,
    val: () => deepClone(value),
  });

  // --- firebase/database surface ---
  const ref = (_db, path) => ({ __path: path });

  const get = async (r) => makeSnapshot(readPath(splitPath(r.__path)));

  const set = async (r, value) => {
    writePath(splitPath(r.__path), value);
    notify(r.__path);
  };

  const update = async (r, partial) => {
    const base = splitPath(r.__path);
    Object.entries(partial).forEach(([childPath, value]) => {
      writePath([...base, ...splitPath(childPath)], value);
    });
    notify(r.__path);
  };

  const onValue = (r, cb) => {
    const key = r.__path;
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(cb);
    // fire immediately with current value (RTDB behavior)
    cb(makeSnapshot(readPath(splitPath(key))));
    return () => off(r);
  };

  const off = (r) => {
    delete listeners[r.__path];
  };

  const serverTimestamp = () => 1_700_000_000_000;

  return {
    __root: root,
    __dump: () => deepClone(root),
    ref,
    get,
    set,
    update,
    onValue,
    off,
    serverTimestamp,
  };
};

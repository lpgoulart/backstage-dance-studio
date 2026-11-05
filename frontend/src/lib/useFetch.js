import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** Small data hook: { data, error, loading, reload, setData } */
export function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!path);

  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    setLoading(true);
    return api.get(path)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

import { useEffect, useState } from 'react';

export function useLocalStorageBool(key: string, defaultValue = false): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(localStorage.getItem(key) === 'true');
  }, [key]);

  function set(next: boolean) {
    setValue(next);
    localStorage.setItem(key, String(next));
  }

  return [value, set];
}

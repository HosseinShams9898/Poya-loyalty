import { useState, useEffect } from 'react';

// سیستم Toast ساده بدون وابستگی خارجی
let toastId = 0;
const listeners = new Set();

function emit(updater) {
  listeners.forEach((fn) => {
    try {
      fn(updater);
    } catch {}
  });
}

export function showToast(message, type = 'success') {
  const id = ++toastId;
  emit((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    emit((prev) => prev.filter((t) => t.id !== id));
  }, 3500);
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    listeners.add(setToasts);
    return () => listeners.delete(setToasts);
  }, []);
  return toasts;
}

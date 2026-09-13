import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../api/api';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.count || 0);
    } catch {} finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 60000);
    return () => clearInterval(iv);
  }, [fetchCount]);

  return { unreadCount, loading, refresh: fetchCount };
}
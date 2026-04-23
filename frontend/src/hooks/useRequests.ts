import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, BookingRequest } from '../api';

interface RequestFilters {
  user_phone?: string;
  driver_phone?: string;
}

interface UseRequestsResult {
  requests: BookingRequest[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  onRefresh: () => void;
}

export function useRequests(filters: RequestFilters = {}): UseRequestsResult {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listRequests(filters);
      setRequests(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetch();
    }, [fetch]),
  );

  const reload = useCallback(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  return { requests, loading, refreshing, error, reload, onRefresh };
}

interface UseRequestResult {
  request: BookingRequest | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRequest(id: string): UseRequestResult {
  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getRequest(id);
      setRequest(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetch();
    }, [fetch]),
  );

  return { request, loading, error, reload: fetch };
}

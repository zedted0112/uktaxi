import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, Ride } from '../api';

interface RideFilters {
  from_city?: string;
  to_city?: string;
  date?: string;
  driver_phone?: string;
}

interface UseRidesResult {
  rides: Ride[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  onRefresh: () => void;
}

export function useRides(filters: RideFilters = {}): UseRidesResult {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listRides(filters);
      setRides(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // filters is an object — serialise to string for stable dep comparison
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

  return { rides, loading, refreshing, error, reload, onRefresh };
}

interface UseRideResult {
  ride: Ride | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRide(id: string): UseRideResult {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getRide(id);
      setRide(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ride');
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

  return { ride, loading, error, reload: fetch };
}

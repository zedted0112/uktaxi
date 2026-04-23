import { useState, useEffect } from 'react';
import { api, Vehicle } from '../api';

interface UseVehiclesResult {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listVehicles()
      .then(setVehicles)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  return { vehicles, loading, error };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Facility } from '@/types';

export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setFacilities(data as Facility[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { facilities, loading, reload: load };
}

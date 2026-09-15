import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  started_at: number;
  expires_at: number | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.subscriptions.me()
      .then(res => setSubscription(res.subscription))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, []);

  const isPremium = subscription?.status === 'active';

  return { subscription, isPremium, loading };
}

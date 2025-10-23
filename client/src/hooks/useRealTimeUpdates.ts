import { useEffect, useRef, useCallback, useState } from 'react';

interface UseRealTimeUpdatesOptions {
  enabled: boolean;
  interval: number;
  onUpdate: () => Promise<void>;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseRealTimeUpdatesReturn {
  isConnected: boolean;
  lastUpdateTime: Date;
  error: Error | null;
  manualRefresh: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'retrying';
}

export const useRealTimeUpdates = ({
  enabled,
  interval,
  onUpdate,
  onError,
  retryAttempts = 3,
  retryDelay = 5000
}: UseRealTimeUpdatesOptions): UseRealTimeUpdatesReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'retrying'>('disconnected');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  const performUpdate = useCallback(async () => {
    try {
      setConnectionStatus('connected');
      setError(null);
      retryCountRef.current = 0;
      
      await onUpdate();
      setLastUpdateTime(new Date());
      setIsConnected(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsConnected(false);
      setConnectionStatus('error');
      
      if (onError) {
        onError(error);
      }
      
      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        setConnectionStatus('retrying');
        
        setTimeout(() => {
          if (enabled) {
            performUpdate();
          }
        }, retryDelay);
      }
    }
  }, [onUpdate, onError, retryAttempts, retryDelay, enabled]);

  const manualRefresh = useCallback(async () => {
    retryCountRef.current = 0;
    await performUpdate();
  }, [performUpdate]);

  // Start/stop interval based on enabled state
  useEffect(() => {
    if (enabled && !isInitializedRef.current) {
      // Initial update
      performUpdate();
      isInitializedRef.current = true;
    }

    if (enabled) {
      intervalRef.current = setInterval(() => {
        performUpdate();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, performUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    lastUpdateTime,
    error,
    manualRefresh,
    connectionStatus
  };
}; 
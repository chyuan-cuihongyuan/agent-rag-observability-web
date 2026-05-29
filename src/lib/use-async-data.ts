"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 通用异步数据加载 Hook
 *
 * @param loader   - 异步数据加载函数
 * @param deps     - 依赖数组，变化时自动重新加载
 * @param initialData - 初始数据
 *
 * @example
 * ```tsx
 * const { data, loading, error, reload } = useAsyncData(
 *   () => dashboardApi.overview(1),
 *   [days],
 *   null
 * );
 * ```
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  initialData?: T
): {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 用于取消过期的异步请求
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await loader();
      // 仅在请求未被后续调用覆盖时更新状态
      if (currentRequestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { data, loading, error, reload: load };
}

import { useEffect, useMemo, type DependencyList } from 'react';

/**
 * `useMemo` for GPU resources (geometries, materials, meshes) created
 * imperatively: the value is disposed when deps change or on unmount, so
 * switching quality levels never leaks GPU memory.
 */
export function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: DependencyList): T {
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

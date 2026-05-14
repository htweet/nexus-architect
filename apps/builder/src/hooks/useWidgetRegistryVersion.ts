/**
 * useWidgetRegistryVersion.ts
 *
 * Reactive hook that returns an incrementing version number whenever a new
 * widget is registered or unregistered via the addon loader.
 * Components that render the widget palette subscribe to this hook so they
 * re-render automatically when addons install/uninstall without needing
 * Zustand or React context.
 */

import { useState, useEffect } from 'react';
import { subscribeRegistry, getRegistryVersion } from '@/lib/addon-loader';

export function useWidgetRegistryVersion(): number {
  const [version, setVersion] = useState<number>(getRegistryVersion);

  useEffect(() => {
    // Subscribe to registry change events emitted by the addon loader
    const unsub = subscribeRegistry(() => setVersion(getRegistryVersion()));
    return unsub;
  }, []);

  return version;
}

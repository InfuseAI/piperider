import { useEffect } from 'react';

import { TrackEvent, useTrackerStore } from '../utils/trackEvents';

export function useTrackOnMount(event: TrackEvent) {
  const tracker = useTrackerStore((state) => state.tracker);
  useEffect(() => {
    if (tracker) {
      tracker.track({ ...event });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

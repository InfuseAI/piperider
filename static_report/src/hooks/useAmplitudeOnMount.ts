import { useEffect } from 'react';

import { AmplitudeTrackEvent, amplitudeTrack } from '../utils/amplitudeEvents';

export function useAmplitudeOnMount(event: AmplitudeTrackEvent) {
  useEffect(() => {
    amplitudeTrack({ ...event });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

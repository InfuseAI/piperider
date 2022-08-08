import { useEffect } from 'react';

import { AmplitudeTrack, amplitudeTrack } from '../utils/amplitudeEvents';

export function useAmplitudeOnMount(event: AmplitudeTrack) {
  useEffect(() => {
    amplitudeTrack({ ...event });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

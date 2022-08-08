import { track } from '@amplitude/analytics-browser';
import type { EventOptions } from '@amplitude/analytics-types';

export const AmplitudeEvents = {
  PAGE_VIEW: 'Page View',
};

export type AmplitudeTrack = {
  eventName: string;
  eventProperties?: Record<string, unknown>;
  eventOptions?: EventOptions;
};

export function amplitudeTrack({
  eventName,
  eventProperties,
  eventOptions,
}: AmplitudeTrack) {
  const API_KEY = window.PIPERIDER_METADATA.amplitude_api_key;

  if (!API_KEY) {
    return console.info({ eventName, eventProperties, eventOptions });
  }

  return track(eventName, eventProperties, eventOptions);
}

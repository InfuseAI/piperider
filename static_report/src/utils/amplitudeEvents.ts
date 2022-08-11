import { track } from '@amplitude/analytics-browser';
import type { EventOptions } from '@amplitude/analytics-types';

export const AMPLITUDE_EVENTS = {
  PAGE_VIEW: 'Page View',
};

export type AmplitudeTrackEvent = {
  eventName: string;
  eventProperties?: Record<string, unknown>;
  eventOptions?: EventOptions;
};

export function amplitudeTrack({
  eventName,
  eventProperties,
  eventOptions,
}: AmplitudeTrackEvent) {
  const API_KEY = window.PIPERIDER_METADATA.amplitude_api_key;
  const PROJECT_ID = window.PIPERIDER_METADATA.amplitude_project_id;

  if (!API_KEY) {
    return console.info(
      eventName,
      { project_id: PROJECT_ID, ...eventProperties },
      eventOptions,
    );
  }

  return track(
    eventName,
    {
      project_id: PROJECT_ID,
      ...eventProperties,
    },
    eventOptions,
  );
}

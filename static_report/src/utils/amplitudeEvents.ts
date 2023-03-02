import { track } from '@amplitude/analytics-browser';
import type { EventOptions } from '@amplitude/analytics-types';

export const SR_TYPE_LABEL = 'single-report';
export const CR_TYPE_LABEL = 'comparison-report';
export const WARNING_TYPE_LABEL = 'mobile-device-warning';
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
  eventProperties = {},
  eventOptions = {},
}: AmplitudeTrackEvent) {
  const PROJECT_ID = window.PIPERIDER_METADATA.amplitude_project_id;

  const API_KEY = window.PIPERIDER_METADATA.amplitude_api_key;
  if (
    !API_KEY ||
    process.env.NODE_ENV === 'development' ||
    process.env.REACT_APP_E2E === 'true'
  ) {
    return console.warn(
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

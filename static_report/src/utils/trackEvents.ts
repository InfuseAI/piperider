import { track } from '@amplitude/analytics-browser';
import type { EventOptions } from '@amplitude/analytics-types';
import create from 'zustand';

export const SR_TYPE_LABEL = 'single-report';
export const CR_TYPE_LABEL = 'comparison-report';
export const WARNING_TYPE_LABEL = 'mobile-device-warning';
export const EVENTS = {
  PAGE_VIEW: 'Page View',
};

export type TrackEvent = {
  eventName: string;
  eventProperties?: Record<string, unknown>;
  eventOptions?: EventOptions;
};

export interface Tracker {
  track: (TrackEvent) => void;
}

interface TrackerState {
  tracker?: Tracker;
  setTracker: (tracker: Tracker) => void;
}

export const useTrackerStore = create<TrackerState>((set) => ({
  tracker: undefined,
  setTracker: (tracker) => set({ tracker: tracker }),
}));

export function amplitudeTrack({
  eventName,
  eventProperties = {},
  eventOptions = {},
}: TrackEvent) {
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

  track(
    eventName,
    {
      project_id: PROJECT_ID,
      ...eventProperties,
    },
    eventOptions,
  );
}

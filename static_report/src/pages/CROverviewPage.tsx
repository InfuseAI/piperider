import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils/trackEvents';
import { Overview } from '../components/Overview/Overview';

export function CROverviewPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'overview_page',
    },
  });

  return <Overview />;
}

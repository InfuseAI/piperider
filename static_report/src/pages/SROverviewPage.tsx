import { useTrackOnMount } from '../hooks';
import { EVENTS, SR_TYPE_LABEL } from '../utils/trackEvents';
import { Overview } from '../components/Overview/Overview';
import { useReportStore } from '../utils/store';
import { SRTablesListPage } from './SRTablesListPage';

export function SROverviewPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'overview_page',
    },
  });

  const { isLegacy } = useReportStore.getState();

  return isLegacy ? <SRTablesListPage /> : <Overview singleOnly />;
}

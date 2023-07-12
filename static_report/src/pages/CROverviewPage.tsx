import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils/trackEvents';
import { Overview } from '../components/Overview/Overview';
import { CRTablesListPage } from './CRTableListPage';
import { useReportStore } from '../utils/store';

export function CROverviewPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'overview_page',
    },
  });

  const { isLegacy } = useReportStore.getState();

  return isLegacy ? <CRTablesListPage /> : <Overview />;
}

import { Switch, Route, Router, BaseLocationHook } from 'wouter';
import { Loading } from '../components';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';

import { NotFound } from '../components/Common/NotFound';
import { useHashLocation } from '../hooks/useHashLcocation';
import { SaferSRSchema } from '../types';
import { useReportStore } from '../utils';
import {
  ASSERTIONS_ROUTE_PATH,
  METRICS_ROUTE_PATH,
  COLUMN_DETAILS_ROUTE_PATH,
  HOME_ROUTE_PATH,
  MODEL_COLUMN_DETAILS_ROUTE_PATH,
  MODEL_DETAILS_ROUTE_PATH,
  SEED_COLUMN_DETAILS_ROUTE_PATH,
  SEED_DETAILS_ROUTE_PATH,
  SOURCE_COLUMN_DETAILS_ROUTE_PATH,
  SOURCE_DETAILS_ROUTE_PATH,
  SSR_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
  TABLE_LIST_ROUTE_PATH,
  METRIC_DETAILS_ROUTE_PATH,
  SEMANTIC_MODEL_DETAILS_ROUTE_PATH,
} from '../utils/routes';
import { SRAssertionListPage } from './SRAssertionListPage';
import { SRBMPage } from './SRBMPage';
import SRColumnDetailPage from './SRColumnDetailPage';
import { SROverviewPage } from './SROverviewPage';
import { SRSemanticModelPage } from './SRSemanticModelPage';
import SRTableDetailPage from './SRTableDetailPage';
import { SRTablesListPage } from './SRTablesListPage';

interface Props {
  data: SaferSRSchema;
  cloud?: boolean;
  sideNavTop?: string;
}

export function SRPage({ data, cloud, sideNavTop = '0px' }: Props) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });

  return (
    <Router hook={useHashLocation as BaseLocationHook}>
      <Switch>
        <MasterDetailContainer sideNavTop={sideNavTop} cloud={cloud} singleOnly>
          <Switch>
            <Route path={HOME_ROUTE_PATH}>
              <SROverviewPage />
            </Route>

            <Route path={HOME_ROUTE_PATH}>
              <SRTablesListPage />
            </Route>

            <Route path={TABLE_LIST_ROUTE_PATH}>
              <SRTablesListPage />
            </Route>

            <Route path={TABLE_DETAILS_ROUTE_PATH}>
              <SRTableDetailPage />
            </Route>
            <Route path={COLUMN_DETAILS_ROUTE_PATH}>
              <SRColumnDetailPage />
            </Route>

            <Route path={SOURCE_DETAILS_ROUTE_PATH}>
              <SRTableDetailPage />
            </Route>
            <Route path={SOURCE_COLUMN_DETAILS_ROUTE_PATH}>
              <SRColumnDetailPage />
            </Route>

            <Route path={SEED_DETAILS_ROUTE_PATH}>
              <SRTableDetailPage />
            </Route>
            <Route path={SEED_COLUMN_DETAILS_ROUTE_PATH}>
              <SRColumnDetailPage />
            </Route>

            <Route path={MODEL_DETAILS_ROUTE_PATH}>
              <SRTableDetailPage />
            </Route>
            <Route path={MODEL_COLUMN_DETAILS_ROUTE_PATH}>
              <SRColumnDetailPage />
            </Route>

            <Route path={ASSERTIONS_ROUTE_PATH}>
              <SRAssertionListPage />
            </Route>

            <Route path={METRICS_ROUTE_PATH}>
              <SRBMPage />
            </Route>

            <Route path={METRIC_DETAILS_ROUTE_PATH}>
              <SRBMPage />
            </Route>

            <Route path={SEMANTIC_MODEL_DETAILS_ROUTE_PATH}>
              <SRSemanticModelPage />
            </Route>

            <Route path={SSR_ROUTE_PATH}>
              <Loading />
            </Route>

            <Route>
              <NotFound />
            </Route>
          </Switch>
        </MasterDetailContainer>
      </Switch>
    </Router>
  );
}

export default SRPage;

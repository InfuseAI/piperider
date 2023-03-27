import { Switch, Route, Router, BaseLocationHook } from 'wouter';
import { Loading } from '../components';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';

import { NotFound } from '../components/Common/NotFound';
import { useHashLocation } from '../hooks/useHashLcocation';
import { SaferSRSchema } from '../types';
import { useReportStore } from '../utils';
import {
  ASSERTIONS_ROUTE_PATH,
  BM_ROUTE_PATH,
  COLUMN_DETAILS_ROUTE_PATH,
  HOME_ROUTE_PATH,
  SSR_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
  TABLE_LIST_ROUTE_PATH,
} from '../utils/routes';
import { SRAssertionListPage } from './SRAssertionListPage';
import { SRBMPage } from './SRBMPage';
import SRColumnDetailPage from './SRColumnDetailPage';
import { SRHomePage } from './SRHomePage';
import SRTableDetailPage from './SRTableDetailPage';
import { SRTablesListPage } from './SRTablesListPage';

interface Props {
  data: SaferSRSchema;
  sideNavTop?: string;
}

export function SRPage({ data, sideNavTop = '0px' }: Props) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });

  return (
    <Router hook={useHashLocation as BaseLocationHook}>
      <MasterDetailContainer sideNavTop={sideNavTop}>
        <Switch>
          <Route path={HOME_ROUTE_PATH}>
            <SRHomePage />
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

          <Route path={ASSERTIONS_ROUTE_PATH}>
            <SRAssertionListPage />
          </Route>

          <Route path={BM_ROUTE_PATH}>
            <SRBMPage />
          </Route>

          <Route path={SSR_ROUTE_PATH}>
            <Loading />
          </Route>

          <Route>
            <NotFound />
          </Route>
        </Switch>
      </MasterDetailContainer>
    </Router>
  );
}

export default SRPage;

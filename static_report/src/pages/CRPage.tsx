import { Switch, Route, Router, BaseLocationHook } from 'wouter';
import { Loading } from '../components';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';

import { NotFound } from '../components/Common/NotFound';
import { useHashLocation } from '../hooks/useHashLcocation';
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
import { CRAssertionListPage } from './CRAssertionListPage';
import { CRBMPage } from './CRBMPage';
import CRColumnDetailPage from './CRColumnDetailPage';
import { CRHomePage } from './CRHomePage';
import CRTableDetailPage from './CRTableDetailPage';
import { CRTablesListPage } from './CRTableListPage';

export function CRPage({ data }) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData(data);

  return (
    <Router hook={useHashLocation as BaseLocationHook}>
      <MasterDetailContainer>
        <Switch>
          <Route path={HOME_ROUTE_PATH}>
            <CRHomePage />
          </Route>

          <Route path={TABLE_LIST_ROUTE_PATH}>
            <CRTablesListPage />
          </Route>

          <Route path={TABLE_LIST_ROUTE_PATH}>
            <CRTablesListPage />
          </Route>

          <Route path={TABLE_DETAILS_ROUTE_PATH}>
            <CRTableDetailPage />
          </Route>

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            <CRColumnDetailPage />
          </Route>

          <Route path={ASSERTIONS_ROUTE_PATH}>
            <CRAssertionListPage />
          </Route>

          <Route path={BM_ROUTE_PATH}>
            <CRBMPage />
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

export default CRPage;

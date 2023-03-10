import { useEffect } from 'react';
import { Switch, Route, Router, BaseLocationHook, useLocation } from 'wouter';
import { Main } from '../components/Common/Main';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';

import { NotFound } from '../components/Common/NotFound';
import { useHashLocation } from '../hooks/useHashLcocation';
import { useReportStore } from '../utils';
import {
  ASSERTIONS_ROUTE_PATH,
  BM_ROUTE_PATH,
  COLUMN_DETAILS_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
  TABLE_LIST_ROUTE_PATH,
} from '../utils/routes';
import { SRAssertionListPage } from './SRAssertionListPage';
import { SRBMPage } from './SRBMPage';
import SRColumnDetailPage from './SRColumnDetailPage';
import SRTableDetailPage from './SRTableDetailPage';
import { SRTablesListPage } from './SRTablesListPage';

function SRPage({ data }) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const { tableColumnsOnly = [] } = useReportStore.getState();

  return (
    <Router hook={useHashLocation as BaseLocationHook}>
      <MasterDetailContainer
        initAsExpandedTables
        rawData={data}
        tableColEntries={tableColumnsOnly}
      >
        <Switch>
          <Route path={TABLE_LIST_ROUTE_PATH}>
            <SRTablesListPage data={data} />
          </Route>

          <Route path={TABLE_DETAILS_ROUTE_PATH}>
            <SRTableDetailPage data={data} />
          </Route>

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            <SRColumnDetailPage data={data} />
          </Route>

          <Route path={ASSERTIONS_ROUTE_PATH}>
            <SRAssertionListPage data={data} />
          </Route>

          <Route path={BM_ROUTE_PATH}>
            <SRBMPage data={data} />
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

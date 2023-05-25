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
} from '../utils/routes';
import { SRAssertionListPage } from './SRAssertionListPage';
import { SRBMPage } from './SRBMPage';
import SRColumnDetailPage from './SRColumnDetailPage';
import SRTableDetailPage from './SRTableDetailPage';
import { SRTablesListPage } from './SRTablesListPage';
import { LineageGraph } from '../components/LineageGraph/LineageGraph';
import { VisJsGraph } from '../components/LineageGraph/VisJsGraph';
import { BeautifulReactDiagramsGraph } from '../components/LineageGraph/BeatuifulReactDiagramGraph';
import { ReactFlowGraph } from '../components/LineageGraph/ReactFlowGraph';

interface Props {
  data: SaferSRSchema;
  sideNavTop?: string;
}

export function SRPage({ data, sideNavTop = '0px' }: Props) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });

  return (
    <Router hook={useHashLocation as BaseLocationHook}>
      <MasterDetailContainer sideNavTop={sideNavTop} singleOnly>
        <Switch>
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

          <Route path={'/graph/cytoscape'}>
            <LineageGraph />
          </Route>

          <Route path={'/graph/reactflow'}>
            <ReactFlowGraph singleOnly />
          </Route>

          <Route path={'/graph/vis'}>
            <VisJsGraph />
          </Route>

          <Route path={'/graph/react-diagrams'}>
            <BeautifulReactDiagramsGraph />
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

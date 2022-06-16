import { Suspense, lazy } from 'react';
import { Switch, Route, Router } from 'wouter';

import { Main } from './components/Main';
import { Loading } from './components/Loading';
import { ReportList } from './components/ReportList';
import { NotFound } from './components/NotFound';
import { useHashLocation } from './hooks/useHashLcocation';

const SingleReport = lazy(() => import('./components/SingleReport'));

function App() {
  const { tables, datasource, id, created_at } = window.PIPERIDER_REPORT_DATA;

  return (
    <Suspense fallback={<Loading />}>
      <Main alignItems="flex-start">
        <Router hook={useHashLocation}>
          <Switch>
            <Route
              path="/"
              component={() => (
                <ReportList data={{ id, created_at, datasource, tables }} />
              )}
            />

            <Route path="/single-run/:reportName">
              {(params) => (
                <SingleReport
                  source={datasource}
                  reportName={params.reportName}
                  data={tables[params.reportName]}
                />
              )}
            </Route>

            {/* TODO: comparison route */}

            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Router>
      </Main>
    </Suspense>
  );
}

export default App;

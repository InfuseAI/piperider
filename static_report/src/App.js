import { Suspense, lazy } from 'react';
import { Switch, Route, Router } from 'wouter';

import { Main } from './components/Main';
import { Loading } from './components/Loading';
import { ReportList } from './components/ReportList';
import { NotFound } from './components/NotFound';
import { useHashLocation } from './hooks/useHashLcocation';
import { ComparisonReport } from './components/ComparisonReport';
import { ComparisonReportList } from './components/ComparisonList';

const SingleReport = lazy(() => import('./components/SingleReport'));

function AppSingle() {
  const { tables, datasource, id, created_at } = window.PIPERIDER_SINGLE_REPORT_DATA;
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

            <Route path="/tables/:reportName">
              {(params) => (
                <SingleReport
                  source={datasource}
                  reportName={params.reportName}
                  data={tables[params.reportName]}
                />
              )}
            </Route>

            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Router>
      </Main>
    </Suspense>
  );
}

function AppComparison() {
  const data = window.PIPERIDER_COMPARISON_REPORT_DATA;
  const { base, input } = data;
  return (
    <Suspense fallback={<Loading />}>
      <Main alignItems="flex-start">
        <Router hook={useHashLocation}>
          <Switch>
            <Route
              path="/"
              component={() => <ComparisonReportList data={data} />}
            />

            <Route path="/tables/:reportName">
              {(params) => (
                <ComparisonReport
                  reportName={params.reportName}
                  base={base.tables[params.reportName]}
                  input={input.tables[params.reportName]}
                />
              )}
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Router>
      </Main>
    </Suspense>
  );
}

function App() {
  if (process.env.REACT_APP_SINGLE_REPORT === 'true') {
    return <AppSingle />;
  } else {
    return <AppComparison />;
  }
}

export default App;

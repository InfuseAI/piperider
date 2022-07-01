import { Suspense, lazy } from 'react';
import { Switch, Route, Router, BaseLocationHook } from 'wouter';

import { Main } from './components/shared/Main';
import { Loading } from './components/shared/Loading';
import { NotFound } from './components/shared/NotFound';
import { useHashLocation } from './hooks/useHashLcocation';
import { SingleReportList } from './components/SingleReport/SRList';
import { ComparisonReportList } from './components/ComparisonReport/CRList';

const SingleReport = lazy(
  () => import('./components/SingleReport/SingleReport'),
);
const ComparisonReport = lazy(
  () => import('./components/ComparisonReport/ComparisonReport'),
);

function AppSingle() {
  const { tables, datasource } = window.PIPERIDER_SINGLE_REPORT_DATA;

  return (
    <Suspense fallback={<Loading />}>
      <Main alignItems="flex-start">
        <Router hook={useHashLocation as BaseLocationHook}>
          <Switch>
            <Route
              path="/"
              component={() => (
                <SingleReportList data={window.PIPERIDER_SINGLE_REPORT_DATA} />
              )}
            />

            <Route path="/tables/:reportName">
              {(params: any) => {
                const decodedReportName = decodeURI(params.reportName);

                return (
                  <SingleReport
                    source={datasource}
                    reportName={decodedReportName}
                    data={tables[decodedReportName]}
                  />
                );
              }}
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
        <Router hook={useHashLocation as BaseLocationHook}>
          <Switch>
            <Route
              path="/"
              component={() => <ComparisonReportList data={data} />}
            />

            <Route path="/tables/:reportName">
              {(params: any) => {
                const decodedReportName = decodeURI(params.reportName);
                return (
                  <ComparisonReport
                    reportName={decodedReportName}
                    base={base.tables[decodedReportName]}
                    input={input.tables[decodedReportName]}
                  />
                );
              }}
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

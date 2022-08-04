import { Suspense, lazy } from 'react';
import { Switch, Route, Router, BaseLocationHook, type Params } from 'wouter';

import { Loading } from './components/shared/Loading';
import { NotFound } from './components/shared/NotFound';
import { useHashLocation } from './hooks/useHashLcocation';
import { SingleReportList } from './components/SingleReport/SRList';
import { ComparisonReportList } from './components/ComparisonReport/CRList';

import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

const sentryDns = window.PIPERIDER_METADATA.sentry_dns;
if (sentryDns) {
  const sentryEnv = window.PIPERIDER_METADATA.sentry_env || 'development';
  const appVersion = window.PIPERIDER_METADATA.version;
  const releaseVersion = sentryEnv === 'development' ? undefined : appVersion;
  Sentry.init({
    dsn: sentryDns,
    environment: sentryEnv,
    release: releaseVersion,
    integrations: [new BrowserTracing()],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
  Sentry.setTag('piperider.version', appVersion);
}

const SingleReport = lazy(
  () => import('./components/SingleReport/SingleReport'),
);
const ComparisonReport = lazy(
  () => import('./components/ComparisonReport/ComparisonReport'),
);

function AppSingle() {
  return (
    <Suspense fallback={<Loading />}>
      <Router hook={useHashLocation as BaseLocationHook}>
        <Switch>
          <Route
            path="/"
            component={() => (
              <SingleReportList data={window.PIPERIDER_SINGLE_REPORT_DATA} />
            )}
          />

          <Route path="/tables/:reportName">
            {(params: Params<{ reportName: string }>) => (
              <SingleReport
                name={decodeURIComponent(params.reportName)}
                data={window.PIPERIDER_SINGLE_REPORT_DATA}
              />
            )}
          </Route>

          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Router>
    </Suspense>
  );
}

function AppComparison() {
  return (
    <Suspense fallback={<Loading />}>
      <Router hook={useHashLocation as BaseLocationHook}>
        <Switch>
          <Route
            path="/"
            component={() => (
              <ComparisonReportList
                data={window.PIPERIDER_COMPARISON_REPORT_DATA}
              />
            )}
          />

          <Route path="/tables/:reportName">
            {(params: Params<{ reportName: string }>) => (
              <ComparisonReport
                name={decodeURIComponent(params.reportName)}
                data={window.PIPERIDER_COMPARISON_REPORT_DATA}
              />
            )}
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Router>
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

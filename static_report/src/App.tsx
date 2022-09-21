import * as Sentry from '@sentry/browser';
import { Suspense, lazy } from 'react';
import { Switch, Route, Router, BaseLocationHook } from 'wouter';
import { BrowserTracing } from '@sentry/tracing';

import { Loading } from './components/shared/Layouts/Loading';
import { NotFound } from './components/shared/Layouts/NotFound';
import { SRTablesListPage } from './pages/SRTablesListPage';
import { CRTablesListPage } from './pages/CRTablesListPage';
import { useHashLocation } from './hooks/useHashLcocation';
import { COLUMN_DETAILS_ROUTE_PATH } from './utils/routes';

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

const SRColumnDetailsPage = lazy(() => import('./pages/SRColumnDetailsPage'));
const CRColumnDetailsPage = lazy(() => import('./pages/CRColumnDetailsPage'));

function AppSingle() {
  return (
    <Suspense fallback={<Loading />}>
      <Router hook={useHashLocation as BaseLocationHook}>
        <Switch>
          <Route
            path="/"
            component={() => (
              <SRTablesListPage data={window.PIPERIDER_SINGLE_REPORT_DATA} />
            )}
          />

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            {({ tableName, columnName }) => (
              <SRColumnDetailsPage
                tableName={decodeURIComponent(tableName)}
                columnName={decodeURIComponent(String(columnName))}
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
              <CRTablesListPage
                data={window.PIPERIDER_COMPARISON_REPORT_DATA}
              />
            )}
          />

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            {({ tableName, columnName }) => (
              <CRColumnDetailsPage
                tableName={decodeURIComponent(tableName)}
                columnName={decodeURIComponent(String(columnName))}
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

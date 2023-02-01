import * as Sentry from '@sentry/browser';
import { Suspense, lazy } from 'react';
import { Switch, Route, Router, BaseLocationHook, Redirect } from 'wouter';
import { BrowserTracing } from '@sentry/tracing';

import { Loading } from './components/Layouts/Loading';
import { NotFound } from './components/Common/NotFound';
import { useHashLocation } from './hooks/useHashLcocation';
import {
  ASSERTIONS_ROUTE_PATH,
  BM_ROUTE_PATH,
  COLUMN_DETAILS_ROUTE_PATH,
} from './utils/routes';
import { SRAssertionListPage } from './pages/SRAssertionListPage';
import { SRBMPage } from './pages/SRBMPage';
import { CRBMPage } from './pages/CRBMPage';
import { CRAssertionListPage } from './pages/CRAssertionListPage';

const sentryDns = window.PIPERIDER_METADATA.sentry_dns;
if (sentryDns && process.env.NODE_ENV !== 'development') {
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

const SRProfileRunPage = lazy(() => import('./pages/SRProfileRunPage'));
const CRProfileRunPage = lazy(() => import('./pages/CRProfileRunPage'));

function AppSingle() {
  return (
    <Suspense fallback={<Loading />}>
      <Router hook={useHashLocation as BaseLocationHook}>
        <Switch>
          <Route
            path="/"
            component={() => {
              const { tables = {} } = window.PIPERIDER_SINGLE_REPORT_DATA ?? {};
              const tableEntries = Object.entries<any>(tables);
              const firstTableEntry = tableEntries[0];
              const firstTableName = firstTableEntry[0];
              const firstTableColEntries = Object.entries<any>(
                firstTableEntry[1].columns,
              );
              const firstTableColName = firstTableColEntries[0][0];

              return (
                <Redirect
                  to={`/tables/${firstTableName}/columns/${firstTableColName}`}
                />
              );
            }}
          />

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            {({ tableName, columnName }) => (
              <SRProfileRunPage
                tableName={decodeURIComponent(tableName || '')}
                columnName={decodeURIComponent(columnName || '')}
                data={window.PIPERIDER_SINGLE_REPORT_DATA || {}}
              />
            )}
          </Route>

          <Route path={ASSERTIONS_ROUTE_PATH}>
            {() => (
              <SRAssertionListPage
                data={window.PIPERIDER_SINGLE_REPORT_DATA || {}}
              />
            )}
          </Route>

          <Route path={BM_ROUTE_PATH}>
            {() => (
              <SRBMPage data={window.PIPERIDER_SINGLE_REPORT_DATA || {}} />
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
            component={() => {
              const { base, input } =
                window.PIPERIDER_COMPARISON_REPORT_DATA ?? {};
              const fallbackTables = input || base;

              const tableEntries = Object.entries<any>(fallbackTables.tables);
              const firstTableEntry = tableEntries[0];
              const firstTableName = firstTableEntry[0];
              const firstTableColEntries = Object.entries<any>(
                firstTableEntry[1].columns,
              );
              const firstTableColName = firstTableColEntries[0][0];

              return (
                <Redirect
                  to={`/tables/${firstTableName}/columns/${firstTableColName}`}
                />
              );
            }}
          />

          <Route path={COLUMN_DETAILS_ROUTE_PATH}>
            {({ tableName, columnName }) => (
              <CRProfileRunPage
                tableName={decodeURIComponent(tableName || '')}
                columnName={decodeURIComponent(columnName || '')}
                data={window.PIPERIDER_COMPARISON_REPORT_DATA || {}}
              />
            )}
          </Route>

          <Route path={ASSERTIONS_ROUTE_PATH}>
            {() => (
              <CRAssertionListPage
                data={window.PIPERIDER_COMPARISON_REPORT_DATA || {}}
              />
            )}
          </Route>

          <Route path={BM_ROUTE_PATH}>
            {() => (
              <CRBMPage data={window.PIPERIDER_COMPARISON_REPORT_DATA || {}} />
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

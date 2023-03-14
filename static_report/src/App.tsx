import * as Sentry from '@sentry/browser';
import { Suspense, lazy } from 'react';
import { BrowserTracing } from '@sentry/tracing';

import { Loading } from './components/Common';
import { useAmplitudeOnMount } from './hooks';
import { AMPLITUDE_EVENTS, WARNING_TYPE_LABEL } from './utils';
import { Main } from './components/Common/Main';

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

const SRPage = lazy(() => import('./pages/SRPage'));
const CRPage = lazy(() => import('./pages/CRPage'));

function AppSingle() {
  const data = window.PIPERIDER_SINGLE_REPORT_DATA || {};
  return (
    <Suspense fallback={<Loading />}>
      <SRPage data={data} />
    </Suspense>
  );
}

function AppComparison() {
  const data = window.PIPERIDER_COMPARISON_REPORT_DATA || {};
  return (
    <Suspense fallback={<Loading />}>
      <CRPage data={data} />
    </Suspense>
  );
}

function MobileDeviceWarning() {
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: WARNING_TYPE_LABEL,
      page: 'report-index',
    },
  });
  return (
    <>
      <div>
        Please open this on a Desktop Computer. Mobile is currently not
        supported.
      </div>
    </>
  );
}

function App() {
  const isMobile: boolean = /iPhone|iPad|iPod|Android/i.test(
    navigator.userAgent,
  );

  if (isMobile) {
    return (
      <>
        <MobileDeviceWarning />
      </>
    );
  }

  const isSingleReport: boolean =
    process.env.REACT_APP_SINGLE_REPORT === 'true';

  return (
    <Main isSingleReport={isSingleReport}>
      {isSingleReport ? <AppSingle /> : <AppComparison />}
    </Main>
  );
}

export default App;

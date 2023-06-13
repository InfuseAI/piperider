import * as Sentry from '@sentry/browser';
import { Suspense, lazy, useState } from 'react';
import { BrowserTracing } from '@sentry/tracing';

import { Loading } from './components/Common';
import { useTrackOnMount, useDocumentTitle } from './hooks';
import {
  amplitudeTrack,
  EVENTS,
  useReportStore,
  useTrackerStore,
  WARNING_TYPE_LABEL,
} from './utils';
import { Main } from './components/Common/Main';
import { Switch, Tooltip } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

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

function AppSingle({ cloud }: { cloud: boolean }) {
  const data = window.PIPERIDER_SINGLE_REPORT_DATA || {};
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  return (
    <Suspense fallback={<Loading />}>
      <Main isSingleReport>
        <SRPage data={data} sideNavTop="46px" cloud={cloud} />
      </Main>
    </Suspense>
  );
}

function AppComparison({ cloud }: { cloud: boolean }) {
  const data = window.PIPERIDER_COMPARISON_REPORT_DATA || {};
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData(data);
  return (
    <Suspense fallback={<Loading />}>
      <Main isSingleReport={false}>
        <CRPage data={data} sideNavTop="46px" cloud={cloud} />
      </Main>
    </Suspense>
  );
}

function MobileDeviceWarning() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
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
  useDocumentTitle();
  const [cloud, setCloud] = useState(false);

  const setTracker = useTrackerStore((state) => state.setTracker);
  const tracker = {
    track: amplitudeTrack,
  };
  setTracker(tracker);

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
  const isDevelopmentMode = process.env.NODE_ENV === 'development';

  return (
    <>
      {isSingleReport ? (
        <AppSingle cloud={cloud} />
      ) : (
        <AppComparison cloud={cloud} />
      )}
      {isDevelopmentMode && (
        <div>
          <div style={{ position: 'absolute', top: '0px', left: '0px' }}>
            Cloud
            <Tooltip label="Devlop the cloud mode. It would enable the lineage graph.">
              <InfoIcon />
            </Tooltip>
            <br />
            <Switch
              isChecked={cloud}
              onChange={() => {
                console.log(`change: ${cloud}`);
                setCloud(!cloud);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default App;

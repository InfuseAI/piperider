import { useTransition } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { Main } from '../shared/Main';
import { SRTableList } from './SRTableList';
import {
  TableActionBar,
  type TableActionBarView,
} from '../shared/TableActionBar';
import { formatReportTime } from '../../utils/formatters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SR_LIST_VIEW } from '../../utils/localStorageKeys';
import { type SingleReportSchema } from '../../sdlc/single-report-schema';

type Props = { data: SingleReportSchema };

export function SingleReportList({ data }: Props) {
  const { created_at, datasource } = data;

  const [isPending, startTransition] = useTransition();
  const [view, setView] = useLocalStorage<TableActionBarView>(
    SR_LIST_VIEW,
    'summary',
  );

  useDocumentTitle('Report List');

  return (
    <Main isSingleReport time={formatReportTime(created_at)}>
      <TableActionBar
        sourceName={datasource.name}
        sourceType={datasource.type}
        inTransition={isPending}
        currentView={view}
        toggleView={(nextView) => {
          startTransition(() => {
            setView(nextView);
          });
        }}
      />

      <SRTableList data={data} view={view} />
    </Main>
  );
}

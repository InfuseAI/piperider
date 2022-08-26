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
        currentView={view}
        toggleView={(nextView) => {
          setView(nextView);
        }}
      />

      <SRTableList data={data} view={view} />
    </Main>
  );
}

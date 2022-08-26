import { useLocalStorage } from 'usehooks-ts';

import { Main } from '../shared/Main';
import {
  TableActionBar,
  type TableActionBarView,
} from '../shared/TableActionBar';

import { formatReportTime } from '../../utils/formatters';

import { CRTableList } from './CRTableList';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { CR_LIST_VIEW } from '../../utils/localStorageKeys';
import { type ComparisonReportSchema } from '../../types';

type Props = { data: ComparisonReportSchema };

export function ComparisonReportList({ data }: Props) {
  const { base, input: target } = data;

  const [view, setView] = useLocalStorage<TableActionBarView>(
    CR_LIST_VIEW,
    'summary',
  );

  useDocumentTitle('Report List');

  return (
    <Main
      isSingleReport={false}
      time={`${formatReportTime(base.created_at)} -> ${formatReportTime(
        target.created_at,
      )}`}
    >
      <TableActionBar
        sourceName={data.input.datasource.name}
        sourceType={data.input.datasource.type}
        currentView={view}
        toggleView={(nextView) => {
          setView(nextView);
        }}
      />

      <CRTableList data={data} view={view} />
    </Main>
  );
}

import { useLocalStorage } from 'usehooks-ts';

import { Main } from '../shared/Main';
import { ToggleList, type ToggleListView } from '../shared/ToggleList';

import { formatReportTime } from '../../utils/formatters';

import { CRListOverview } from './CRListOverview';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { CR_LIST_VIEW } from '../../utils/localStorageKeys';
import { type ComparisonReportSchema } from '../../types';

type Props = { data: ComparisonReportSchema };

export function ComparisonReportList({ data }: Props) {
  const { base, input: target } = data;
  const [view, setView] = useLocalStorage<ToggleListView>(
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
      <ToggleList
        sourceName={data.input.datasource.name}
        sourceType={data.input.datasource.type}
        currentView={view}
        toggleView={(nextView) => setView(nextView)}
      />

      <CRListOverview data={data} />
    </Main>
  );
}

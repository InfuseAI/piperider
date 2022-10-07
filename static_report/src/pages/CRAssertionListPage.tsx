import { Main } from '../components/shared/Layouts/Main';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { ComparisonReportSchema } from '../types';
import { useReportStore } from '../utils/store';

interface Props {
  data: ComparisonReportSchema;
}
export function CRAssertionListPage({ data: { base, input } }: Props) {
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base, input });
  const { tableColumnAssertionsOnly } = useReportStore.getState();
  return (
    <Main isSingleReport={false}>
      <AssertionListWidget assertionList={tableColumnAssertionsOnly} />
    </Main>
  );
}

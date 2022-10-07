import { Main } from '../components/shared/Layouts/Main';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { SaferSRSchema } from '../types';
import { useReportStore } from '../utils';

interface Props {
  data: SaferSRSchema;
}
export function SRAssertionListPage({ data }: Props) {
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base: data });
  const { tableColumnAssertionsOnly } = useReportStore.getState();

  return (
    <Main isSingleReport>
      <AssertionListWidget
        singleOnly
        assertionList={tableColumnAssertionsOnly}
      />
    </Main>
  );
}

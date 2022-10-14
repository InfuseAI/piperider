import { Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { AssertionStatusSummary } from '../components/shared/Assertions/AssertionStatusSummary';
import { Main } from '../components/shared/Layouts/Main';
import { SearchTextInput } from '../components/shared/Layouts/SearchTextInput';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { ComparisonReportSchema } from '../types';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL } from '../utils';
import { assertionListWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';

interface Props {
  data: ComparisonReportSchema;
}
export function CRAssertionListPage({ data: { base, input } }: Props) {
  useDocumentTitle('Comparison Report: Assertions');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'assertion-list-page',
    },
  });
  const [filterString, setFilterString] = useState<string>('');
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base, input });
  const { tableColumnAssertionsOnly } = useReportStore.getState();
  return (
    <Main isSingleReport={false}>
      <Flex maxW={assertionListWidth - 50} w={'100%'} mt={10}>
        <SearchTextInput
          onChange={setFilterString}
          filterString={filterString}
        />
      </Flex>
      <AssertionStatusSummary
        p={5}
        w={assertionListWidth}
        failed={tableColumnAssertionsOnly?.metadata?.failed}
        passed={tableColumnAssertionsOnly?.metadata?.passed}
      />
      <AssertionListWidget
        w={assertionListWidth}
        comparableAssertions={tableColumnAssertionsOnly}
        filterString={filterString}
      />
    </Main>
  );
}

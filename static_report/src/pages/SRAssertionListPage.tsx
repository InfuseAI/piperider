import { Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { AssertionStatusSummary } from '../components/shared/Assertions/AssertionStatusSummary';
import { Main } from '../components/shared/Layouts/Main';
import { SearchTextInput } from '../components/shared/Layouts/SearchTextInput';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';
import { assertionListWidth } from '../utils/layout';

interface Props {
  data: SaferSRSchema;
}
export function SRAssertionListPage({ data }: Props) {
  useDocumentTitle('Single Report: Assertions');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'assertion-list-page',
    },
  });
  const [filterString, setFilterString] = useState<string>('');
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base: data });
  const { tableColumnAssertionsOnly } = useReportStore.getState();

  return (
    <Main isSingleReport>
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
        singleOnly
        filterString={filterString}
        comparableAssertions={tableColumnAssertionsOnly}
      />
    </Main>
  );
}

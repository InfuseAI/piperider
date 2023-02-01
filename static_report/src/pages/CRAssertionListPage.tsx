import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { Main } from '../components/Common/Main';
import { MasterDetailContainer } from '../components/Layouts/MasterDetailContainer';
import { SearchTextInput } from '../components/Layouts/SearchTextInput';
import { TableListAssertionSummary } from '../components/Tables/TableList/TableListAssertions';
import { AssertionListWidget } from '../components/Widgets/AssertionListWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { ComparisonReportSchema } from '../types';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL } from '../utils';
import { assertionListWidth, mainContentAreaHeight } from '../utils/layout';
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
  const {
    rawData,
    tableColumnsOnly = [],
    assertionsOnly,
  } = useReportStore.getState();
  const { metadata } = assertionsOnly || {};

  return (
    <Main isSingleReport={false}>
      <MasterDetailContainer
        rawData={rawData}
        tableColEntries={tableColumnsOnly}
      >
        <Box px={9} h={mainContentAreaHeight} overflowY={'auto'}>
          <Flex maxW={assertionListWidth - 50} w={'100%'} mt={10}>
            <SearchTextInput
              onChange={setFilterString}
              filterString={filterString}
            />
          </Flex>
          <Flex
            justify={'start'}
            maxW={assertionListWidth - 50}
            w={'100%'}
            my={5}
          >
            <TableListAssertionSummary
              baseAssertionFailed={metadata?.base?.failed}
              baseAssertionTotal={metadata?.base?.total}
              targetAssertionFailed={metadata?.target?.failed}
              targetAssertionTotal={metadata?.target?.total}
            />
          </Flex>
          <AssertionListWidget
            w={assertionListWidth}
            comparableAssertions={assertionsOnly}
            filterString={filterString}
            setFilterString={setFilterString}
          />
        </Box>
      </MasterDetailContainer>
    </Main>
  );
}

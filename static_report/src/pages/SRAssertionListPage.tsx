import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { AssertionPassFailCountLabel } from '../components/Assertions/AssertionPassFailCountLabel';
import { Main } from '../components/Common/Main';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';
import { SearchTextInput } from '../components/Common/SearchTextInput';
import { AssertionListWidget } from '../components/Widgets/AssertionListWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';
import { assertionListWidth, mainContentAreaHeight } from '../utils/layout';

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

  const {
    tableColumnsOnly = [],
    rawData,
    assertionsOnly,
  } = useReportStore.getState();
  const { metadata } = assertionsOnly || {};

  return (
    <Main isSingleReport>
      <MasterDetailContainer
        rawData={rawData}
        tableColEntries={tableColumnsOnly}
        singleOnly
      >
        <Box px={9} h={mainContentAreaHeight} overflowY={'auto'}>
          <Flex maxW={assertionListWidth - 50} w={'100%'}>
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
            {Number(metadata?.base?.total) > 0 && (
              <AssertionPassFailCountLabel
                total={metadata?.base?.total}
                failed={metadata?.base?.failed}
              />
            )}
          </Flex>
          <AssertionListWidget
            maxW={assertionListWidth - 50}
            w={'100%'}
            singleOnly
            filterString={filterString}
            comparableAssertions={assertionsOnly}
          />
        </Box>
      </MasterDetailContainer>
    </Main>
  );
}

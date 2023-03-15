import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { AssertionPassFailCountLabel } from '../components/Assertions/AssertionPassFailCountLabel';
import { SearchTextInput } from '../components/Common/SearchTextInput';
import { AssertionListWidget } from '../components/Widgets/AssertionListWidget';
import { useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';
import { assertionListWidth } from '../utils/layout';

export function SRAssertionListPage() {
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'assertion-list-page',
    },
  });
  const [filterString, setFilterString] = useState<string>('');

  const { assertionsOnly } = useReportStore.getState();
  const { metadata } = assertionsOnly || {};

  return (
    <Box>
      <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
        Assertions
      </Text>

      <Flex maxW={assertionListWidth - 50} w={'100%'}>
        <SearchTextInput
          onChange={setFilterString}
          filterString={filterString}
        />
      </Flex>
      <Flex justify={'start'} maxW={assertionListWidth - 50} w={'100%'} my={5}>
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
  );
}

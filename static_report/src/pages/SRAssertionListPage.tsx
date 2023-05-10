import {
  Box,
  Flex,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  AlertTitle,
  Link,
} from '@chakra-ui/react';
import { useState } from 'react';
import { AssertionPassFailCountLabel } from '../components/Assertions/AssertionPassFailCountLabel';
import { SearchTextInput } from '../components/Common/SearchTextInput';
import { AssertionListWidget } from '../components/Widgets/AssertionListWidget';
import { useTrackOnMount } from '../hooks';
import { EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';
import { assertionListWidth } from '../utils/layout';
import { FeedbackLinkFromLocalReport } from '../components/Common/HelpMenu';

export function SRAssertionListPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
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
      <Alert status="warning" mb={5}>
        <AlertIcon />
        <Box>
          <AlertTitle>
            The Assertions page will be deprecated in the future
          </AlertTitle>
          <AlertDescription fontSize="sm">
            If you have a strong need for this page, please contact us by the{' '}
            <Link
              href={FeedbackLinkFromLocalReport}
              style={{ textDecoration: 'underline' }}
            >
              feedback link
            </Link>
            . Your feedback is important to us. Thank you!
          </AlertDescription>
        </Box>
      </Alert>
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

import {
  Box,
  Flex,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
} from '@chakra-ui/react';
import { useState } from 'react';
import { SearchTextInput } from '../components/Common/SearchTextInput';
import { TableListAssertionSummary } from '../components/Tables';
import { AssertionListWidget } from '../components/Widgets/AssertionListWidget';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils';
import { assertionListWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import {
  FeedbackLinkFromLocalReport,
  FeedbackLinkFromCloud,
} from '../components/Common/HelpMenu';

export function CRAssertionListPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'assertion-list-page',
    },
  });
  const [filterString, setFilterString] = useState<string>('');
  const { assertionsOnly, isCloudReport } = useReportStore.getState();
  const { metadata } = assertionsOnly || {};
  const feedBackLink = isCloudReport
    ? FeedbackLinkFromCloud
    : FeedbackLinkFromLocalReport;

  return (
    <Box>
      <Alert status="warning" mb={5}>
        <AlertIcon />
        <Box>
          <AlertTitle>
            The Assertions page is deprecated and will be removed in the future
          </AlertTitle>
          <AlertDescription fontSize="sm">
            If you have a strong need for this page, please contact us by the{' '}
            <Link href={feedBackLink} style={{ textDecoration: 'underline' }}>
              feedback link
            </Link>
            . Your feedback is important to us. Thank you!
          </AlertDescription>
        </Box>
      </Alert>
      <Flex w={'100%'}>
        <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
          Assertions
        </Text>
      </Flex>
      <Flex maxW={assertionListWidth - 50} w={'100%'} mt={5}>
        <SearchTextInput
          onChange={setFilterString}
          filterString={filterString}
        />
      </Flex>
      <Flex justify={'start'} maxW={assertionListWidth - 50} w={'100%'} my={5}>
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
  );
}

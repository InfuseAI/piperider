import { Box, Flex, Icon, Image, Link, Text } from '@chakra-ui/react';
import { FiSquare, FiColumns } from 'react-icons/fi';
import { NO_VALUE } from '../Columns';
import { useReportStore } from '../../utils/store';
import { HelpMenu, FeedbackLinkFromLocalReport } from './HelpMenu';

type Props = {
  isSingleReport: boolean;
};

export function Navbar({ isSingleReport }: Props) {
  const { reportDisplayTime } = useReportStore.getState();

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      height="48px"
      px="80px"
      bg="white"
      gap={4}
    >
      <Box flex="0 0 150px">
        <Link href="#/" zIndex={100}>
          <Image src="logo/logo.svg" height="36px" alt="PipeRider" />
        </Link>
      </Box>

      <Flex
        flex="0 0 auto"
        position="relative"
        justifyContent="center"
        alignItems="center"
        minWidth="50%"
        bgColor="gray.100"
        borderRadius={8}
      >
        <Icon
          left={2}
          position="absolute"
          as={isSingleReport ? FiSquare : FiColumns}
          boxSize={4}
        />
        <Text whiteSpace="nowrap" px="32px">
          {reportDisplayTime || NO_VALUE}
        </Text>
      </Flex>

      <Flex justifyContent="flex-end" zIndex="modal" flex="0 1 150px">
        <HelpMenu feedbackLink={FeedbackLinkFromLocalReport} />
      </Flex>
    </Flex>
  );
}

import { Flex, Icon, Image, Link, Text } from '@chakra-ui/react';
import { FiSquare, FiColumns } from 'react-icons/fi';
import { NO_VALUE } from '../Columns';
import { useReportStore } from '../../utils/store';
type Props = {
  isSingleReport: boolean;
};

export function Navbar({ isSingleReport }: Props) {
  const { reportDisplayTime } = useReportStore.getState();

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="48px"
      px="80px"
      bg="white"
      position="relative"
      gap={4}
    >
      <Link href="#/" position="absolute" left="96px" zIndex={100}>
        <Image src="logo/logo.svg" height="36px" alt="PipeRider" />
      </Link>

      <Flex
        // ml="180px"
        justifyContent="center"
        alignItems="center"
        minWidth="50%"
        bgColor="gray.100"
        borderRadius={8}
        position="relative"
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
    </Flex>
  );
}

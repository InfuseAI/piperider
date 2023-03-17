import { Flex, Icon, Image, Text } from '@chakra-ui/react';
import { FiSquare, FiColumns } from 'react-icons/fi';
import { NO_VALUE } from '../Columns';
import { useReportStore } from '../../utils/store';
type Props = {
  isSingleReport: boolean;
};

export function Navbar({ isSingleReport }: Props) {
  const { reportDisplayTime } = useReportStore.getState();

  return (
    <Flex alignItems="center" px={6} bg="white">
      <a href="#/">
        <Image src="logo/logo.svg" height="64px" alt="PipeRider" />
      </a>

      <Flex
        justifyContent="center"
        alignItems="center"
        width="50%"
        ml={32}
        height={8}
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
        <Text>{reportDisplayTime || NO_VALUE}</Text>
      </Flex>
    </Flex>
  );
}

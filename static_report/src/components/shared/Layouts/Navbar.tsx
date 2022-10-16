import { Flex, Icon, Image, Text, Link as CharakaLink } from '@chakra-ui/react';
import { FiSquare, FiColumns } from 'react-icons/fi';
import { Link } from 'wouter';
import { NO_VALUE } from '../Columns';
import { useReportStore } from '../../../utils/store';

type Props = {
  isSingleReport: boolean;
};

export function Navbar({ isSingleReport }: Props) {
  const { reportTime } = useReportStore.getState();

  return (
    <Flex alignItems="center" px={6} bg="white" boxShadow="md">
      <CharakaLink as={Link} to="/">
        <a href="/">
          <Image src="logo/logo.svg" height="64px" alt="PipeRider" />
        </a>
      </CharakaLink>

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
        <Text>{reportTime || NO_VALUE}</Text>
      </Flex>
    </Flex>
  );
}

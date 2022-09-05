import { Flex, Icon, Image, Text, Link } from '@chakra-ui/react';
import { FiSquare, FiColumns } from 'react-icons/fi';

type Props = {
  time: string;
  isSingleReport: boolean;
};

export function Navbar({ time, isSingleReport }: Props) {
  return (
    <Flex alignItems="center" px={6} bg="white" boxShadow="md">
      <Link href="/">
        <Image src="logo/logo.svg" height="64px" alt="PipeRider" />
      </Link>

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
        <Text>{time}</Text>
      </Flex>
    </Flex>
  );
}

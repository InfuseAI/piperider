import {
  Box,
  Button,
  ButtonGroup,
  Center,
  HStack,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { UpDownIcon } from '@chakra-ui/icons';

type Prop = {
  checkState: string[];
  onCompareClick: () => void;
  onReverseClick: () => void;
  error?: string;
};
export function StickyFooter({
  checkState,
  onCompareClick,
  onReverseClick,
  error,
}: Prop) {
  return (
    <Center>
      <Box
        bgColor="gray.100"
        borderRadius="15px"
        bottom="10px"
        opacity="0.95"
        py={4}
        px={5}
        pos="fixed"
        w="38%"
        minWidth="500px"
        zIndex={3}
      >
        <VStack>
          <HStack spacing="15px">
            <Box>
              <Text w={55} textAlign={['left']} fontWeight="semibold">
                Base:
              </Text>
              <Text w={55} textAlign={['left']} fontWeight="semibold">
                Target:
              </Text>
            </Box>
            <Box>
              <Text noOfLines={1}>{checkState[0]}</Text>
              <Text>{checkState[1]}</Text>
            </Box>
            <ButtonGroup m={'auto 0'}>
              <Tooltip label="Reverse base and target" openDelay={500}>
                <Button colorScheme="orange" onClick={onReverseClick}>
                  <UpDownIcon />
                </Button>
              </Tooltip>
              <Button colorScheme="blue" onClick={onCompareClick}>
                Compare
              </Button>
            </ButtonGroup>
          </HStack>
          {error && (
            <Text color="red.500" fontWeight="semibold">
              {error}
            </Text>
          )}
        </VStack>
      </Box>
    </Center>
  );
}

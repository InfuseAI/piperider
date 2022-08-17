import { Box, Button, Center, HStack, Text, VStack } from '@chakra-ui/react';

type Prop = {
  checkState: string[];
  onCompareClick: () => void;
  error?: string;
};
export function StickyFooter({ checkState, onCompareClick, error }: Prop) {
  return (
    <Center>
      <Box
        bgColor="gray.100"
        borderRadius="15px"
        bottom="10px"
        opacity="0.95"
        p={4}
        pos="fixed"
        w="35%"
        minWidth="460px"
        zIndex={3}
      >
        <Center>
          <VStack>
            <HStack spacing="20px">
              <VStack>
                <HStack spacing="10px">
                  <Text w={55} textAlign={['left']} fontWeight="semibold">
                    Base:
                  </Text>
                  <Text>{checkState[0]}</Text>
                </HStack>
                <HStack spacing="10px">
                  <Text w={55} textAlign={['left']} fontWeight="semibold">
                    Target:
                  </Text>
                  <Text>{checkState[1]}</Text>
                </HStack>
              </VStack>
              <Box m={'auto 0'}>
                <Button colorScheme="blue" onClick={onCompareClick}>
                  Compare
                </Button>
              </Box>
            </HStack>
            {error && (
              <Text color="red.500" fontWeight="semibold">
                {error}
              </Text>
            )}
          </VStack>
        </Center>
      </Box>
    </Center>
  );
}

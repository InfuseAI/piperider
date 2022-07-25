import { Flex } from '@chakra-ui/react';

/**
 * Container of single charts.
 * Clickable for showing modal popup zoom of chart
 */
export function ColumnCardDataVisualContainer({ children }) {
  return (
    <Flex p={6} m={3} bg={'whiteAlpha.700'} rounded={'md'}>
      {children}
    </Flex>
  );
}

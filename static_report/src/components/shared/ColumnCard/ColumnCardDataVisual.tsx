import { Flex } from '@chakra-ui/react';

/**
 * Container of single charts.
 * Clickable for showing modal popup zoom of chart
 */
export function ColumnCardDataVisualContainer({ children }) {
  return <Flex m={6}>{children}</Flex>;
}

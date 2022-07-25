import { Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};
export const ColumnCardBodyContainer: React.FC<Props> = ({ children }) => {
  return (
    <Flex
      p={3}
      bg={'whiteAlpha.900'}
      height={'inherit'}
      direction="column"
      borderBottomRadius={'inherit'}
    >
      {children}
    </Flex>
  );
};

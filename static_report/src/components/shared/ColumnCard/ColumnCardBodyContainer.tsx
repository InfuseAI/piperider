import { Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};
export const ColumnCardBodyContainer: React.FC<Props> = ({ children }) => {
  return (
    <Flex
      p={2}
      bg={'white'}
      height={'inherit'}
      maxHeight={330}
      overflowY="auto"
      direction="column"
      borderBottomRadius={'inherit'}
    >
      {children}
    </Flex>
  );
};

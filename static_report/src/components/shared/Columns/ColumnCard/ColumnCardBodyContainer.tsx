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
      height={'100%'}
      direction="column"
      borderBottomRadius={'inherit'}
    >
      {children}
    </Flex>
  );
};

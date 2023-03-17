import { Button, Flex, FlexProps, useDisclosure } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { CommonModal } from '../Common/CommonModal';

/**
 * Container to display one chart.
 * Children clickable for showing modal popup zoom of chart
 */
type Props = {
  children: ReactNode;
  title?: string;
  allowModalPopup?: boolean;
  height?: number;
};
export function ChartContainer({
  title,
  children,
  allowModalPopup,
  ...props
}: Props & FlexProps) {
  const modal = useDisclosure();
  return (
    <>
      <Flex
        bg={'whiteAlpha.700'}
        rounded={'md'}
        onClick={() => allowModalPopup && modal.onOpen()}
        {...props}
      >
        {children}
      </Flex>
      {allowModalPopup && (
        <CommonModal
          {...modal}
          size={'full'}
          title={title}
          footer={
            <Flex mt={6} w={'100%'} direction={'row'} justify={'center'}>
              <Button colorScheme="blue" mr={3} onClick={modal.onClose}>
                Close
              </Button>
            </Flex>
          }
        >
          {children}
        </CommonModal>
      )}
    </>
  );
}

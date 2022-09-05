import {
  Button,
  Flex,
  FlexProps,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

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
export function ColumnCardDataVisualContainer({
  title,
  children,
  allowModalPopup,
  height = 300,
  ...props
}: Props & FlexProps) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  return (
    <>
      <Flex
        px={6}
        py={6}
        my={3}
        mx={3}
        minHeight={`${height}px`}
        maxHeight={`${height}px`}
        width={'calc(100% - 24px)'}
        bg={'whiteAlpha.700'}
        rounded={'md'}
        onClick={() => allowModalPopup && onOpen()}
        {...props}
      >
        {children}
      </Flex>
      {allowModalPopup && (
        <Modal size={'full'} isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent p={12}>
            <ModalHeader>{title}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>{children}</ModalBody>

            <ModalFooter>
              <Flex mt={6} w={'100%'} direction={'row'} justify={'center'}>
                <Button colorScheme="blue" mr={3} onClick={onClose}>
                  Close
                </Button>
              </Flex>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

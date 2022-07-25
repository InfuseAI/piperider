import {
  Button,
  Flex,
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
 * Container of single charts.
 * Clickable for showing modal popup zoom of chart
 */
type Props = { children: ReactNode; title: string };
export const ColumnCardDataVisualContainer: React.FC<Props> = ({
  title,
  children,
}) => {
  const { onOpen, isOpen, onClose } = useDisclosure();
  return (
    <>
      <Flex p={6} m={3} bg={'whiteAlpha.700'} rounded={'md'} onClick={onOpen}>
        {children}
      </Flex>
      <Modal size={'3xl'} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{children}</ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

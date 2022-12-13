import {
  Modal,
  ModalProps,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  UseDisclosureReturn,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface CommonModalProps extends UseDisclosureReturn, ModalProps {
  title?: ReactNode | string;
  children: ReactNode | string;
  footer?: ReactNode;
}

export function CommonModal({
  title,
  children,
  footer,
  ...modal
}: CommonModalProps) {
  return (
    <Modal autoFocus={false} {...modal}>
      <ModalOverlay />
      <ModalContent>
        {title && <ModalHeader>{title}</ModalHeader>}
        <ModalCloseButton />
        <ModalBody>{children}</ModalBody>

        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </Modal>
  );
}

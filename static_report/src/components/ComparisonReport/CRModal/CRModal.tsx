import {
  Button,
  Text,
  Modal,
  ModalHeader,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  type UseDisclosureReturn,
} from '@chakra-ui/react';
import { AssertionTest } from '../../../sdlc/single-report-schema';

import { CRInputData } from '../../../types';
import { DbtTable } from './CRModalDbtTable';
import { PipeRiderTable } from './CRModalPiperiderTable';

export type CRModalData = {
  level: 'Column' | 'Table';
  column: string;
  name: string;
} & CRInputData<AssertionTest & { message?: string }>;

interface Props extends UseDisclosureReturn {
  type?: 'piperider' | 'dbt';
  data?: CRModalData;
}

export function CRModal({
  data,
  type = 'piperider',
  isOpen,
  onClose,
  ...props
}: Props) {
  return (
    <Modal
      {...props}
      isOpen={isOpen}
      size="2xl"
      onClose={() => {
        onClose();
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text title={data?.name} noOfLines={1} maxWidth="calc(100% - 50px)">
            {data?.name}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {type === 'piperider' ? (
            <PipeRiderTable data={data} />
          ) : (
            <DbtTable data={data} />
          )}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

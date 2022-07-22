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

import { CRTargetData } from '../../../types';
import { DbtTable } from './CRModalDbtTable';
import { PipeRiderTable } from './CRModalPiperiderTable';

export type CRModalData = {
  level: 'Column' | 'Table';
  column: string;
  name: string;
} & CRTargetData<AssertionTest & { message?: string }>;
export type TestDetail = {
  type?: 'piperider' | 'dbt';
  data?: CRModalData;
};
type Props = UseDisclosureReturn & TestDetail;

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

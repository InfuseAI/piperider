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
import { AssertionTest } from '../../../../sdlc/single-report-schema';

import { ComparableData } from '../../../../types';
import { AssertionTestDetail } from './AssertionTestDetail';

export type CRModalData = {
  assertionName: string;
  assertionKind: 'piperider' | 'dbt';
} & ComparableData<
  AssertionTest & {
    message?: string;
  }
>;
export type TestDetail = {
  data?: CRModalData;
};

type Props = UseDisclosureReturn & TestDetail;
export function CRModal({ data, isOpen, onClose, ...props }: Props) {
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
          <Text
            title={data?.assertionName}
            noOfLines={1}
            maxWidth="calc(100% - 50px)"
          >
            {data?.assertionName}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <AssertionTestDetail data={data} />
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

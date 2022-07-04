import {
  Button,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
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

import { TestStatus } from '../shared/TestStatus';
import { extractExpectedOrActual } from '../../utils';

interface Props extends UseDisclosureReturn {
  data?: any;
  type?: 'piperider' | 'dbt';
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
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th />
                  <Th>Status</Th>
                  {type === 'piperider' && <Th>Expected</Th>}
                  {type === 'piperider' && <Th>Actual</Th>}
                  {type === 'dbt' && <Th>Message</Th>}
                </Tr>
              </Thead>

              <Tbody>
                <Tr>
                  <Td fontWeight={700}>Base</Td>
                  <Td>
                    <TestStatus status={data?.base?.status} />
                  </Td>
                  {type === 'piperider' && (
                    <Td>{extractExpectedOrActual(data?.base?.expected)}</Td>
                  )}
                  {type === 'piperider' && (
                    <Td>{extractExpectedOrActual(data?.base?.actual)}</Td>
                  )}
                  {type === 'dbt' && <Td>{data?.base?.message ?? '-'}</Td>}
                </Tr>

                <Tr>
                  <Td fontWeight={700}>Input</Td>
                  <Td>
                    <TestStatus status={data?.input?.status} />
                  </Td>
                  {type === 'piperider' && (
                    <Td>{extractExpectedOrActual(data?.input?.expected)}</Td>
                  )}
                  {type === 'piperider' && (
                    <Td>{extractExpectedOrActual(data?.input?.actual)}</Td>
                  )}
                  {type === 'dbt' && <Td>{data?.input?.message ?? '-'}</Td>}
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

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
import type { ComparisonReportSchema } from '../../sdlc/comparison-report-schema';

interface Props extends UseDisclosureReturn {
  type?: 'piperider' | 'dbt';
  data?: ComparisonReportSchema & {
    level: 'Column' | 'Table';
    column: string;
    name: string;
  };
}

function PipeRiderTable({ data }: { data: ComparisonReportSchema }) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th />
            <Th>Status</Th>
            <Th>Expected</Th>
            <Th>Actual</Th>
          </Tr>
        </Thead>

        <Tbody>
          <Tr>
            <Td fontWeight={700}>Base</Td>
            <Td>
              <TestStatus status={data?.base?.status as any} />
            </Td>
            <Td>{extractExpectedOrActual(data?.base?.expected)}</Td>
            <Td>{extractExpectedOrActual(data?.base?.actual)}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Input</Td>
            <Td>
              <TestStatus status={data?.input?.status as any} />
            </Td>
            <Td>{extractExpectedOrActual(data?.input?.expected)}</Td>
            <Td>{extractExpectedOrActual(data?.input?.actual)}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function DbtTable({ data }: { data: ComparisonReportSchema }) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th />
            <Th>Status</Th>
            <Th>Message</Th>
          </Tr>
        </Thead>

        <Tbody>
          <Tr>
            <Td fontWeight={700}>Base</Td>
            <Td>
              <TestStatus status={data?.base?.status as any} />
            </Td>
            <Td>{(data?.base?.message as any) ?? '-'}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Input</Td>
            <Td>
              <TestStatus status={data?.input?.status as any} />
            </Td>
            <Td>{(data?.base?.message as any) ?? '-'}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
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

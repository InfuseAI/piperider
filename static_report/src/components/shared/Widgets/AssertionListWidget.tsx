import {
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  useDisclosure,
  Code,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Comparable } from '../../../types';
import { ReportState } from '../../../utils';
import { AssertionStatus } from '../Assertions';
import { CRModal, CRModalData } from '../Modals/CRModal/CRModal';

interface Props extends Comparable {
  assertionList: ReportState['tableColumnAssertionsOnly'];
  filterString?: string;
}
/*
	* Assertion List Item
	Status = Pass | Fail 
	Test Subject =“<TABLE>.<COLUMN>”
	Assertion = assertion.name
	Expected = assertion range expectation
	Actual = actual value
	Source (*)
*/
//FIXME: TEST ME WITH BASE: EMPTY
export function AssertionListWidget({
  assertionList = [],
  filterString,
  singleOnly,
}: Props) {
  const modal = useDisclosure();
  const [testDetail, setTestDetail] = useState<CRModalData | undefined>();

  if (assertionList.length === 0) {
    return (
      <Flex direction="column" justifyContent="center" alignItems="center">
        <Text textAlign="center">No tests available</Text>
      </Flex>
    );
  }

  return (
    <>
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              {!singleOnly ? (
                <>
                  <Th>Base Status</Th>
                  <Th>Target Status</Th>
                </>
              ) : (
                <Th>Status</Th>
              )}
              <Th>Test Subject</Th>
              <Th>Assertion</Th>
              {singleOnly && (
                <>
                  <Th>Expected</Th>
                  <Th>Actual</Th>
                </>
              )}
              <Th>Source</Th>
              {!singleOnly && <Th>View</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {assertionList.map(({ base, target, metadata }) => {
              return base
                ?.filter((v) =>
                  filterString
                    ? v.name.search(new RegExp(filterString, 'gi')) > -1 ||
                      (v.tableName || '').search(
                        new RegExp(filterString, 'gi'),
                      ) > -1 ||
                      (v.columnName || '').search(
                        new RegExp(filterString, 'gi'),
                      ) > -1
                    : true,
                )
                .map(
                  (
                    {
                      name,
                      tableName,
                      columnName,
                      kind,
                      expected,
                      actual,
                      status,
                    },
                    index,
                  ) => {
                    const baseTest = base?.[index];
                    const targetTest = target?.[index];
                    return (
                      <Tr key={`${tableName}:${name}:${kind}-${index}`}>
                        <Td>
                          <AssertionStatus status={baseTest?.status} />
                        </Td>
                        {!singleOnly && (
                          <Td>
                            <AssertionStatus status={targetTest?.status} />
                          </Td>
                        )}
                        <Td>
                          {columnName
                            ? `${tableName}.${columnName}`
                            : `${tableName}`}
                        </Td>
                        <Td>{name}</Td>
                        {singleOnly && (
                          <>
                            <Td>
                              <Code color={'gray.700'}>
                                {JSON.stringify(expected)}
                              </Code>
                            </Td>
                            <Td>
                              <Code
                                color={
                                  status === 'failed' ? 'red.500' : 'green.500'
                                }
                              >
                                {JSON.stringify(actual)}
                              </Code>
                            </Td>
                          </>
                        )}
                        <Td>{kind}</Td>
                        {!singleOnly && (
                          <Td
                            onClick={() => {
                              setTestDetail({
                                assertionKind: kind,
                                assertionName: name,
                                base: baseTest,
                                target: targetTest,
                              });
                              modal.onOpen();
                            }}
                          >
                            <Text as="span" cursor="pointer">
                              🔍
                            </Text>
                          </Td>
                        )}
                      </Tr>
                    );
                  },
                );
            })}
          </Tbody>
        </Table>
      </TableContainer>
      <CRModal
        {...modal}
        data={testDetail}
        onClose={() => {
          modal.onClose();
          setTestDetail(undefined);
        }}
      />
    </>
  );
}

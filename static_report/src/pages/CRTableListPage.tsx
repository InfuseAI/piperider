import { TableListItem } from '../components/Tables/TableList/TableListItem';
import { Flex, Text, Grid, useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';

import { tableListGridTempCols, tableListMaxWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/Tables/TableList/TableColumnSchemaList';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils/trackEvents';
import { CommonModal } from '../components/Common/CommonModal';
import _ from 'lodash';

export function CRTablesListPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'table-list-page',
    },
  });
  const modal = useDisclosure();
  const [tableColsEntryId, setTableColsEntryId] = useState(-1);
  const {
    tableColumnsOnly = [],
    assertionsOnly,
    isLegacy,
  } = useReportStore.getState();

  const tableColumnsSorted = _.sortBy(
    tableColumnsOnly,
    ([, { base, target }]) => {
      const fallback = target ?? base;
      return fallback?.__table?.name;
    },
  );

  let selected;
  if (tableColsEntryId !== -1) {
    const [, { base, target }] = tableColumnsSorted[tableColsEntryId];
    selected = target ?? base;
  }

  return (
    <>
      <Flex direction="column" w={'100%'} minHeight="650px">
        <Flex w={'100%'}>
          <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
            Tables
          </Text>
        </Flex>
        <Grid
          templateColumns={tableListGridTempCols}
          maxW={tableListMaxWidth}
          px={4}
          my={6}
        >
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>

        {tableColumnsSorted.map((tableColsEntry, i) => {
          const [, { base, target }] = tableColsEntry;
          const fallback = base ?? target;
          if (!fallback?.__table) {
            return <></>;
          }
          if (!isLegacy) {
            if (fallback?.resource_type === 'table') {
              return <></>;
            }
          }

          return (
            <Flex key={i}>
              <TableListItem
                combinedAssertions={assertionsOnly}
                combinedTableEntry={tableColsEntry}
                onInfoClick={() => {
                  setTableColsEntryId(i);
                  modal.onOpen();
                }}
              />
            </Flex>
          );
        })}
      </Flex>

      <CommonModal
        {...modal}
        size="2xl"
        title={selected?.__table?.name}
        onClose={() => {
          setTableColsEntryId(-1);
          modal.onClose();
        }}
      >
        <Text fontSize="lg" mb={4}>
          Description:{' '}
          {selected?.__table?.description || (
            <Text as="i">No description provided.</Text>
          )}
        </Text>
        {tableColsEntryId !== -1 && (
          <TableColumnSchemaList columns={selected?.__columns} />
        )}
      </CommonModal>
    </>
  );
}

import { Flex, Text, Grid, useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';

import { TableListItem } from '../components/Tables/TableList/TableListItem';
import { tableListGridTempCols, tableListMaxWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/Tables/TableList/TableColumnSchemaList';
import { useTrackOnMount } from '../hooks/useTrackOnMount';
import { EVENTS, SR_TYPE_LABEL } from '../utils/trackEvents';
import { CommonModal } from '../components/Common/CommonModal';
import _ from 'lodash';

export function SRTablesListPage() {
  const modal = useDisclosure();
  const [tableColsEntryId, setTableColsEntryId] = useState(-1);
  const {
    tableColumnsOnly = [],
    assertionsOnly,
    isLegacy,
  } = useReportStore.getState();

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'table-list-page',
    },
  });

  const tableColumnsSorted = _.sortBy(
    tableColumnsOnly,
    ([, { base, target }]) => {
      const fallback = target ?? base;
      return fallback?.__table?.name;
    },
  );

  const selected =
    tableColsEntryId !== -1
      ? tableColumnsSorted[tableColsEntryId][1].base
      : undefined;

  return (
    <>
      <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
        Tables
      </Text>

      <Flex direction="column" width={'100%'} minHeight="650px">
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
            <TableListItem
              key={i}
              combinedAssertions={assertionsOnly}
              combinedTableEntry={tableColsEntry}
              singleOnly
              onInfoClick={() => {
                setTableColsEntryId(i);
                modal.onOpen();
              }}
            />
          );
        })}
      </Flex>

      <CommonModal
        {...modal}
        size="2xl"
        title={selected?.__table?.name ?? 'No title'}
        onClose={() => {
          setTableColsEntryId(-1);
          modal.onClose();
        }}
      >
        <Text fontSize="lg" mb={4}>
          Description:{' '}
          {selected?.description || (
            <Text as="i">No description provided.</Text>
          )}
        </Text>
        {tableColsEntryId !== -1 && (
          <TableColumnSchemaList singleOnly columns={selected?.__columns} />
        )}
      </CommonModal>
    </>
  );
}

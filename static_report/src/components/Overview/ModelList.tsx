import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  TableContainer,
  Table,
  TableCaption,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Link as ChakraLink,
  Text,
  Icon,
  Tooltip,
  Flex,
  Box,
  VStack,
  HStack,
  Button,
  Checkbox,
  Divider,
  Menu,
  MenuButton,
  MenuGroup,
  MenuList,
  MenuItem,
  Spacer,
  IconButton,
} from '@chakra-ui/react';
import { ReactNode, useState } from 'react';
import { BsFilter } from 'react-icons/bs';
import { FaSortAlphaDown, FaSortNumericDown, FaFilter } from 'react-icons/fa';
import { FiInfo } from 'react-icons/fi';
import { Link } from 'wouter';
import { useReportStore } from '../../utils/store';
import { SearchTextInput } from '../Common/SearchTextInput';
import {
  IconAdded,
  getIconForChangeStatus,
  IconModified,
  IconRemoved,
} from '../Icons';
import { getStatDiff } from '../LineageGraph/util';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';
import StatDiff from '../Widgets/StatDiff';

function SummaryText({
  name,
  value,
  tip,
}: {
  name: string;
  value: ReactNode;
  tip?: ReactNode;
}) {
  return (
    <VStack alignItems="flex-start">
      <Text fontSize="sm" color="gray">
        {name}
        {tip && (
          <Tooltip label={tip}>
            <Box display="inline-block">
              <Icon mx={'2px'} as={FiInfo} boxSize={3} />
            </Box>
          </Tooltip>
        )}
      </Text>
      <Text fontSize="l">{value}</Text>
    </VStack>
  );
}

const SelectMenu = () => {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<BsFilter />}
        size="md"
        variant="outline"
      />
      <MenuList minWidth="240px">
        <MenuGroup title="Options">
          <MenuItem>
            <Checkbox>Change only</Checkbox>
          </MenuItem>
          <MenuItem>
            <Checkbox isIndeterminate={true}>All nodes</Checkbox>
          </MenuItem>
          <Divider />
          <MenuItem>
            <Checkbox>Added</Checkbox>
          </MenuItem>
          <MenuItem>
            <Checkbox>Removed</Checkbox>
          </MenuItem>
          <MenuItem>
            <Checkbox>Modified</Checkbox>
          </MenuItem>
          <MenuItem>
            <Checkbox>Implicit</Checkbox>
          </MenuItem>
          <MenuItem>
            <Checkbox>No Change</Checkbox>
          </MenuItem>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

export function ModelList() {
  const { tableColumnsOnly = [] } = useReportStore.getState();
  const [sortMethod, setSortMethod] = useState('alphabetical');
  const handleSortChange = () => {
    if (sortMethod === 'alphabetical') {
      setSortMethod('topology');
    } else {
      setSortMethod('alphabetical');
    }
  };

  return (
    <>
      <HStack spacing={10}>
        <SummaryText name="Total" value={3} />
        &nbsp;&nbsp;&nbsp;
        <SummaryText
          name="Explicit Changes"
          value={
            <>
              2 <ChangeStatusWidget added={1} modified={1} />{' '}
            </>
          }
          tip="Code change or config change"
        />
        &nbsp;&nbsp;&nbsp;
        <SummaryText
          name="Impacted"
          value={3}
          tip="Explicit changes and their downstream"
        />
        &nbsp;&nbsp;&nbsp;
        <SummaryText
          name="Implicit Changes"
          value={2}
          tip="Any detected changes which are not explicit changed"
        />
      </HStack>
      <Flex alignContent="stretch" gap={3} my={2}>
        <SearchTextInput onChange={() => {}} placeholder={'Search models'} />
        <SelectMenu />
      </Flex>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th p={0}></Th>
              <Th>
                Name{' '}
                <IconButton
                  aria-label="Sort"
                  icon={
                    sortMethod === 'alphabetical' ? (
                      <FaSortAlphaDown />
                    ) : (
                      <FaSortNumericDown />
                    )
                  }
                  onClick={handleSortChange}
                  size="sm"
                  ml="1"
                />
              </Th>
              <Th>Columns</Th>
              <Th isNumeric>Rows</Th>
              <Th isNumeric>Execution Time</Th>
              <Th isNumeric>Failed Tests</Th>
              <Th isNumeric>Total Tests</Th>
            </Tr>
          </Thead>
          <Tbody>
            {tableColumnsOnly.map((tableColsEntry, i) => {
              const [key, { base, target }, metadata] = tableColsEntry;
              const fallback = base ?? target;
              if (fallback?.resource_type !== 'model') {
                return;
              }

              if (!metadata.changeStatus) {
                return <></>;
              }

              const { icon, color } = getIconForChangeStatus(
                metadata.changeStatus,
              );

              return (
                <Tr>
                  <Td p={0}>{icon && <Icon color={color} as={icon} />}</Td>
                  <Td>
                    <Link href={`/models/${fallback.unique_id}`}>
                      {fallback.name}
                    </Link>
                  </Td>
                  <Td>
                    {`${Object.keys(fallback?.columns || {}).length}`}
                    <Text as="span" fontSize="sm">
                      <ChangeStatusWidget
                        added={metadata.added}
                        removed={metadata.deleted}
                        modified={metadata.changed}
                      />
                    </Text>
                  </Td>
                  <Td>
                    <StatDiff base={base} target={target} stat="row_count" />
                  </Td>
                  <Td>
                    <StatDiff
                      base={base}
                      target={target}
                      stat="execution_time"
                      reverseColor
                    />
                  </Td>
                  <Td>
                    <StatDiff
                      base={base}
                      target={target}
                      stat="failed_test"
                      reverseColor
                    />
                  </Td>
                  <Td>
                    <StatDiff base={base} target={target} stat="all_test" />
                  </Td>
                  <Td></Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

import { Divider, Text, Box, Link } from '@chakra-ui/react';
import { SaferTableSchema } from '../../types';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { transformTableAsFlatStackInput } from '../Tables/utils';
import { DupedTableRowStats } from '../Tables/TableMetrics/DupedTableRowStats';

interface Props {
  hasAnimation?: boolean;
  tableDatum?: SaferTableSchema;
}
export function DupedTableRowsWidget({ tableDatum, hasAnimation }: Props) {
  const dataCompInput = transformTableAsFlatStackInput(tableDatum);
  const animationOptions = hasAnimation ? {} : false;

  return (
    <Box w={'100%'}>
      <Text fontSize={'xl'}>Duplicate Rows</Text>
      <Divider my={1} />
      {dataCompInput ? (
        <>
          <Box height={'2em'}>
            <FlatStackedBarChart
              data={dataCompInput}
              animation={animationOptions}
            />
          </Box>
          <Box>
            <DupedTableRowStats tableDatum={tableDatum} />
          </Box>
        </>
      ) : (
        <Box h={'300px'}>
          {renderChartUnavailableMsg({
            messageOverwrite: (
              <Text as={'span'}>
                Configuration disabled. To enable, see{' '}
                <Link
                  isExternal
                  textDecoration={'underline'}
                  href="https://docs.piperider.io/project-structure/config.yml"
                >
                  config docs
                </Link>
              </Text>
            ),
          })}
        </Box>
      )}
    </Box>
  );
}

import { Divider, Text, Box, Link } from '@chakra-ui/react';
import { Comparable, SaferTableSchema } from '../../../types';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { transformTableAsFlatStackInput } from '../Tables/utils';
import { DupedTableRowStats } from '../Tables/TableMetrics/DupedTableRowStats';

interface Props extends Comparable {
  hasAnimation?: boolean;
  tableDatum?: SaferTableSchema;
}
export function DupedTableRowsWidget({
  tableDatum,
  hasAnimation,
  singleOnly,
}: Props) {
  const dataCompInput = transformTableAsFlatStackInput(tableDatum);
  const animationOptions = hasAnimation ? {} : false;
  if (dataCompInput) {
    return (
      <Box mb={6}>
        <Text fontSize={'xl'}>Data Composition</Text>
        <Divider my={3} />
        <Box height={'55px'}>
          <FlatStackedBarChart
            data={dataCompInput}
            animation={animationOptions}
          />
        </Box>
        <Box mt={6}>
          <DupedTableRowStats tableDatum={tableDatum} width={'100%'} />
        </Box>
      </Box>
    );
  }
  return (
    <>
      {renderChartUnavailableMsg({
        messageOverwrite: (
          <Text>
            Configuration disabled. To enable, see{' '}
            <Link
              textDecoration={'underline'}
              href="https://docs.piperider.io/project-structure/config.yml"
            >
              config docs
            </Link>
          </Text>
        ),
      })}
    </>
  );
}

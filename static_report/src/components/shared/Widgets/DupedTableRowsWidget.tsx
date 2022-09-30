import { Divider, Text, Box, Link } from '@chakra-ui/react';
import { SaferTableSchema } from '../../../types';
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

  if (dataCompInput) {
    return (
      <Box mb={6}>
        <Text fontSize={'xl'}>Duplicate Rows</Text>
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
    <Box h={'300px'}>
      {renderChartUnavailableMsg({
        messageOverwrite: (
          <Text as={'span'}>
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
    </Box>
  );
}

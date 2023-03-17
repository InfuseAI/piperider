import { Text, Box, Link } from '@chakra-ui/react';
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

  if (!tableDatum) {
    return <Box h={'100px'}>{renderChartUnavailableMsg({})}</Box>;
  }

  if (!dataCompInput) {
    return (
      <Box h={'100px'}>
        {renderChartUnavailableMsg({
          messageOverwrite: (
            <Text as={'span'}>
              Duplicate rows is not enabled by default. To enable, see{' '}
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
    );
  }

  return (
    <Box w={'100%'}>
      <Box height={'2em'}>
        <FlatStackedBarChart
          data={dataCompInput}
          animation={animationOptions}
        />
      </Box>
      <Box>
        <DupedTableRowStats tableDatum={tableDatum} />
      </Box>
    </Box>
  );
}

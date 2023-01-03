import { InfoIcon } from '@chakra-ui/icons';
import { Box, Flex, Icon, Select, Tag, Text, Tooltip } from '@chakra-ui/react';
import { TimeUnit } from 'chart.js';
import { useState } from 'react';
import {
  BMChartTypes,
  Comparable,
  ComparableData,
  BusinessMetric,
  getChartUnavailMsg,
} from '../../lib';
import { BMBarChart } from '../Charts/BMBarChart';
import { BMLineChart } from '../Charts/BMLineChart';

interface Props extends Comparable {
  data: ComparableData<BusinessMetric>;
}
/**
 * A Widget container for displaying BM Charts (line).
 */
export function BMWidget({ data: { base, target }, singleOnly }: Props) {
  const [selectedBMChartType, setSelectedBMChartType] =
    useState<BMChartTypes>('line');
  //TODO: Await Dimension Impl.
  const chartViewOpts: { type: BMChartTypes; displayName: string }[] = [
    { type: 'line', displayName: 'Line Chart' },
    // 'stacked-line',
    // 'x-bar',
    { type: 'y-bar', displayName: 'Bar Chart' },
    // 'stacked-x-bar',
    // 'stacked-y-bar',
  ];

  //shared timeGrain selection + options (SR+CR+Dimensions)
  const fallbackBMData = target || base;
  const timeGrain = fallbackBMData?.grain;
  const dateRangeStartEnd = [
    fallbackBMData?.data[0][0],
    fallbackBMData?.data[0].slice(-1),
  ].map((v) => String(v));

  return (
    <Box p={3}>
      <Box pb={3}>
        <Flex
          className="widget-header"
          alignItems={'center'}
          gap={2}
          mb={2}
          justifyContent={'space-between'}
        >
          <Flex alignItems={'center'} gap={2}>
            <Tag colorScheme={'blue'} variant={'subtle'} fontWeight={'medium'}>
              {fallbackBMData?.label}
            </Tag>
            <Tooltip
              shouldWrapChildren
              label={fallbackBMData?.description}
              placement={'right'}
            >
              <Icon as={InfoIcon} />
            </Tooltip>
          </Flex>
          <Select
            w={'initial'}
            size={'sm'}
            value={selectedBMChartType}
            onChange={(evt) =>
              setSelectedBMChartType(evt.currentTarget.value as BMChartTypes)
            }
          >
            {chartViewOpts.map((v) => (
              <option key={v.type} value={v.type}>
                {v.displayName}
              </option>
            ))}
          </Select>
        </Flex>
        <Flex>
          <Text color={'gray.500'} fontSize={'sm'}>
            from {dateRangeStartEnd[0]} to {dateRangeStartEnd[1]}
          </Text>
        </Flex>
      </Box>
      <Flex h={'300px'} w={'100%'}>
        {_getBMChart({
          selectedBMChartType,
          comparableBMData: { base, target },
          singleOnly,
          timeGrain,
        })}
      </Flex>
    </Box>
  );
}

/**
 * gets the Business Metric chart for the selected type
 * NOTE: exporting from utils will cause circular dep breakage
 */
function _getBMChart({
  selectedBMChartType,
  singleOnly,
  timeGrain,
  comparableBMData,
}: {
  selectedBMChartType: BMChartTypes;
  timeGrain?: string | null;
  singleOnly?: boolean;
  comparableBMData?: ComparableData<BusinessMetric>;
}) {
  const { base, target } = comparableBMData ?? {};
  // Determines the datasets shown by BM*Chart
  // TODO: (later: dimensions; dimension+cr??)
  const bmGroupList = singleOnly ? [base] : [base, target];

  // if no dimensions, treat w/ sr+cr split
  if (selectedBMChartType === 'line') {
    return <BMLineChart data={bmGroupList} timeGrain={timeGrain as TimeUnit} />;
  }
  if (selectedBMChartType === 'stacked-line') {
    return (
      <BMLineChart
        data={bmGroupList}
        timeGrain={timeGrain as TimeUnit}
        fill
        stacked
      />
    );
  }
  if (selectedBMChartType === 'y-bar') {
    return <BMBarChart data={bmGroupList} />;
  }
  if (selectedBMChartType === 'stacked-y-bar') {
    return <BMBarChart data={bmGroupList} stacked />;
  }
  if (selectedBMChartType === 'x-bar') {
    return <BMBarChart data={bmGroupList} isHorizontal />;
  }
  if (selectedBMChartType === 'stacked-x-bar') {
    return <BMBarChart data={bmGroupList} stacked isHorizontal />;
  }
  return getChartUnavailMsg();
}

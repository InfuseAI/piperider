import {
  ChartOptions,
  Chart as ChartJS,
  BarElement,
  Tooltip,
  ChartData,
  ScaleOptionsByType,
  CartesianScaleTypeRegistry,
  TimeSeriesScale,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { ColumnSchema, Histogram } from '../../../sdlc/single-report-schema';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
} from '../../../utils/formatters';
import {
  DATE_RANGE,
  TEXTLENGTH,
  VALUE_RANGE,
} from '../ColumnCard/ColumnTypeDetail/constants';

import 'chartjs-adapter-date-fns';
import { DeepPartial } from 'chart.js/types/utils';

ChartJS.register(
  TimeSeriesScale,
  LinearScale,
  CategoryScale,
  BarElement,
  Tooltip,
);
/**
 * Histogram Chart that can display generic data types such as Numeric, Datetime, Integer
 * X: The Min/Max of the labels range is the scaled width of charting area
 * Y: The Min/Max of the counts range is the scaled height of charting area
 * Counts: Abbreviated based on K, Mn, Bn, Tr (see formatters)
 */
//Note: min/max represents the bin edge min/max
type Props = {
  data: Pick<ColumnSchema, 'total' | 'type' | 'histogram' | 'min' | 'max'>;
};
export function HistogramChart({
  data: { histogram, type, total, min, max },
}: Props) {
  const { counts, bin_edges } = histogram as Histogram;
  const isDatetime = type === 'datetime';

  // Time series (x,y) plot when type is datetime, else category series (bin_edges[i], counts)
  const newData = isDatetime
    ? counts.map((v, i) => ({ x: bin_edges[i], y: v }))
    : counts;

  // pre-mapping since tick.callback is slow
  const newLabels = bin_edges.map((v) => formatAsAbbreviatedNumber(v));
  const newYTicks = counts.map((v) => formatAsAbbreviatedNumber(v));

  //swap x-scale when histogram is datetime
  const xScaleBase: DeepPartial<
    ScaleOptionsByType<keyof CartesianScaleTypeRegistry>
  > = isDatetime
    ? {
        type: 'timeseries', // each datum is spread w/ equal distance
        min,
        max,
        adapters: {
          date: {},
        },
        time: {
          minUnit: 'day',
        },
        bounds: 'data',
        grid: { display: false },
        ticks: {
          minRotation: 30,
          maxRotation: 30,
        },
      }
    : {
        type: 'category',
        min,
        max,
        offset: false, // offsets against `x2` abstract axis (not visible)
        grid: { display: false },
        ticks: {
          minRotation: 0,
          maxRotation: 0,
        },
      };
  const yScaleBase: DeepPartial<
    ScaleOptionsByType<keyof CartesianScaleTypeRegistry>
  > = {
    beginAtZero: true,
    min: Math.min(...counts),
    max: Math.max(...counts),
    grid: {
      color: 'lightgray',
      borderDash: [2, 2],
    },
    ticks: {
      callback: function (val, index) {
        //slow, but necessary since chart-data is a number and can be hard to display
        return newYTicks[index];
      },
    },
  };
  // For aligning category type (non-datetime) only -- not visible
  const xScaleCategoryAxis: DeepPartial<
    ScaleOptionsByType<keyof CartesianScaleTypeRegistry>
  > = {
    display: false,
    max: bin_edges.length - 1, //based on number of categories, not value!
    position: 'bottom',
    grid: { display: true },
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          title([{ dataIndex }]) {
            const result = formatDisplayedBinItem(bin_edges, dataIndex);
            const percentOfTotal = formatIntervalMinMax(
              counts[dataIndex] / (total as number), //total is always given (schema should make required)
            );

            const prefix = isDatetime
              ? DATE_RANGE
              : type === 'string'
              ? TEXTLENGTH
              : VALUE_RANGE;

            return `${prefix}: ${result}\n(${percentOfTotal})`;
          },
        },
      },
    },
    scales: {
      x2: xScaleCategoryAxis,
      x: xScaleBase,
      y: yScaleBase,
    },
  };

  // Histograms are a mix between bar and scatter options (union)
  // uses cartesian x,y coordinates to plot and infer labels
  const chartData: ChartData<'bar' | 'scatter'> = {
    labels: newLabels || bin_edges,
    datasets: [
      {
        data: newData as any, //infer `any` to allow datestring
        backgroundColor: '#63B3ED',
        borderColor: '#4299E1',
        hoverBackgroundColor: '#002A53',
        borderWidth: 1,
        categoryPercentage: 1, // tells bar to fill "bin area"
        barPercentage: 1, //tells bar to fill "bar area"
        xAxisID: isDatetime ? 'x' : 'x2', // non-datetime is treated as category type, so requires diff axis alignments
      },
    ],
  };

  //infer `any` to allow for union data configurations & options
  return <Chart type="bar" options={chartOptions} data={chartData as any} />;
}

/**
 * @returns a formatted, abbreviated, histogram bin display text
 */
function formatDisplayedBinItem(
  binEdges: Histogram['bin_edges'],
  currentIndex: number,
) {
  const startEdge = binEdges[currentIndex];
  const endEdge = binEdges[currentIndex + 1];

  const formattedStart = formatAsAbbreviatedNumber(startEdge);
  const formattedEnd = formatAsAbbreviatedNumber(endEdge);

  const result = `${formattedStart} - ${formattedEnd}`;
  return result;
}

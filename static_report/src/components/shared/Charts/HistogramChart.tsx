import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ColumnSchema, Histogram } from '../../../sdlc/single-report-schema';
import { formatAsAbbreviatedNumber } from '../../../utils/formatters';
import {
  DATE_RANGE,
  TEXTLENGTH,
  VALUE_RANGE,
} from '../ColumnCard/ColumnTypeDetail/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
// FIXME: Tooltip hover mode should trigger selected bar as 'Active'

/**
 * Histogram Chart that can display generic data types such as Numeric, Datetime, Integer
 * Should handle columns that don't have `histogram` property (TBD)
 * X: The Min/Max of the labels range is the scaled width of charting area
 * Y: The Min/Max of the counts range is the scaled height of charting area
 * Counts: Abbreviated based on K, Mn, Bn, Tr (see formatters)
 * Guides: horizontal dashed lines, at the 30/60/90 percentile
 */
interface Props {
  data: Histogram;
  type: ColumnSchema['type'];
}
export function HistogramChart({ data, type }: Props) {
  const { counts, bin_edges } = data;

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          title([{ dataIndex }]) {
            const result = formatDisplayedBinItem(bin_edges, dataIndex);
            const prefix =
              type === 'datetime'
                ? DATE_RANGE
                : type === 'string'
                ? TEXTLENGTH
                : VALUE_RANGE;

            return `${prefix}: ${result}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: false,
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          format: { maximumFractionDigits: 2 },
          callback: function (val, index, ticks) {
            // val is an chartjs indexObject, not actual index's value; thus using original bin_edges
            const delimiter = ' - ';
            if (index === ticks.length) return null;
            const result = formatDisplayedBinItem(bin_edges, index).split(
              delimiter,
            );
            result.splice(1, 0, delimiter);

            const isStartOrEnd = index === 0 || index === ticks.length - 1;

            //preserve all gridline items by defaulting empty-string
            return isStartOrEnd ? result : '';
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'lightgray',
          borderDash: [2, 2],
        },
        ticks: {
          callback: function (val) {
            return formatAsAbbreviatedNumber(val);
          },
        },
      },
    },
  };

  // defaults to `category` type, as `bin edges` are used as-is.
  // this means that the x-axis ticks are explicitly provided, not inferred or automatically spread over the chart area.
  const chartData: ChartData<'bar'> = {
    labels: bin_edges.slice(0, -1), //offset final edge
    datasets: [
      {
        data: counts,
        backgroundColor: '#63B3ED',
        borderColor: '#4299E1',
        hoverBackgroundColor: '#002A53',
        borderWidth: 1,
        categoryPercentage: 1, // tells bar to fill "bin area"
        barPercentage: 1, //tells bar to fill "bar area"
      },
    ],
  };

  return <Bar options={chartOptions} data={chartData} />;
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

import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  ArcElement,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { formatIntervalMinMax, formatNumber } from '../../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);
interface Props {
  data: {
    labels: string[];
    counts: number[];
    ratios: number[];
  };
}
/**
 * A pie chart that visualizes boolean dataset
 * composition: null + invalid + trues + falses = 100%
 * @param data the counts labels & values
 * @returns
 */
export function BooleanPieChart({ data: { counts, labels, ratios } }: Props) {
  const chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 10,
    },
    plugins: {
      legend: {
        position: 'left',
        labels: {
          textAlign: 'left',
          boxHeight: 15,
          boxWidth: 15,
          generateLabels({ data: { datasets, labels } }) {
            return datasets[0].data.map((data, i) => ({
              text: `${labels?.[i]} \n ${formatIntervalMinMax(
                ratios[i],
              )} / ${data}`,
              fillStyle: datasets?.[0]?.backgroundColor?.[i],
            }));
          },
        },
      },
    },
  };
  const chartData: ChartData<'pie'> = {
    labels,
    datasets: [
      {
        data: counts,
        borderWidth: 0,
        backgroundColor: ['#63B3ED', '#D9D9D9', '#FF0861', '#FFCF36'],
        hoverOffset: 4,
      },
    ],
  };
  return <Pie data={chartData} options={chartOptions} />;
}

// const enhanceTooltip: Plugin<'pie'> = {
//   beforeRender(chart) {
//     chart.legend?.legendItems?.forEach(label => {

//     })
//   }

// }

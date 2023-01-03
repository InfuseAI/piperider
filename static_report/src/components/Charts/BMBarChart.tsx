import {
  CategoryScale,
  ChartData,
  ChartDataset,
  LinearScale,
  Tooltip,
  Chart as ChartJS,
  ChartOptions,
  BarElement,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BLACK_COLOR, colorMap, DBTBusinessMetricGroupItem } from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: (DBTBusinessMetricGroupItem | undefined)[]; //treat as multiple datasets
  isHorizontal?: boolean;
  stacked?: boolean;
};
export function BMBarChart({ data = [], isHorizontal, stacked }: Props) {
  ChartJS.register(BarElement, LinearScale, CategoryScale, Legend, Tooltip);

  let labelVal;
  const datasets: ChartDataset<'bar'>[] = [];
  //NOTE: colorList (max: up to 6)
  const colorList = [...colorMap.values()];

  // for each BMGroup, map its chart dataset
  data.forEach((d, i) => {
    const { data = [] } = d ?? {};
    const [labels, dataValues = []] = data;

    //NOTE: narrow dependency (first-val: target > base)
    labelVal = labelVal ?? labels;

    const chartXYDataset: ChartDataset<'bar'>['data'] = dataValues.map((v) => {
      const y = Number(v ?? undefined);
      return y;
    });

    datasets.push({
      label: i === 0 ? 'Base' : 'Target',
      data: chartXYDataset,
      borderColor: colorList[i],
      backgroundColor: colorList[i] + '50',
    });
  });

  const chartOpts: ChartOptions<'bar'> = {
    responsive: true,
    // maintainAspectRatio: true,
    indexAxis: isHorizontal ? 'y' : 'x', //makes chart horizontal
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          labelColor: function ({ datasetIndex }) {
            return {
              borderColor: BLACK_COLOR,
              backgroundColor: colorList[datasetIndex],
            };
          },
        },
      },
      legend: {
        // might have to replace to support deselection?
        position: 'bottom',
        labels: {
          padding: 10,
          boxWidth: 30,
          generateLabels({ data: { datasets, labels } }) {
            return datasets.map((ds, i) => ({
              fillStyle: colorList[i],
              text: `${i === 0 ? 'Base' : 'Target'}`,
            }));
          },
        },
      },
    },
    scales: {
      x: { stacked },
      y: {
        stacked,
      },
    },
  };

  const chartData: ChartData<'bar'> = {
    datasets,
    labels: labelVal, //TODO: dimensional cat. labels
  };

  return <Bar data={chartData} options={chartOpts} />;
}

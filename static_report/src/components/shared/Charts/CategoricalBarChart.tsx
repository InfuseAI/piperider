import { border } from '@chakra-ui/styled-system';
import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartData,
  Plugin,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Topk } from '../../../sdlc/single-report-schema';
import { formatAsAbbreviatedNumber } from '../../../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
interface Props {
  data: Topk;
}
/**
 * A horizontal progress bar chart that visualized categorical dataset plotted against each category group
 * @param data the topk value (categorical counts)
 * @returns
 */
export function CategoricalBarChart({ data }: Props) {
  const { counts, values } = data;

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    plugins: {
      tooltip: {
        mode: 'y',
        position: 'nearest',
        intersect: false,
      },
    },
  };
  const barPercentage = 0.6;
  const categoryPercentage = 0.5;
  const borderRadius = 24;
  const chartData: ChartData<'bar'> = {
    labels: values,
    datasets: [
      {
        indexAxis: 'y',
        data: counts,
        backgroundColor: '#63B3ED',
        hoverBackgroundColor: '#002A53',
        borderWidth: 0,
        borderColor: '#D9D9D9',
        borderRadius,
        borderSkipped: false,
        barPercentage,
        categoryPercentage,
      },
    ],
  };
  const progressBar: Plugin<'bar'> = {
    id: 'progressBar',
    beforeDatasetDraw({
      ctx,
      data,
      chartArea: { top, left, right, width, height },
      scales: { x, y },
    }) {
      ctx.save();
      const dataset = data.datasets[0];
      const fontColor = '#36454f';
      const fontSize = 14;
      const offsetY = 8;
      const barHeight =
        (height / y.ticks.length) * barPercentage * categoryPercentage;

      dataset.data.forEach((datum, index) => {
        // draw custom label value text
        const rawValue = dataset.data[index];
        const yPos = y.getPixelForValue(index);
        const barTopLabelYPos = yPos - fontSize - offsetY;
        const value =
          typeof rawValue !== 'number'
            ? rawValue
            : formatAsAbbreviatedNumber(rawValue);
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(value), right, barTopLabelYPos);

        // draw custom label title text
        const rawTitle = data.labels?.[index];
        const title =
          typeof rawTitle !== 'number'
            ? rawTitle
            : formatAsAbbreviatedNumber(rawTitle);
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(title), left, barTopLabelYPos);

        // draw custom progress bar backdrop
        const barTopYPos = yPos - barHeight / 2;
        const barBottomYPos = yPos + barHeight / 2;
        const drawRadius = borderRadius / 2;
        ctx.beginPath();
        //start top-left shoulder
        ctx.moveTo(left + drawRadius, barTopYPos);
        // to top-right shoulder
        ctx.lineTo(right - drawRadius, barTopYPos);
        // top-right arc to middle edge
        ctx.arcTo(
          right,
          barTopYPos,
          right,
          barTopYPos + drawRadius,
          drawRadius,
        );
        // bottom-right arc to bottom shoulder
        ctx.arcTo(
          right,
          barBottomYPos,
          right - drawRadius,
          barBottomYPos,
          drawRadius,
        );
        // to top-left shoulder
        ctx.lineTo(left + drawRadius, barBottomYPos);
        ctx.arcTo(
          left,
          barBottomYPos,
          left,
          barBottomYPos - drawRadius,
          drawRadius,
        );
        ctx.arcTo(left, barTopYPos, left + drawRadius, barTopYPos, drawRadius);
        // ctx.fillRect(left, yPos - barHeight / 2, width, barHeight);
        ctx.fillStyle = String(dataset.borderColor);
        ctx.closePath();
        ctx.fill();
      });
    },
  };
  return (
    <Bar data={chartData} options={chartOptions} plugins={[progressBar]} />
  );
}

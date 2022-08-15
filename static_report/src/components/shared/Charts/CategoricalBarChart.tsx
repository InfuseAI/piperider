import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  BarElement,
  Tooltip,
  ChartData,
  Plugin,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Topk } from '../../../sdlc/single-report-schema';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
  formatTruncateString,
} from '../../../utils/formatters';

ChartJS.register(CategoryScale, BarElement, Tooltip);
/**
 * A horizontal progress bar chart that visualizes categorical dataset, plotted 1:1 to each category group
 */
interface Props {
  data: Topk;
  total: number;
}
export function CategoricalBarChart({
  data: { counts, values },
  total,
}: Props) {
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
        callbacks: {
          title([{ dataIndex, dataset }]) {
            const result = dataset.data[dataIndex];
            const percentOfTotal = formatIntervalMinMax(
              counts[dataIndex] / total,
            );

            return `${result}\n(${percentOfTotal})`;
          },
        },
      },
    },
  };
  const barPercentage = 0.6;
  const categoryPercentage = 0.5;
  const borderRadius = 10;
  const chartData: ChartData<'bar'> = {
    labels: values.slice(0, 5), // showing top cats
    datasets: [
      {
        indexAxis: 'y',
        data: counts.slice(0, 5), // showing top cats
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
      chartArea: { left, right, height },
      scales: { y },
    }) {
      ctx.save();
      const dataset = data.datasets[0];
      const fontColor = '#36454f';
      const fontSize = 14;
      const barHeight =
        (height / y.ticks.length) * barPercentage * categoryPercentage;

      const radiusOffset = dataset.data.length < 5 ? 5 : 0;
      dataset.data.forEach((datum, index) => {
        const yPos = y.getPixelForValue(index);
        const barTopYPos = yPos - barHeight / 2;
        const barBottomYPos = yPos + barHeight / 2;
        const barTopLabelYPos = barTopYPos - fontSize / 2;
        const drawRadius = radiusOffset + borderRadius / 2;

        // draw custom label value text
        const rawValue = dataset.data[index];
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
        ctx.fillText(
          formatTruncateString(String(title), 50),
          left,
          barTopLabelYPos,
        );

        // draw custom progress bar backdrop
        drawRoundedBarBackdrop(ctx, {
          leftBound: left,
          rightBound: right,
          barTopYPos,
          barBottomYPos,
          drawRadius,
          fillColor: String(dataset.borderColor),
        });
      });
    },
  };
  return (
    <Bar data={chartData} options={chartOptions} plugins={[progressBar]} />
  );
}

interface DrawRoundedArgs {
  leftBound: number;
  rightBound: number;
  barTopYPos: number;
  barBottomYPos: number;
  drawRadius: number;
  fillColor: string;
}
function drawRoundedBarBackdrop(
  ctx: CanvasRenderingContext2D,
  {
    leftBound,
    rightBound,
    drawRadius,
    barBottomYPos,
    barTopYPos,
    fillColor,
  }: DrawRoundedArgs,
) {
  ctx.beginPath();
  //start top-left shoulder
  ctx.moveTo(leftBound + drawRadius, barTopYPos);
  // to top-right shoulder
  ctx.lineTo(rightBound - drawRadius, barTopYPos);
  // top-right arc to middle edge
  ctx.arcTo(
    rightBound,
    barTopYPos,
    rightBound,
    barTopYPos + drawRadius,
    drawRadius,
  );
  // bottom-right arc to bottom shoulder
  ctx.arcTo(
    rightBound,
    barBottomYPos,
    rightBound - drawRadius,
    barBottomYPos,
    drawRadius,
  );
  // to top-left shoulder
  ctx.lineTo(leftBound + drawRadius, barBottomYPos);
  ctx.arcTo(
    leftBound,
    barBottomYPos,
    leftBound,
    barBottomYPos - drawRadius,
    drawRadius,
  );
  ctx.arcTo(
    leftBound,
    barTopYPos,
    leftBound + drawRadius,
    barTopYPos,
    drawRadius,
  );
  ctx.fillStyle = fillColor;
  ctx.closePath();
  ctx.fill();
}

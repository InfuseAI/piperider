import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { appleStock } from '@visx/mock-data';
import { scaleLinear, scaleBand } from '@visx/scale';
import useMeasure from 'react-use-measure';
import { ColumnSchema, Histogram } from '../../../sdlc/single-report-schema';
import { AxisBottom, AxisLeft } from '@visx/axis';

// TODO: Tooltip, Responsive
// TODO: Replace SRBarChart (gradually)

/**
 * Histogram Chart that can display generic data types such as Numeric, Datetime, Integer
 * Should handle columns that don't have `histogram` property (TBD)
 * X: The Min/Max of the domain data range is the width of charting area
 * Y: The Min/Max of the domain data range is the height of charting area
 * counts: Abbreviated based on K, Mn, Bn, Tr (see formatters)
 * Guides: horizontal dashed lines, at the 30/60/90 percentile
 */
interface Props {
  data: ColumnSchema;
}
export function HistogramChart({ data }: Props) {
  const margins = 36;
  //margins
  //w+h
  const defaultWidth = 330;
  const defaultHeight = 300;
  const [ref, bounds] = useMeasure();

  const width = bounds.width || defaultWidth;
  const height = bounds.height || defaultHeight;

  // const innerWidth = width - margins;
  // const innerHeight = height - margins;

  //create scales
  const getXValues = (d?: Histogram) =>
    (d?.bin_edges || []).map((labelItem) => Number(labelItem));
  const getYValues = (d?: Histogram) =>
    (d?.counts || []).map((countItem) => Number(countItem));

  const xValues = getXValues(data.histogram);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xScale = scaleLinear<number>({
    domain: [xMin, xMax],
    range: [0, width],
  });

  const yValues = getYValues(data.histogram);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yScale = scaleLinear<number>({
    range: [height - margins, 0], // y scales top-to-bottom
    domain: [yMin - 1, yMax + 1], //plot min, max
  });

  // console.log(data.histogram?.bin_edges, [xMin, xMax]);

  // viewBox allows charts to respond to changes in use-measure's bounds
  return (
    <svg
      ref={ref}
      height="100%"
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
    >
      <Group>Bar</Group>
      <Group>{/* <AxisLeft left={margins} scale={yScale} /> */}</Group>
      <Group>
        <AxisBottom top={height - margins} scale={xScale} />
      </Group>
    </svg>
  );
}

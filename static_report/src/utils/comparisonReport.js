import * as d3 from 'd3';
import {
  getChartTooltip,
  getReportAsserationStatusCounts,
  formatNumber,
} from './';

export function drawComparsionChart({
  containerWidth,
  svgTarget,
  tooltipTarget,
  data,
}) {
  const margin = { top: 10, right: 30, bottom: 30, left: 55 };
  const width = containerWidth - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  const svgEl = d3.select(svgTarget);
  svgEl.selectAll('*').remove();

  const svg = svgEl
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = getChartTooltip({ target: tooltipTarget });

  function onShowTooltip(event, d) {
    tooltip
      .html(
        `
        <div>
          <p>Label: ${d.label}</p>
          <p>Count: ${formatNumber(d.value)}</p>
        </div>
      `,
      )
      .transition()
      .duration(500)
      .style('visibility', 'visible');
  }

  function onMoveTooltip(event) {
    tooltip
      .style('top', `${event.pageY - 10}px`)
      .style('left', `${event.pageX + 10}px`);
  }

  function onHideTooltip() {
    tooltip.html('').transition().duration(500).style('visibility', 'hidden');
  }

  const groups = d3.map(data, ({ label }) => label);
  const x = d3.scaleBand().domain(groups).range([0, width]).padding(0.3);

  svg
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3.axisBottom(x).tickFormat((value, i) => {
        const xAxisItemLength = x.domain().length - 1;

        if (i === 0 || i === xAxisItemLength / 2 || i === xAxisItemLength) {
          return value;
        }
        return null;
      }),
    );

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, ({ base, input }) => Math.max(base, input))])
    .range([height, 0]);
  svg.append('g').call(d3.axisLeft(y));

  const xSubGroup = d3
    .scaleBand()
    .domain(['base', 'input'])
    .range([0, x.bandwidth()])
    .padding(0.05);

  const color = d3
    .scaleOrdinal()
    .domain(['base', 'input'])
    .range(['var(--chakra-colors-blue-100)', 'var(--chakra-colors-blue-300)']);

  svg
    .append('g')
    .selectAll('g')
    .data(data)
    .join('g')
    .attr('transform', (d) => `translate(${x(d.label)}, 0)`)
    .selectAll('rect')
    .data(function (d) {
      return ['base', 'input'].map(function (key) {
        return { label: d.label, key: key, value: d[key] };
      });
    })
    .join('rect')
    .attr('x', (d) => xSubGroup(d.key))
    .attr('y', (d) => y(d.value))
    .attr('width', xSubGroup.bandwidth())
    .attr('height', (d) => height - y(d.value))
    .attr('fill', (d) => color(d.key))
    .on('mouseover', onShowTooltip)
    .on('mousemove', onMoveTooltip)
    .on('mouseout', onHideTooltip);
}

export function joinBykey(base = {}, input = {}) {
  const result = {};

  Object.entries(base).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }

    result[key]['base'] = value;
  });

  Object.entries(input).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['input'] = value;
  });

  return result;
}

export function getComparisonTests(assertion, from) {
  const { passed, failed } = getReportAsserationStatusCounts(assertion);

  const table = assertion.tests.map((test) => ({
    ...test,
    level: 'Table',
    column: '-',
    from,
  }));

  const columns = Object.keys(assertion.columns).map((column) => {
    const columnAssertion = assertion.columns[column];
    return columnAssertion.map((test) => ({
      ...test,
      level: 'Column',
      column,
      from,
    }));
  });

  const tests = [...table, ...columns.flat()];

  return {
    passed,
    failed,
    tests,
  };
}

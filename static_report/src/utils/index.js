import * as d3 from 'd3';

const tooltipDefaultStyle = {
  paddingTop: 'var(--chakra-space-2)',
  paddingBottom: 'var(--chakra-space-2)',
  paddingLeft: 'var(--chakra-space-4)',
  paddingRight: 'var(--chakra-space-4)',
  borderRadius: 'var(--chakra-radii-md)',
  color: 'var(--chakra-colors-white)',
  backgroundColor: 'var(--chakra-colors-blackAlpha-700)',
};

export function getChartTooltip({ target, style }) {
  const tooltip = d3
    .select(target)
    .append('div')
    .style('visibility', 'hidden')
    .style('position', 'absolute')
    .style('z-index', '9')
    .style('padding-top', style?.paddingTop || tooltipDefaultStyle.paddingTop)
    .style(
      'padding-bottom',
      style?.paddingBottom || tooltipDefaultStyle.paddingBottom,
    )
    .style(
      'border-radius',
      style?.borderRadius || tooltipDefaultStyle.borderRadius,
    )
    .style(
      'padding-left',
      style?.paddingLeft || tooltipDefaultStyle.paddingLeft,
    )
    .style(
      'padding-right',
      style?.paddingRight || tooltipDefaultStyle.paddingRight,
    )
    .style('color', style?.color || tooltipDefaultStyle.color)
    .style(
      'background-color',
      style?.backgroundColor || tooltipDefaultStyle.backgroundColor,
    );

  return tooltip;
}

export function getReportAsserationStatusCounts(assertion) {
  if (!assertion) {
    return { passed: 0, failed: 0 };
  }

  const tableStatus = assertion.tests.reduce(
    (acc, curr) => {
      if (curr.status === 'passed') {
        acc.passed += 1;
      } else if (curr.status === 'failed') {
        acc.failed += 1;
      }

      return acc;
    },
    { passed: 0, failed: 0 }
  );

  const columnStatus = Object.keys(assertion.columns).reduce(
    (acc, current) => {
      assertion.columns[current].forEach((item) => {
        if (item.status === 'passed') {
          acc.passed += 1;
        } else if (item.status === 'failed') {
          acc.failed += 1;
        }
      });

      return acc;
    },
    { passed: 0, failed: 0 }
  );

  return {
    passed: tableStatus.passed + columnStatus.passed,
    failed: tableStatus.failed + columnStatus.failed,
  };
}

export function drawComparsionChart({
  containerWidth,
  svgTarget,
  tooltipTarget,
  hideXAxis,
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
          <p>Lable: ${d.label}</p>
          <p>Value: ${d.value}</p>
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

  const groups = d3.map(data, (d) => d.label);

  const x = d3.scaleBand().domain(groups).range([0, width]).padding(0.3);

  if (hideXAxis) {
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(() => ''));
  } else {
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x));
  }

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

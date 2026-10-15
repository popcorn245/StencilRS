import { newSpecPage } from '../../test-utils/spec-page';
import { PopLineChart } from './line-chart';

const series = [
  { key: 'temp', label: 'Temp', color: '#f97316', data: [72, 80, 76], axis: 'left', kind: 'line' },
  { key: 'humidity', label: 'Humidity', color: '#3b82f6', data: [40, 55, 60], axis: 'right', kind: 'line' },
  { key: 'precip', label: 'Precip', color: '#60a5fa', data: [10, 20, 5], axis: 'right', kind: 'area' },
];
const markers = [{ index: 0, icon: 'sunrise' }, { index: 2, icon: 'sunset' }];
const bands = [{ from: 1, to: 2 }];

const attr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

describe('pop-line-chart (vertical enhancements)', () => {
  it('renders per-point value labels + dots for the two primary series when showValueLabels', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart orientation="vertical" show-value-labels="true" left-unit="°" right-unit="%" vb-width="140" series="${attr(series)}" markers="${attr(markers)}" bands="${attr(bands)}"></pop-line-chart>`,
    });
    // One left-axis line series (temp) + one right-axis line series (humidity) → 3 rows each = 6 labels.
    const vals = page.root.querySelectorAll('.plc__vval');
    expect(vals.length).toBe(6);
    // Units are appended per side.
    const left = page.root.querySelectorAll('.plc__vval--left');
    const right = page.root.querySelectorAll('.plc__vval--right');
    expect(left.length).toBe(3);
    expect(right.length).toBe(3);
    expect(left[0].textContent).toContain('°');
    expect(right[0].textContent).toContain('%');
    // Dots anchor every line-series point (2 line series × 3 points = 6).
    expect(page.root.querySelectorAll('.plc__dot').length).toBe(6);
  });

  it('renders sunrise/sunset markers as row lines + glyphs in vertical mode', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart orientation="vertical" vb-width="140" series="${attr(series)}" markers="${attr(markers)}"></pop-line-chart>`,
    });
    expect(page.root.querySelectorAll('.plc__marker').length).toBe(2);
    const glyphs = Array.from(page.root.querySelectorAll('.plc__marker-label')).map((n) => n.textContent);
    expect(glyphs).toContain('☀');
    expect(glyphs).toContain('☾');
  });

  it('omits value labels + dots when showValueLabels is off (legacy slim strip)', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart orientation="vertical" series="${attr(series)}"></pop-line-chart>`,
    });
    expect(page.root.querySelectorAll('.plc__vval').length).toBe(0);
    expect(page.root.querySelectorAll('.plc__dot').length).toBe(0);
    // Lines still render.
    expect(page.root.querySelectorAll('.plc__line').length).toBe(2);
  });

  it('uses vbWidth for the vertical viewBox so the SVG renders 1:1 (no text distortion)', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart orientation="vertical" vb-width="140" row-height="44" series="${attr(series)}"></pop-line-chart>`,
    });
    const svg = page.root.querySelector('.plc__svg--vertical')!;
    // viewBox width == vbWidth (140); height == count(3) * rowHeight(44) = 132.
    expect(svg.getAttribute('viewBox')).toBe('0 0 140 132');
  });
});

describe('pop-line-chart (bar / refLine / rangeBand — horizontal additions)', () => {
  const bars = [{ key: 'cal', label: 'Calories', color: '#3b82f6', data: [1850, 2100, 1720, 1990], axis: 'left', kind: 'bar' }];
  const line = [{ key: 'weight', label: 'Weight', color: '#3b82f6', data: [155, 153, 150.7], axis: 'left', kind: 'line' }];

  it('renders one bar rect per bar-series point and no line path for a bar series', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart series="${attr(bars)}" ref-lines="${attr([{ value: 2000 }])}"></pop-line-chart>`,
    });
    expect(page.root.querySelectorAll('.plc__bar').length).toBe(4);
    // A bar series must NOT also draw a connecting line.
    expect(page.root.querySelectorAll('.plc__line').length).toBe(0);
    // The goal reference line renders.
    expect(page.root.querySelectorAll('.plc__refline').length).toBe(1);
  });

  it('renders a horizontal goal reference line for a line series', async () => {
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart series="${attr(line)}" ref-lines="${attr([{ value: 148 }])}"></pop-line-chart>`,
    });
    expect(page.root.querySelectorAll('.plc__line').length).toBe(1);
    expect(page.root.querySelectorAll('.plc__refline').length).toBe(1);
  });

  it('renders a shaded value-range band (e.g. glucose normal range)', async () => {
    const glucose = [{ key: 'bg', label: 'BG', color: '#3b82f6', data: [96, 110, 101], axis: 'left', kind: 'line' }];
    const page = await newSpecPage({
      components: [PopLineChart],
      html: `<pop-line-chart series="${attr(glucose)}" range-bands="${attr([{ from: 70, to: 99 }])}"></pop-line-chart>`,
    });
    expect(page.root.querySelectorAll('.plc__rangeband').length).toBe(1);
  });
});

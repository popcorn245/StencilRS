import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Molecules/LineChart',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A dependency-free inline-SVG line chart for small multi-series data ' +
          '(temp / humidity / precipitation) with an optional second y-axis, shaded ' +
          'bands (night), x-axis markers (sunrise/sunset), and a legend. Props accept ' +
          'real arrays/objects or JSON strings.',
      },
    },
  },
};
export default meta;

const temp = [72, 74, 78, 82, 85, 86, 84, 80, 76, 73, 71, 70];
const humidity = [80, 76, 65, 55, 48, 45, 50, 58, 66, 72, 78, 82];
const precip = [10, 10, 20, 30, 15, 5, 5, 20, 40, 30, 20, 10];
const xLabels = ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p', '12a', '2a', '4a'];

const series = JSON.stringify([
  { key: 'temp', label: 'Temp °F', color: '#f97316', data: temp, axis: 'left', kind: 'line' },
  { key: 'hum', label: 'Humidity %', color: '#3b82f6', data: humidity, axis: 'right', kind: 'line' },
  { key: 'precip', label: 'Precip %', color: '#60a5fa', data: precip, axis: 'right', kind: 'area' },
]);
const markers = JSON.stringify([
  { index: 0, icon: 'sunrise' },
  { index: 7, icon: 'sunset' },
]);
const bands = JSON.stringify([{ from: 8, to: 11 }]);

const wrap = (inner: string) =>
  `<div style="width: 360px; padding: 1rem; background: var(--pico-background-color);">${inner}</div>`;

export const DayHourly: StoryObj = {
  name: 'Hourly (temp/humidity/precip + sun)',
  render: () =>
    wrap(
      `<pop-line-chart left-unit="°" right-unit="%" series='${series}' x-labels='${JSON.stringify(xLabels)}' markers='${markers}' bands='${bands}'></pop-line-chart>`,
    ),
};

export const TempOnly: StoryObj = {
  render: () =>
    wrap(
      `<pop-line-chart left-unit="°" series='${JSON.stringify([{ key: 't', label: 'Temp °F', color: '#f97316', data: temp, axis: 'left', kind: 'line' }])}' x-labels='${JSON.stringify(xLabels)}'></pop-line-chart>`,
    ),
};

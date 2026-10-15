export const getAttributes = (props: object) => {
  return Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
};

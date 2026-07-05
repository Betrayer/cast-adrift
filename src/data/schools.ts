export type SchoolId =
  | 'red'
  | 'blue'
  | 'green'
  | 'grey'
  | 'yellow'
  | 'black'
  | 'prismatic';

export interface SchoolColors {
  fill: string;
  stroke: string;
  text: string;
}

export const schools: Record<SchoolId, SchoolColors> = {
  red: { fill: '#2B1214', stroke: '#E4574E', text: '#F0A09A' },
  blue: { fill: '#10233A', stroke: '#4A90E2', text: '#9CC4F2' },
  green: { fill: '#14260F', stroke: '#6FBF4B', text: '#A8DF8E' },
  grey: { fill: '#1C2230', stroke: '#8A93A6', text: '#C3CBDA' },
  yellow: { fill: '#2E2412', stroke: '#E8B23A', text: '#F0CE7E' },
  black: { fill: '#171126', stroke: '#B08CFF', text: '#D9CBFF' },
  prismatic: { fill: '#1E2340', stroke: '#8FD0FF', text: '#CFEBFF' },
};

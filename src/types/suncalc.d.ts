declare module "suncalc" {
  export function getPosition(
    date: Date,
    lat: number,
    lng: number
  ): { altitude: number; azimuth: number };

  export function getTimes(
    date: Date,
    lat: number,
    lng: number,
    height?: number
  ): Record<string, Date>;
}

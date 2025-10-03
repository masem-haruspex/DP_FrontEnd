import { DRACOLoader } from 'three-stdlib';

let sharedDracoLoader: DRACOLoader | null = null;

export function getSharedDracoLoader() {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  }
  return sharedDracoLoader;
}

export function linearToDecibels(value: number){
  return Math.max(-60, 20 * Math.log10(value));
};


export const degreesToRad = (degrees: number) => {
  return degrees * (Math.PI / 180);
};

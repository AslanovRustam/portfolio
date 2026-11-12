'use client';

import Asphalt from './Asphalt';
import Rain from './Rain';
import Road from './Road';
import Skyline from './Skyline';
import Streaks from './Streaks';
import StreetLights from './StreetLights';

export default function Street() {
  return (
    <>
      <Asphalt />
      <Road />
      <Skyline />
      <StreetLights />
      <Streaks />
      <Rain />
    </>
  );
}

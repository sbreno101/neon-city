import { useMemo } from 'react';
import type { QualityProfile } from '../../config/quality';
import { generateCity, type CityData } from '../../utils/cityGenerator';
import { Buildings } from '../buildings/Buildings';
import { LandmarkFx } from '../buildings/Landmark';
import { GlowPoints } from '../environment/GlowPoints';
import { LightBeams } from '../environment/LightBeams';
import { Ground } from './Ground';
import { Traffic } from './Traffic';

export function useCityData(profile: QualityProfile): CityData {
  return useMemo(
    () =>
      generateCity({
        coreRadiusBlocks: profile.coreRadiusBlocks,
        farRadiusBlocks: profile.farRadiusBlocks,
        farDensity: profile.farDensity,
        farBeams: profile.farBeams,
      }),
    [profile],
  );
}

/** Everything that belongs to the city itself (static geometry + GPU-animated details). */
export function City({ city, profile }: { city: CityData; profile: QualityProfile }) {
  return (
    <group name="neon-city">
      <Ground coreRadius={city.coreRadius} farRadius={city.farRadius} />
      <Buildings boxes={city.boxes} />
      <Traffic lanes={city.lanes} count={profile.traffic} />
      <LightBeams beams={city.beams} />
      <GlowPoints
        beacons={city.beacons}
        drones={profile.drones}
        particles={profile.particles}
        coreRadius={city.coreRadius}
      />
      <LandmarkFx city={city} />
    </group>
  );
}

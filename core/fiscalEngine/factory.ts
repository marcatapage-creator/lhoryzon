import { FiscalProfile } from "./profiles";
import { MicroBNC } from "./profiles/MicroBNC";
import { EIReelBNC } from "./profiles/EIReelBNC";
import { SASU_IS } from "./profiles/SASU_IS";

export type FiscalProfileCode = 'MICRO_BNC' | 'MICRO_BIC' | 'EI_REEL' | 'EURL_IS' | 'SASU_IS';

const PROFILES: Record<FiscalProfileCode, FiscalProfile> = {
    'MICRO_BNC': MicroBNC,
    'EI_REEL': EIReelBNC,

    // Todo: Implement others
    'MICRO_BIC': MicroBNC, // Placeholder, needs specific profile
    'EURL_IS': EIReelBNC, // Placeholder
    'SASU_IS': SASU_IS,
};

export function getFiscalProfile(code: FiscalProfileCode): FiscalProfile {
    return PROFILES[code] || MicroBNC;
}

export function getAllProfiles(): FiscalProfile[] {
    return Object.values(PROFILES);
}

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as analytics from '../analytics';

describe('Observability / Analytics', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('should NOT track if NEXT_PUBLIC_OBS_ENABLED is false', async () => {
        vi.stubEnv('NEXT_PUBLIC_OBS_ENABLED', 'false');

        // Re-import to pick up env var change if module creates const at top level
        const { trackEvent } = await import('../analytics');

        trackEvent({
            type: 'DASHBOARD_LOAD',
            profile: 'TEST',
            year: 2025,
            netResult: 1000,
            warningsCount: 0,
            route: '/test',
            engineVersion: '2026.1.0',
            socialMode: 'approx',
            isClampTriggered: false
        });

        expect(console.debug).not.toHaveBeenCalled();
    });

    it('should track if NEXT_PUBLIC_OBS_ENABLED is true', async () => {
        vi.stubEnv('NEXT_PUBLIC_OBS_ENABLED', 'true');
        vi.stubEnv('NODE_ENV', 'development');
        const { trackEvent } = await import('../analytics');

        trackEvent({
            type: 'DASHBOARD_LOAD',
            profile: 'TEST',
            year: 2025,
            netResult: 1000,
            warningsCount: 0,
            route: '/test',
            engineVersion: '2026.1.0',
            socialMode: 'approx',
            isClampTriggered: false
        });

        expect(console.debug).toHaveBeenCalledWith('📊 [Analytics]', expect.objectContaining({
            type: 'DASHBOARD_LOAD',
            profile: 'TEST',
            engineVersion: '2026.1.0'
        }));
    });
});

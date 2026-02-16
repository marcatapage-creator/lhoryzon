

export type AnalyticsEventType = 'DASHBOARD_LOAD' | 'SIMULATION_COMPLETE';

export interface FiscalEvent {
    type: AnalyticsEventType;
    profile: string; // "MICRO_BNC", "SASU", etc.
    year: number;
    netResult: number | null; // Cents
    warningsCount: number;
    route: string; // "/dashboard", "/simulateur"
    timestamp: number;

    // --- Enterprise Context (Senior Polish) ---
    engineVersion: string;
    socialMode?: 'approx' | 'iteratif' | 'expert';
    isClampTriggered?: boolean; // Decote, Micro ceilings, etc.
    sasuRatio?: number; // Dividends / (Salary + Dividends)
}

export function trackEvent(event: Omit<FiscalEvent, 'timestamp'>) {
    const isEnabled = process.env.NEXT_PUBLIC_OBS_ENABLED === 'true';
    if (!isEnabled) return;

    const payload: FiscalEvent = {
        ...event,
        timestamp: Date.now()
    };

    // V1: Console Debug in Dev, Placeholder for Prod
    if (process.env.NODE_ENV === 'development') {
        console.debug('📊 [Analytics]', payload);
    } else {
        // TODO: Send to PostHog / Sentry / Vercel Analytics
        // sendToProvider(payload);
    }
}

/**
 * Simple in-memory rate limiter for Edge Runtime
 */
const trackers = new Map<string, { count: number; expires: number }>();

export function rateLimit(ip: string, limit: number): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    const tracker = trackers.get(ip);

    if (!tracker || now > tracker.expires) {
        trackers.set(ip, {
            count: 1,
            expires: now + windowMs
        });
        return true;
    }

    tracker.count++;
    
    if (tracker.count > limit) {
        return false;
    }

    return true;
}

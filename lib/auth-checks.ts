
export type RegistrationResult =
    | { status: "success" }
    | { status: "error", message: string }

export function validateRegistration(
    email: string,
    password: string | null,
    env: { ALLOWED_EMAILS?: string, DISABLE_REGISTRATION?: string }
): RegistrationResult {

    // Normalize
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Check if disabled
    if (env.DISABLE_REGISTRATION === 'true') {
        return { status: "error", message: "L'inscription est désactivée." }
    }

    // 2. Allowlist Check
    const allowedEmailsEnv = env.ALLOWED_EMAILS
    if (allowedEmailsEnv) {
        // Split by comma, semicolon, or space
        const allowedEmails = allowedEmailsEnv
            .split(/[,;\s]+/)
            .map(e => e.trim().replace(/^["']|["']$/g, '').toLowerCase())
            .filter(e => e.length > 0)

        const isAllowed = allowedEmails.includes(normalizedEmail)



        // If allowlist is defined AND has items, we must match
        if (allowedEmails.length > 0 && !isAllowed) {
            return { status: "error", message: "Inscription restreinte. Cet email n'est pas autorisé." }
        }
    }

    // 3. Password Length
    if (!password || password.length < 6) {
        return { status: "error", message: "Le mot de passe doit contenir au moins 6 caractères" }
    }

    return { status: "success" }
}

export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS?.split(',') || [])
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0);

    return adminEmails.includes(email.toLowerCase());
}

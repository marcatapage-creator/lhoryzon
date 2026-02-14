
import { LandingVisualFrame, LandingVisualStep1, LandingVisualStep2, LandingVisualStep3 } from "@/components/landing/LandingVisuals";

export default function LandingVisualsPreviewPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Landing Visuals Preview</h1>
                    <p className="text-zinc-500">Generated components for the 3-step process.</p>
                </header>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">Step 1: Déclarez vos encaissements</h2>
                    <LandingVisualFrame>
                        <LandingVisualStep1 />
                    </LandingVisualFrame>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">Step 2: Provision Automatique</h2>
                    <LandingVisualFrame>
                        <LandingVisualStep2 />
                    </LandingVisualFrame>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">Step 3: Visualisez votre vrai disponible</h2>
                    <LandingVisualFrame>
                        <LandingVisualStep3 />
                    </LandingVisualFrame>
                </section>
            </div>
        </div>
    );
}

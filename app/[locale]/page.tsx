import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <LandingHeader />

      <main>
        <LandingHero />
        <LandingProblem />
        <LandingFeatures />
        <LandingPricing />
      </main>

      <LandingFooter />
    </div>
  );
}

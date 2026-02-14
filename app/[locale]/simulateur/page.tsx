import { ComptaLayout } from "@/components/compta/compta-layout";
import { SimulationView } from "@/components/simulation/SimulationView";

export default function SimulateurPage() {
    return (
        <ComptaLayout>
            <div className="space-y-4">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-6 md:mb-8 pt-8 pb-3 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-white/5 transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Simulateur d&apos;Achat</h1>
                            <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl">
                                Visualisez l&apos;impact de vos investissements sur votre trésorerie et vos impôts.
                            </p>
                        </div>
                    </div>
                </div>
                <SimulationView />
            </div>
        </ComptaLayout>
    );
}

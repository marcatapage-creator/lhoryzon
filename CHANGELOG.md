# Changelog

## [v1.0.0-fiscal-2026] - 2026-02-14

### 🚀 Fiscal Engine V1 Release
First stable release of the standalone fiscal engine for French freelancers.

#### ✨ Features
- **Modular Architecture**: Separate core logic (`core/fiscalEngine`) from UI.
- **Fiscal Year 2026**: Updated brackets and rates for 2025 revenue declared in 2026.
- **Multi-Regime Support**:
  - **Micro-BNC**: Auto-calculation of abattement (34%) and charges.
  - **EI Réel**: Cash-basis accounting with iterative social charge calculation.
  - **SASU IS**: Corporate tax (15%/25%) + PFU (30%) on dividends + President remuneration.
- **Simulation**:
  - Real-time "Net Pocket" estimation.
  - "Arbitrage" mode for SASU (Salary vs Dividends).
  - Cash flow forecasting (Treasury evolution).

#### 🛡️ Robustness & Security
- **Strict Integer Math**: All monetary values handled in cents to prevent floating point errors.
- **Guardrails**: CI tests prevent re-introduction of legacy code.
- **Zero Lint Errors**: Strict ESLint configuration and type checking.
- **Test Coverage**:
  - Unit tests for all tax calculations.
  - Golden tests for "standard" profiles (50k/100k CA).
  - Invariant tests for safety (Net < CA).

#### 🔧 Technical
- **Stack**: Next.js 16 (Turbopack), TypeScript 5, Vitest, TailwindCSS.
- **Database**: Prisma with local SQLite/PostgreSQL support.
- **CI/CD**: GitHub Actions workflow for Lint/Test/Build.

# Use a managed backend within a strict zero budget

This single-company HR learning app uses React/TypeScript/Vite on Cloudflare Pages and plans to use Supabase Free for PostgreSQL and authentication, subject to verifying no-card signup. A managed backend supports learning a complete app without operating a separate backend server, at the cost of provider dependence, free-tier quotas, and inactivity pauses. Hosting must remain RM0 with no payment method: if a provider requires a card or changes its free terms, revisit the provider or run locally instead of upgrading.

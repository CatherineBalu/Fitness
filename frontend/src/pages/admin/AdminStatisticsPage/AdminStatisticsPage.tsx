import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import KpiSection from './components/KpiSection';
import OccupancyList from './components/OccupancyList';
import RevenueBySubscriptionList from './components/RevenueBySubscriptionList';
import RevenueChartCard from './components/RevenueChartCard';
import SectionHeader from './components/SectionHeader';
import TopLecturesList from './components/TopLecturesList';
import { useAdminStatistics } from './hooks/useAdminStatistics';

export default function AdminStatisticsPage() {
  const {
    overview,
    revenue,
    bySubscription,
    topLectures,
    occupancy,
    isLoading,
    isError,
    error,
  } = useAdminStatistics();

  return (
    <div className="min-h-svh pt-[var(--nav-height)]">
      <header className="border-border bg-admin-hero border-b px-5 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-muted-foreground mb-1.5 text-sm font-semibold tracking-widest">
            OVERVIEW
          </p>
          <h1 className="text-primary mb-3 text-5xl leading-none font-black">
            STATISTICS
          </h1>
          <p className="text-muted-foreground text-base">
            Business health at a glance — revenue, popularity, occupancy.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <div className="flex flex-col gap-12">
          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Some statistics failed to load</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : 'Something went wrong. Please try again later.'}
              </AlertDescription>
            </Alert>
          )}

          <section>
            <SectionHeader title="This month" />
            <KpiSection overview={overview} isLoading={isLoading} />
          </section>

          <div className="bg-border h-px" />

          <section>
            <SectionHeader label="Revenue" title="Last 12 months" />
            <RevenueChartCard data={revenue} isLoading={isLoading} />
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <SectionHeader label="Revenue mix" title="By subscription" />
              <RevenueBySubscriptionList
                data={bySubscription}
                isLoading={isLoading}
              />
            </div>
            <div>
              <SectionHeader label="Popularity" title="Top lectures" />
              <TopLecturesList data={topLectures} isLoading={isLoading} />
            </div>
          </section>

          <div className="bg-border h-px" />

          <section>
            <SectionHeader label="Efficiency" title="Average occupancy" />
            <OccupancyList data={occupancy} isLoading={isLoading} />
          </section>
        </div>
      </div>
    </div>
  );
}

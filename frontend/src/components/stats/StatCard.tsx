import { Card, CardContent } from '@/components/ui/card';

export function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Card className="dash-stat-card">
      <CardContent className="dash-stat-content">
        <div className="dash-stat-icon">{icon}</div>
        <span className="dash-stat-value">{value}</span>
        <span className="dash-stat-label">{label}</span>
      </CardContent>
    </Card>
  );
}

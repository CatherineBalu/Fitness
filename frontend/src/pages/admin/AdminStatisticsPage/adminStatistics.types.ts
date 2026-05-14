export interface Overview {
  activeMemberships: number;
  monthRevenue: number;
  monthReservations: number;
  avgOccupancyPct: number;
}

export interface RevenuePoint {
  month: string;
  total: number;
}

export interface RevenueBySubscription {
  subscriptionName: string;
  total: number;
  count: number;
}

export interface TopLecture {
  lectureName: string;
  reservationCount: number;
}

export interface OccupancyRow {
  lectureName: string;
  avgReservations: number;
  capacity: number;
  occupancyPct: number;
}

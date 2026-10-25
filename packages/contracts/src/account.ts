export type MiniAccount = { id: string; nickname: string; createdAt: string };
export type MiniAccountSession = {
  token: string;
  expiresAt: string;
  user: MiniAccount;
};
export type MiniUserRow = MiniAccount & {
  lastActiveAt: string;
  activeDays: number;
  openidMasked: string;
};
export type MiniUserList = {
  users: MiniUserRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    todayNew: number;
    todayActive: number;
    weekActive: number;
  };
};
export type MiniActivityList = {
  day: string;
  users: {
    user: MiniAccount;
    firstSeenAt: string;
    lastSeenAt: string;
    visits: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

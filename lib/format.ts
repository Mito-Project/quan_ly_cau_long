import type { Session } from "./types";

// Làm tròn tiền mỗi người LÊN tới bội số này (đặt 1 nếu không muốn làm tròn)
export const ROUND_TO = 1000;

export const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

type Priced = Pick<Session, "court_price" | "shuttle_price" | "shuttle_count">;

export const shuttleTotal = (s: Priced) => s.shuttle_price * s.shuttle_count;
export const sessionTotal = (s: Priced) => s.court_price + shuttleTotal(s);
export const perPlayer = (s: Priced, n: number) =>
  n > 0 ? Math.ceil(sessionTotal(s) / n / ROUND_TO) * ROUND_TO : 0;

export const dateVN = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });

export const todayLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Tiền ăn mỗi người = tổng / số người, làm tròn lên theo ROUND_TO
export const mealShare = (total: number, n: number) =>
  n > 0 ? Math.ceil(total / n / ROUND_TO) * ROUND_TO : 0;

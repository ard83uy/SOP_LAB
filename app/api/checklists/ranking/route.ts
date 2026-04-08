import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withModule } from "@/lib/middlewares/withModule";
import { nowSP } from "@/lib/timezone";

// ── GET /api/checklists/ranking ─────────────────────────────────────────────
// Returns weekly leaderboard for the current user's profile

async function rankingHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  // Get user's profile
  const user = await prisma.user.findUnique({
    where: { id: user_id },
    select: { profile_id: true },
  });

  if (!user?.profile_id) {
    return NextResponse.json({ ranking: [], current_user: null });
  }

  // Calculate week boundaries (Monday → Sunday)
  const weekStart = getWeekStartDate();
  const weekEnd = getWeekEndDate();

  // Get all users with same profile
  const profileUsers = await prisma.user.findMany({
    where: { tenant_id, profile_id: user.profile_id, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const userIds = profileUsers.map((u) => u.id);

  // Get completions for the week with task points
  const completions = await prisma.checklistCompletion.findMany({
    where: {
      tenant_id,
      user_id: { in: userIds },
      date: { gte: weekStart, lte: weekEnd },
    },
    include: {
      task: { select: { points: true } },
    },
  });

  // Aggregate points per user
  const pointsMap = new Map<string, number>();
  for (const c of completions) {
    const current = pointsMap.get(c.user_id) ?? 0;
    pointsMap.set(c.user_id, current + c.task.points);
  }

  // Build ranking
  const ranking = profileUsers
    .map((u) => ({
      user_id: u.id,
      user_name: u.name,
      points: pointsMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  // Assign positions (handle ties)
  let position = 0;
  let prevPoints = -1;
  const ranked = ranking.map((entry, idx) => {
    if (entry.points !== prevPoints) {
      position = idx + 1;
      prevPoints = entry.points;
    }
    return { ...entry, position };
  });

  const currentUser = ranked.find((r) => r.user_id === user_id) ?? null;
  const top5 = ranked.slice(0, 5);

  // Include current user if not in top 5
  const includeCurrentUser =
    currentUser && !top5.find((r) => r.user_id === user_id);

  return NextResponse.json({
    ranking: top5,
    current_user: includeCurrentUser ? currentUser : null,
    week_start: weekStart,
    week_end: weekEnd,
  });
}

function getWeekStartDate(): string {
  const sp = nowSP();
  const day = sp.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  sp.setDate(sp.getDate() - diff);
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekEndDate(): string {
  const sp = nowSP();
  const day = sp.getDay();
  const diff = day === 0 ? 0 : 7 - day; // Sunday = end
  sp.setDate(sp.getDate() + diff);
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const GET = compose(
  withAuth,
  withTenant,
  withModule("checklists"),
  rankingHandler,
);

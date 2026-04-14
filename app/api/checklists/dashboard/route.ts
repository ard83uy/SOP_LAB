import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { nowSP, todayDowSP } from "@/lib/timezone";

// ── GET /api/checklists/dashboard?date=YYYY-MM-DD&checklist_id=... ──────────

async function dashboardHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date") ?? getTodayDate();
  const checklistIdParam = url.searchParams.get("checklist_id");

  // Parse the date to get day of week
  const [year, month, day] = dateParam.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dow = dateObj.getDay();

  // Get checklists with their profiles and tasks
  const checklistWhere: any = { tenant_id, is_active: true };
  if (checklistIdParam) checklistWhere.id = checklistIdParam;

  const checklists = await prisma.checklist.findMany({
    where: checklistWhere,
    include: {
      profiles: {
        select: {
          id: true,
          name: true,
          users: {
            where: { status: "ACTIVE", tenant_id },
            select: { id: true, name: true },
          },
        },
      },
      tasks: {
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  // Get all completions for the date
  const completions = await prisma.checklistCompletion.findMany({
    where: { tenant_id, date: dateParam },
    select: { task_id: true, user_id: true, completed_at: true },
  });

  const completionSet = new Set(completions.map((c) => `${c.task_id}:${c.user_id}`));
  const completionTimeMap = new Map(
    completions.map((c) => [`${c.task_id}:${c.user_id}`, c.completed_at]),
  );

  // Build per-profile stats
  const profileStats = new Map<string, {
    profile_id: string;
    profile_name: string;
    total_tasks: number;
    users: {
      user_id: string;
      user_name: string;
      completed: number;
      total: number;
      tasks: { task_id: string; title: string; description: string | null; time_slot: string; completed: boolean; completed_at: Date | null }[];
    }[];
  }>();

  for (const cl of checklists) {
    // Filter tasks for the requested date's day of week
    const dayTasks = cl.tasks.filter((t) => {
      if (t.frequency === "DAILY") return true;
      if (t.frequency === "SPECIFIC_DAYS") return t.days_of_week.includes(dow);
      return false;
    });

    if (dayTasks.length === 0) continue;

    for (const profile of cl.profiles) {
      const existing = profileStats.get(profile.id) ?? {
        profile_id: profile.id,
        profile_name: profile.name,
        total_tasks: 0,
        users: [],
      };

      for (const user of profile.users) {
        let userEntry = existing.users.find((u) => u.user_id === user.id);
        if (!userEntry) {
          userEntry = { user_id: user.id, user_name: user.name, completed: 0, total: 0, tasks: [] };
          existing.users.push(userEntry);
        }

        for (const task of dayTasks) {
          const key = `${task.id}:${user.id}`;
          const isCompleted = completionSet.has(key);
          userEntry.total++;
          if (isCompleted) userEntry.completed++;
          userEntry.tasks.push({
            task_id: task.id,
            title: task.title,
            description: task.description ?? null,
            time_slot: task.time_slot,
            completed: isCompleted,
            completed_at: completionTimeMap.get(key) ?? null,
          });
        }
      }

      existing.total_tasks = existing.users[0]?.total ?? 0;
      profileStats.set(profile.id, existing);
    }
  }

  const profiles = Array.from(profileStats.values());
  const totalTasks = profiles.reduce((sum, p) => sum + p.users.reduce((s, u) => s + u.total, 0), 0);
  const totalCompleted = profiles.reduce((sum, p) => sum + p.users.reduce((s, u) => s + u.completed, 0), 0);

  return NextResponse.json({
    date: dateParam,
    summary: { total_tasks: totalTasks, completed: totalCompleted, rate: totalTasks > 0 ? totalCompleted / totalTasks : 0 },
    profiles,
  });
}

function getTodayDate(): string {
  const sp = nowSP();
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const GET = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  dashboardHandler,
);

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withModule } from "@/lib/middlewares/withModule";
import { nowSP, todayDowSP } from "@/lib/timezone";

// ── GET /api/checklists/my-tasks ────────────────────────────────────────────
// Returns today's tasks for the logged-in user, based on their profile

async function myTasksHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  // Get user's profile
  const user = await prisma.user.findUnique({
    where: { id: user_id },
    select: { profile_id: true },
  });

  if (!user?.profile_id) {
    return NextResponse.json({ tasks: [], todayDate: getTodayDate() });
  }

  const todayDow = todayDowSP();
  const todayDate = getTodayDate();

  // Get all checklists assigned to this user's profile
  const checklists = await prisma.checklist.findMany({
    where: {
      tenant_id,
      is_active: true,
      profiles: { some: { id: user.profile_id } },
    },
    include: {
      tasks: {
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  // Filter tasks that should appear today
  const todayTasks = checklists.flatMap((cl) =>
    cl.tasks
      .filter((task) => {
        if (task.frequency === "DAILY") return true;
        if (task.frequency === "SPECIFIC_DAYS") return task.days_of_week.includes(todayDow);
        return false;
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        frequency: task.frequency,
        days_of_week: task.days_of_week,
        time_slot: task.time_slot,
        sort_order: task.sort_order,
        points: task.points,
        checklist_id: cl.id,
        checklist_name: cl.name,
      })),
  );

  // Get completions for today
  const completions = await prisma.checklistCompletion.findMany({
    where: {
      user_id,
      date: todayDate,
      task_id: { in: todayTasks.map((t) => t.id) },
    },
  });

  const completionMap = new Map(completions.map((c) => [c.task_id, c]));

  const tasksWithStatus = todayTasks.map((task) => ({
    ...task,
    completed: completionMap.has(task.id),
    completed_at: completionMap.get(task.id)?.completed_at ?? null,
  }));

  // Calculate today's points
  const totalPoints = tasksWithStatus.reduce((sum, t) => sum + t.points, 0);
  const earnedPoints = tasksWithStatus
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.points, 0);

  return NextResponse.json({
    tasks: tasksWithStatus,
    todayDate,
    totalPoints,
    earnedPoints,
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
  withModule("checklists"),
  myTasksHandler,
);

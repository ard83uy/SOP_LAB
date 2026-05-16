import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type ChangelogSection = {
  heading: string;
  items: string[];
};

type ChangelogEntry = {
  version: string;
  date: string | null;
  intro: string | null;
  sections: ChangelogSection[];
};

function parseChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.split("\n");
  const entries: ChangelogEntry[] = [];

  let current: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;
  let introBuffer: string[] = [];

  const flushIntro = () => {
    if (current && introBuffer.length > 0) {
      current.intro = introBuffer.join(" ").trim() || null;
      introBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    const versionMatch = line.match(/^##\s+\[([^\]]+)\](?:\s*-\s*(.+))?$/);
    if (versionMatch) {
      flushIntro();
      if (current) entries.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() || null,
        intro: null,
        sections: [],
      };
      currentSection = null;
      introBuffer = [];
      continue;
    }

    if (!current) continue;

    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch) {
      flushIntro();
      currentSection = { heading: sectionMatch[1].trim(), items: [] };
      current.sections.push(currentSection);
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentSection) {
      currentSection.items.push(bulletMatch[1].trim());
      continue;
    }

    if (line.trim() && !currentSection) {
      introBuffer.push(line.trim());
    }
  }

  flushIntro();
  if (current) entries.push(current);

  return entries;
}

export async function GET() {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    const markdown = await readFile(path, "utf-8");
    const entries = parseChangelog(markdown);
    return NextResponse.json({ entries: entries.slice(0, 5) });
  } catch (err) {
    return NextResponse.json(
      { entries: [], error: "CHANGELOG.md not found" },
      { status: 200 },
    );
  }
}

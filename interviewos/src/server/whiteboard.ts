import "server-only";
import { and, eq } from "drizzle-orm";
import { SD_QUESTIONS } from "@content/system-design";
import { db } from "@/lib/db";
import { sdBoards } from "@/lib/db/schema";
import { type Board, countComponents, parseBoard } from "@/lib/whiteboard/board";
import { getCurrentUserId } from "./user";

export const SANDBOX_BOARD = "sandbox";

/** A board key is a question slug or the free sandbox. */
export function isBoardKey(key: string): boolean {
  return key === SANDBOX_BOARD || SD_QUESTIONS.some((q) => q.slug === key);
}

export async function getBoard(key: string): Promise<{ board: Board; updatedAt: Date } | null> {
  const [row] = await db
    .select({ data: sdBoards.data, updatedAt: sdBoards.updatedAt })
    .from(sdBoards)
    .where(and(eq(sdBoards.userId, getCurrentUserId()), eq(sdBoards.boardKey, key)));
  // Stored boards were validated on save; re-check so a schema change never crashes the page.
  const board = row ? parseBoard(row.data) : null;
  return board && row ? { board, updatedAt: row.updatedAt } : null;
}

export async function saveBoard(key: string, board: Board) {
  const components = countComponents(board);
  await db
    .insert(sdBoards)
    .values({ userId: getCurrentUserId(), boardKey: key, data: board, components })
    .onConflictDoUpdate({
      target: [sdBoards.userId, sdBoards.boardKey],
      set: { data: board, components, updatedAt: new Date() },
    });
}

/** Number of components on each saved board, by board key. */
export async function listBoardSizes(): Promise<Map<string, number>> {
  const rows = await db
    .select({ key: sdBoards.boardKey, components: sdBoards.components })
    .from(sdBoards)
    .where(eq(sdBoards.userId, getCurrentUserId()));
  return new Map(rows.map((r) => [r.key, r.components]));
}

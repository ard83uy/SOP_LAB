-- Add sort_order to Checklist for drag-and-drop reordering
ALTER TABLE "Checklist" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

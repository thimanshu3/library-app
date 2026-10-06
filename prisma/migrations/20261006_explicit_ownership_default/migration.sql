-- Ownership is chosen explicitly; a library entry does not imply acquisition.
-- Existing choices are preserved. Owner-requested resets are separate data edits.
ALTER TABLE "Copy" ALTER COLUMN "ownership" SET DEFAULT 'None';

-- Delete all existing data in the Class table since it has invalid data
TRUNCATE TABLE "public"."Class";

-- Add a check constraint to ensure createdById is a valid string (not numeric)
ALTER TABLE "public"."Class" ADD CONSTRAINT "check_created_by_id_is_string" 
CHECK ("createdById" ~ '^[a-zA-Z0-9_-]+$');
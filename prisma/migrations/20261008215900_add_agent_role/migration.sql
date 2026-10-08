-- Separate enum extension from its first use; avoids PostgreSQL "unsafe use of new value"
-- when a migration runner wraps individual migrations in transactions.
ALTER TYPE "BusinessRole" ADD VALUE IF NOT EXISTS 'agent';

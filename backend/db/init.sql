-- Local PostgreSQL bootstrap
-- Usage: psql -U postgres -h localhost -f backend/db/init.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'noteflow') THEN
        CREATE USER noteflow WITH PASSWORD 'noteflow123';
    END IF;
END
$$;

SELECT 'CREATE DATABASE noteflow OWNER noteflow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'noteflow')\gexec

GRANT ALL PRIVILEGES ON DATABASE noteflow TO noteflow;
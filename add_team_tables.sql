-- Add team-related tables for scramble tournaments
-- Following the same pattern as existing tables in schema.sql

-- Create sequences for team tables
CREATE SEQUENCE IF NOT EXISTS tournament_teams_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS team_members_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS tournament_team_scores_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Table: public.tournament_teams
CREATE TABLE IF NOT EXISTS public.tournament_teams
(
    id integer NOT NULL DEFAULT nextval('tournament_teams_id_seq'::regclass),
    tournament_id integer NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    captain_id integer NOT NULL,
    max_players integer DEFAULT 4,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tournament_teams_pkey PRIMARY KEY (id),
    CONSTRAINT tournament_teams_tournament_id_fkey FOREIGN KEY (tournament_id)
        REFERENCES public.tournaments (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT tournament_teams_captain_id_fkey FOREIGN KEY (captain_id)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT tournament_teams_tournament_name_unique UNIQUE (tournament_id, name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tournament_teams
    OWNER to golfos_user;

-- Table: public.team_members (currently used by backend)
CREATE TABLE IF NOT EXISTS public.team_members
(
    id integer NOT NULL DEFAULT nextval('team_members_id_seq'::regclass),
    team_id integer NOT NULL,
    tournament_id integer NOT NULL,
    user_member_id integer NOT NULL,
    is_captain boolean DEFAULT false,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id)
        REFERENCES public.tournament_teams (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT team_members_tournament_id_fkey FOREIGN KEY (tournament_id)
        REFERENCES public.tournaments (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT team_members_user_member_id_fkey FOREIGN KEY (user_member_id)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT team_members_team_user_unique UNIQUE (team_id, user_member_id),
    CONSTRAINT team_members_tournament_user_unique UNIQUE (tournament_id, user_member_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.team_members
    OWNER to golfos_user;

-- Table: public.tournament_team_scores
CREATE TABLE IF NOT EXISTS public.tournament_team_scores
(
    id integer NOT NULL DEFAULT nextval('tournament_team_scores_id_seq'::regclass),
    team_id integer NOT NULL,
    tournament_id integer NOT NULL,
    total_score integer,
    hole_scores jsonb, -- Store hole-by-hole scores as JSON
    submitted_by integer NOT NULL, -- The captain who submitted the score
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tournament_team_scores_pkey PRIMARY KEY (id),
    CONSTRAINT tournament_team_scores_team_id_fkey FOREIGN KEY (team_id)
        REFERENCES public.tournament_teams (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT tournament_team_scores_tournament_id_fkey FOREIGN KEY (tournament_id)
        REFERENCES public.tournaments (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT tournament_team_scores_submitted_by_fkey FOREIGN KEY (submitted_by)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT tournament_team_scores_team_tournament_unique UNIQUE (team_id, tournament_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tournament_team_scores
    OWNER to golfos_user;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_captain_id ON tournament_teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_tournament_id ON team_members(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_member_id);
CREATE INDEX IF NOT EXISTS idx_team_members_captain ON team_members(is_captain);
CREATE INDEX IF NOT EXISTS idx_tournament_team_scores_team_id ON tournament_team_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_scores_tournament_id ON tournament_team_scores(tournament_id);

-- Add comments for documentation
COMMENT ON TABLE tournament_teams IS 'Teams formed for scramble tournaments';
COMMENT ON TABLE team_members IS 'Members of tournament teams (including captain)';
COMMENT ON TABLE tournament_team_scores IS 'Scores submitted by team captains for scramble tournaments';

-- Migration: Add tournament_id to existing team_members table if it exists
DO $$
BEGIN
    -- Check if team_members table exists and doesn't have tournament_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND column_name = 'tournament_id'
        AND table_schema = 'public'
    ) THEN
        -- Add tournament_id column
        ALTER TABLE public.team_members ADD COLUMN tournament_id integer;
        
        -- Update tournament_id based on team_id relationship
        UPDATE public.team_members 
        SET tournament_id = tt.tournament_id
        FROM public.tournament_teams tt
        WHERE team_members.team_id = tt.id;
        
        -- Make tournament_id NOT NULL after populating it
        ALTER TABLE public.team_members ALTER COLUMN tournament_id SET NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE public.team_members 
        ADD CONSTRAINT team_members_tournament_id_fkey 
        FOREIGN KEY (tournament_id) REFERENCES public.tournaments (id) 
        ON UPDATE NO ACTION ON DELETE CASCADE;
        
        -- Remove the existing unique constraint on user_member_id since we want to allow users in different tournaments
        ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_member_id_key;
        
        -- Add unique constraint for tournament + user to prevent same user in multiple teams in same tournament
        ALTER TABLE public.team_members 
        ADD CONSTRAINT team_members_tournament_user_unique 
        UNIQUE (tournament_id, user_member_id);
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_team_members_tournament_id 
        ON team_members(tournament_id);
        
        RAISE NOTICE 'Successfully migrated team_members table to include tournament_id';
    ELSE
        RAISE NOTICE 'team_members table does not exist or already has tournament_id column';
    END IF;
END $$; 
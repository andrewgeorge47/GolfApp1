-- Table: public.league_participants

-- DROP TABLE IF EXISTS public.league_participants;

CREATE TABLE IF NOT EXISTS public.league_participants
(
    id integer NOT NULL DEFAULT nextval('league_participants_id_seq'::regclass),
    user_id integer,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'active'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT league_participants_pkey PRIMARY KEY (id),
    CONSTRAINT league_participants_user_id_key UNIQUE (user_id),
    CONSTRAINT league_participants_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.league_participants
    OWNER to golfos_user;

-- Table: public.league_settings

-- DROP TABLE IF EXISTS public.league_settings;

CREATE TABLE IF NOT EXISTS public.league_settings
(
    id integer NOT NULL DEFAULT nextval('league_settings_id_seq'::regclass),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL DEFAULT 'Weekly Match Play League'::character varying,
    description text COLLATE pg_catalog."default",
    min_matches integer DEFAULT 3,
    scoring_rules jsonb DEFAULT '{"tie": 1, "win": 3, "loss": 0}'::jsonb,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tournament_date date,
    CONSTRAINT league_settings_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.league_settings
    OWNER to golfos_user;

-- Table: public.participation

-- DROP TABLE IF EXISTS public.participation;

CREATE TABLE IF NOT EXISTS public.participation
(
    id integer NOT NULL DEFAULT nextval('participation_id_seq'::regclass),
    user_member_id integer,
    tournament_id integer,
    CONSTRAINT participation_pkey PRIMARY KEY (id),
    CONSTRAINT participation_user_member_id_tournament_id_key UNIQUE (user_member_id, tournament_id),
    CONSTRAINT participation_tournament_id_fkey FOREIGN KEY (tournament_id)
        REFERENCES public.tournaments (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT participation_user_member_id_fkey FOREIGN KEY (user_member_id)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.participation
    OWNER to golfos_user;

-- Table: public.tournaments

-- DROP TABLE IF EXISTS public.tournaments;

CREATE TABLE IF NOT EXISTS public.tournaments
(
    id integer NOT NULL DEFAULT nextval('tournaments_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    start_date date,
    end_date date,
    notes text COLLATE pg_catalog."default",
    CONSTRAINT tournaments_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tournaments
    OWNER to golfos_user;

-- Table: public.user_profiles

-- DROP TABLE IF EXISTS public.user_profiles;

CREATE TABLE IF NOT EXISTS public.user_profiles
(
    user_id integer NOT NULL,
    total_matches integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    ties integer DEFAULT 0,
    total_points integer DEFAULT 0,
    win_rate numeric(5,2) DEFAULT 0.00,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (member_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_profiles
    OWNER to golfos_user;

-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    member_id integer NOT NULL,
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    email_address character varying(255) COLLATE pg_catalog."default",
    club character varying(100) COLLATE pg_catalog."default",
    role character varying(50) COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (member_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to golfos_user; 
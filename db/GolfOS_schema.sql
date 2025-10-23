--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 17.0

-- Started on 2025-10-23 13:06:22 EDT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: golfos_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO golfos_user;

--
-- TOC entry 2 (class 3079 OID 19018)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- TOC entry 4201 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 320 (class 1255 OID 20681)
-- Name: create_tournament_rounds(integer); Type: FUNCTION; Schema: public; Owner: golfos_user
--

CREATE FUNCTION public.create_tournament_rounds(tournament_id_param integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    tournament_record RECORD;
    round_counter INTEGER;
    round_start_date DATE;
    round_end_date DATE;
    round_registration_deadline DATE;
BEGIN
    -- Get tournament details
    SELECT * INTO tournament_record 
    FROM tournaments 
    WHERE id = tournament_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tournament not found';
    END IF;
    
    IF NOT tournament_record.is_multi_round THEN
        RAISE EXCEPTION 'Tournament is not a multi-round tournament';
    END IF;
    
    -- Create rounds
    FOR round_counter IN 1..tournament_record.total_rounds LOOP
        -- Calculate dates for this round
        round_start_date := tournament_record.start_date + ((round_counter - 1) * tournament_record.round_duration_days);
        round_end_date := round_start_date + tournament_record.round_duration_days - 1;
        round_registration_deadline := round_start_date - 1;
        
        -- Insert round
        INSERT INTO tournament_rounds (
            tournament_id,
            round_number,
            round_name,
            start_date,
            end_date,
            registration_deadline,
            max_participants,
            status,
            registration_open,
            course_id,
            course_name,
            location,
            rules,
            notes
        ) VALUES (
            tournament_id_param,
            round_counter,
            'Round ' || round_counter,
            round_start_date,
            round_end_date,
            round_registration_deadline,
            tournament_record.max_participants,
            'draft',
            true,
            tournament_record.course_id,
            tournament_record.course,
            tournament_record.location,
            tournament_record.rules,
            tournament_record.notes
        );
    END LOOP;
END;
$$;


ALTER FUNCTION public.create_tournament_rounds(tournament_id_param integer) OWNER TO golfos_user;

--
-- TOC entry 321 (class 1255 OID 20682)
-- Name: get_tournament_leaderboard(integer); Type: FUNCTION; Schema: public; Owner: golfos_user
--

CREATE FUNCTION public.get_tournament_leaderboard(tournament_id_param integer) RETURNS TABLE(user_member_id integer, first_name character varying, last_name character varying, club character varying, total_score integer, rounds_played integer, best_score integer, average_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH player_scores AS (
        SELECT 
            trs.user_member_id,
            u.first_name,
            u.last_name,
            u.club,
            trs.total_score,
            tr.round_number,
            ROW_NUMBER() OVER (PARTITION BY trs.user_member_id ORDER BY trs.total_score ASC) as score_rank
        FROM tournament_round_scores trs
        JOIN tournament_rounds tr ON trs.round_id = tr.id
        JOIN users u ON trs.user_member_id = u.member_id
        WHERE tr.tournament_id = tournament_id_param
    ),
    player_totals AS (
        SELECT 
            user_member_id,
            first_name,
            last_name,
            club,
            SUM(total_score) as total_score,
            COUNT(*) as rounds_played,
            MIN(total_score) as best_score,
            AVG(total_score) as average_score
        FROM player_scores
        GROUP BY user_member_id, first_name, last_name, club
    )
    SELECT * FROM player_totals
    ORDER BY total_score ASC, best_score ASC;
END;
$$;


ALTER FUNCTION public.get_tournament_leaderboard(tournament_id_param integer) OWNER TO golfos_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 285 (class 1259 OID 23531)
-- Name: championship_groups; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.championship_groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    championship_type character varying(50) NOT NULL,
    parent_group_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.championship_groups OWNER TO golfos_user;

--
-- TOC entry 284 (class 1259 OID 23530)
-- Name: championship_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.championship_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.championship_groups_id_seq OWNER TO golfos_user;

--
-- TOC entry 4204 (class 0 OID 0)
-- Dependencies: 284
-- Name: championship_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.championship_groups_id_seq OWNED BY public.championship_groups.id;


--
-- TOC entry 218 (class 1259 OID 16424)
-- Name: tournaments; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournaments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    start_date date,
    end_date date,
    notes text,
    type character varying(50) DEFAULT 'tournament'::character varying,
    description text,
    registration_deadline date,
    max_participants integer,
    min_participants integer DEFAULT 2,
    tournament_format character varying(50) DEFAULT 'match_play'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    registration_open boolean DEFAULT true,
    entry_fee numeric(10,2) DEFAULT 0,
    location character varying(255),
    course character varying(255),
    rules text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    course_id integer,
    hole_configuration character varying(10) DEFAULT '18'::character varying,
    team_size integer,
    tee character varying(20) DEFAULT 'Red'::character varying,
    pins character varying(20) DEFAULT 'Friday'::character varying,
    putting_gimme character varying(10) DEFAULT '8'::character varying,
    elevation character varying(20) DEFAULT 'Course'::character varying,
    stimp character varying(10) DEFAULT '11'::character varying,
    mulligan character varying(20) DEFAULT 'No'::character varying,
    game_play character varying(30) DEFAULT 'Force Realistic'::character varying,
    firmness character varying(20) DEFAULT 'Normal'::character varying,
    wind character varying(20) DEFAULT 'None'::character varying,
    handicap_enabled boolean DEFAULT false,
    club_restriction character varying(50) DEFAULT 'open'::character varying,
    is_multi_round boolean DEFAULT false,
    total_rounds integer DEFAULT 1,
    round_duration_days integer DEFAULT 7,
    allow_single_round_registration boolean DEFAULT true,
    cumulative_scoring boolean DEFAULT false,
    best_rounds_count integer,
    has_registration_form boolean DEFAULT false,
    registration_form_template character varying(100) DEFAULT NULL::character varying,
    registration_form_data jsonb,
    payment_organizer character varying(10),
    payment_organizer_name character varying(255),
    payment_venmo_url character varying(500),
    scoring_format character varying(50) DEFAULT 'traditional'::character varying,
    live_match_bonus_enabled boolean DEFAULT true,
    max_live_matches_per_week integer DEFAULT 3,
    week_start_date date,
    tournament_series character varying(50) DEFAULT 'regular'::character varying,
    parent_tournament_id integer,
    is_club_championship boolean DEFAULT false,
    is_national_tournament boolean DEFAULT false,
    championship_round integer DEFAULT 1,
    championship_club character varying(100),
    championship_type character varying(50) DEFAULT 'single_club'::character varying,
    participating_clubs text,
    min_club_participants integer DEFAULT 4,
    auto_group_clubs boolean DEFAULT false,
    auto_seed_champions boolean DEFAULT false,
    championship_group_id integer,
    is_regional_championship boolean DEFAULT false,
    gspro_course character varying(255),
    gspro_course_id integer,
    trackman_course character varying(255),
    trackman_course_id integer
);


ALTER TABLE public.tournaments OWNER TO golfos_user;

--
-- TOC entry 4205 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.tee; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.tee IS 'Tee box selection: Red, White, Blue, Black, Gold';


--
-- TOC entry 4206 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.pins; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.pins IS 'Pin position: Friday, Saturday, Sunday, Easy, Hard';


--
-- TOC entry 4207 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.putting_gimme; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.putting_gimme IS 'Putting gimme distance in feet';


--
-- TOC entry 4208 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.elevation; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.elevation IS 'Elevation setting: Course, Off, High, Low';


--
-- TOC entry 4209 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.stimp; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.stimp IS 'Green speed (stimp rating)';


--
-- TOC entry 4210 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.mulligan; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.mulligan IS 'Mulligan settings: No, Yes, 1 per hole, 2 per round';


--
-- TOC entry 4211 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.game_play; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.game_play IS 'Game play mode: Force Realistic, Allow Unrealistic, Tournament Mode';


--
-- TOC entry 4212 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.firmness; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.firmness IS 'Fairway/Green firmness: Normal, Soft, Firm, Very Firm';


--
-- TOC entry 4213 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.wind; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.wind IS 'Wind settings: None, Light, Moderate, Strong, Random';


--
-- TOC entry 4214 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.handicap_enabled; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.handicap_enabled IS 'Whether handicap adjustments are enabled';


--
-- TOC entry 4215 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.is_multi_round; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.is_multi_round IS 'Whether this tournament has multiple rounds';


--
-- TOC entry 4216 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.total_rounds; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.total_rounds IS 'Total number of rounds in the tournament';


--
-- TOC entry 4217 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.round_duration_days; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.round_duration_days IS 'Duration of each round in days';


--
-- TOC entry 4218 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.allow_single_round_registration; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.allow_single_round_registration IS 'Whether players can register for individual rounds';


--
-- TOC entry 4219 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.cumulative_scoring; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.cumulative_scoring IS 'Whether scores are cumulative across rounds';


--
-- TOC entry 4220 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.best_rounds_count; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.best_rounds_count IS 'Number of best rounds to count (null = all rounds)';


--
-- TOC entry 4221 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.payment_organizer; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.payment_organizer IS 'Payment organizer: jeff, adam, other';


--
-- TOC entry 4222 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.payment_organizer_name; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.payment_organizer_name IS 'Custom organizer name for other option';


--
-- TOC entry 4223 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.payment_venmo_url; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.payment_venmo_url IS 'Custom Venmo URL for other option';


--
-- TOC entry 4224 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.tournament_series; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.tournament_series IS 'Type of tournament series: regular, club_championship, national_championship';


--
-- TOC entry 4225 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.parent_tournament_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.parent_tournament_id IS 'References parent tournament for championship series';


--
-- TOC entry 4226 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.is_club_championship; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.is_club_championship IS 'True if this is a club championship tournament';


--
-- TOC entry 4227 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.is_national_tournament; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.is_national_tournament IS 'True if this is the national championship tournament';


--
-- TOC entry 4228 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.championship_round; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.championship_round IS 'Round number for championship tournaments (1-3 for club, 1+ for national)';


--
-- TOC entry 4229 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.championship_club; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.championship_club IS 'Club name for club championship tournaments';


--
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.championship_type; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.championship_type IS 'Type of championship: single_club, multi_club, regional';


--
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.participating_clubs; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.participating_clubs IS 'Comma-separated list of participating clubs';


--
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.min_club_participants; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.min_club_participants IS 'Minimum participants required per club';


--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.auto_group_clubs; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.auto_group_clubs IS 'Automatically group small clubs together';


--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.auto_seed_champions; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.auto_seed_champions IS 'Automatically seed from club champions';


--
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.championship_group_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.championship_group_id IS 'Groups related championship tournaments';


--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.gspro_course; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.gspro_course IS 'Name of the selected GSPro course for this tournament';


--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.gspro_course_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.gspro_course_id IS 'ID of the selected GSPro course from simulator_courses_combined table';


--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.trackman_course; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.trackman_course IS 'Name of the selected Trackman course for this tournament';


--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN tournaments.trackman_course_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.tournaments.trackman_course_id IS 'ID of the selected Trackman course from simulator_courses_combined table';


--
-- TOC entry 291 (class 1259 OID 23608)
-- Name: championship_hierarchy; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.championship_hierarchy AS
 SELECT cg.id AS group_id,
    cg.name AS group_name,
    cg.championship_type,
    cg.parent_group_id,
    parent.name AS parent_group_name,
    count(t.id) AS tournament_count,
    count(
        CASE
            WHEN t.is_club_championship THEN 1
            ELSE NULL::integer
        END) AS club_championships,
    count(
        CASE
            WHEN t.is_national_tournament THEN 1
            ELSE NULL::integer
        END) AS national_championships
   FROM ((public.championship_groups cg
     LEFT JOIN public.championship_groups parent ON ((cg.parent_group_id = parent.id)))
     LEFT JOIN public.tournaments t ON ((t.championship_group_id = cg.id)))
  GROUP BY cg.id, cg.name, cg.championship_type, cg.parent_group_id, parent.name
  ORDER BY cg.parent_group_id, cg.id;


ALTER VIEW public.championship_hierarchy OWNER TO golfos_user;

--
-- TOC entry 275 (class 1259 OID 23349)
-- Name: club_championship_participants; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.club_championship_participants (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    user_id integer NOT NULL,
    club character varying(100) NOT NULL,
    round_1_score integer,
    round_2_score integer,
    round_3_score integer,
    total_score integer,
    championship_rank integer,
    is_club_champion boolean DEFAULT false,
    round_1_completed boolean DEFAULT false,
    round_2_completed boolean DEFAULT false,
    round_3_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    club_group character varying(100),
    is_group_champion boolean DEFAULT false,
    group_rank integer,
    qualified_for_national boolean DEFAULT false,
    match_wins integer DEFAULT 0,
    match_losses integer DEFAULT 0,
    match_ties integer DEFAULT 0,
    total_matches integer DEFAULT 0,
    tiebreaker_points integer DEFAULT 0,
    total_holes_won integer DEFAULT 0,
    total_holes_lost integer DEFAULT 0,
    net_holes integer DEFAULT 0,
    group_id integer
);


ALTER TABLE public.club_championship_participants OWNER TO golfos_user;

--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE club_championship_participants; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.club_championship_participants IS 'Tracks participants and scores for club championship tournaments';


--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.round_1_score; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.round_1_score IS 'Score for round 1 of club championship';


--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.round_2_score; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.round_2_score IS 'Score for round 2 of club championship';


--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.round_3_score; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.round_3_score IS 'Score for round 3 of club championship';


--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.total_score; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.total_score IS 'Sum of all three rounds';


--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.championship_rank; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.championship_rank IS 'Final ranking in club championship';


--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.is_club_champion; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.is_club_champion IS 'True if this participant won their club championship';


--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.match_wins; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.match_wins IS 'Number of match play wins';


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.match_losses; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.match_losses IS 'Number of match play losses';


--
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.match_ties; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.match_ties IS 'Number of match play ties';


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.total_matches; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.total_matches IS 'Total number of matches played';


--
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.tiebreaker_points; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.tiebreaker_points IS 'Cumulative holes won for tiebreaking (e.g., 3up with 2 to play = 3 points)';


--
-- TOC entry 4252 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.total_holes_won; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.total_holes_won IS 'Total holes won across all matches';


--
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.total_holes_lost; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.total_holes_lost IS 'Total holes lost across all matches';


--
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.net_holes; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.net_holes IS 'Net holes (total_holes_won - total_holes_lost)';


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN club_championship_participants.group_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_participants.group_id IS 'ID of the club group this participant belongs to';


--
-- TOC entry 216 (class 1259 OID 16398)
-- Name: users; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.users (
    member_id integer NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    email_address character varying(255),
    club character varying(100),
    role character varying(50),
    password_hash character varying(255),
    handicap numeric(5,2) DEFAULT 0,
    sim_handicap numeric(5,2) DEFAULT 0,
    grass_handicap numeric(5,2) DEFAULT 0,
    profile_photo_url character varying(255),
    created_at date,
    role_id integer,
    CONSTRAINT valid_role_check CHECK (((role)::text = ANY ((ARRAY['Member'::character varying, 'Admin'::character varying, 'Club Pro'::character varying, 'Ambassador'::character varying, 'Deactivated'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO golfos_user;

--
-- TOC entry 282 (class 1259 OID 23469)
-- Name: championship_leaderboard; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.championship_leaderboard AS
 SELECT ccp.tournament_id,
    ccp.user_id,
    u.first_name,
    u.last_name,
    u.club,
    ccp.round_1_score,
    ccp.round_2_score,
    ccp.round_3_score,
    ccp.total_score,
    ccp.championship_rank,
    ccp.is_club_champion,
    t.name AS tournament_name,
    t.is_club_championship,
    t.is_national_tournament
   FROM ((public.club_championship_participants ccp
     JOIN public.users u ON ((ccp.user_id = u.member_id)))
     JOIN public.tournaments t ON ((ccp.tournament_id = t.id)))
  ORDER BY ccp.tournament_id, ccp.championship_rank;


ALTER VIEW public.championship_leaderboard OWNER TO golfos_user;

--
-- TOC entry 281 (class 1259 OID 23429)
-- Name: championship_matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.championship_matches (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    round_id integer NOT NULL,
    player1_id integer NOT NULL,
    player2_id integer,
    player1_score integer,
    player2_score integer,
    winner_id integer,
    match_status character varying(50) DEFAULT 'pending'::character varying,
    match_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.championship_matches OWNER TO golfos_user;

--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE championship_matches; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.championship_matches IS 'Tracks individual matches in championship tournaments';


--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN championship_matches.player2_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.championship_matches.player2_id IS 'NULL for bye rounds where player1 advances automatically';


--
-- TOC entry 280 (class 1259 OID 23428)
-- Name: championship_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.championship_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.championship_matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4258 (class 0 OID 0)
-- Dependencies: 280
-- Name: championship_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.championship_matches_id_seq OWNED BY public.championship_matches.id;


--
-- TOC entry 289 (class 1259 OID 23573)
-- Name: championship_progression; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.championship_progression (
    id integer NOT NULL,
    club_championship_id integer NOT NULL,
    national_championship_id integer NOT NULL,
    club_group character varying(100) NOT NULL,
    club_champion_id integer NOT NULL,
    seed_number integer,
    progression_status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.championship_progression OWNER TO golfos_user;

--
-- TOC entry 288 (class 1259 OID 23572)
-- Name: championship_progression_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.championship_progression_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.championship_progression_id_seq OWNER TO golfos_user;

--
-- TOC entry 4259 (class 0 OID 0)
-- Dependencies: 288
-- Name: championship_progression_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.championship_progression_id_seq OWNED BY public.championship_progression.id;


--
-- TOC entry 279 (class 1259 OID 23411)
-- Name: championship_rounds; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.championship_rounds (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    round_number integer NOT NULL,
    round_name character varying(100) NOT NULL,
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.championship_rounds OWNER TO golfos_user;

--
-- TOC entry 4260 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE championship_rounds; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.championship_rounds IS 'Tracks individual rounds within championship tournaments';


--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN championship_rounds.round_name; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.championship_rounds.round_name IS 'Name of the round (e.g., "Round 1", "Quarterfinals", "Semifinals")';


--
-- TOC entry 278 (class 1259 OID 23410)
-- Name: championship_rounds_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.championship_rounds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.championship_rounds_id_seq OWNER TO golfos_user;

--
-- TOC entry 4262 (class 0 OID 0)
-- Dependencies: 278
-- Name: championship_rounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.championship_rounds_id_seq OWNED BY public.championship_rounds.id;


--
-- TOC entry 227 (class 1259 OID 16595)
-- Name: check_ins; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.check_ins (
    id integer NOT NULL,
    tournament_id integer,
    user_member_id integer,
    check_in_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    check_out_time timestamp without time zone,
    status character varying(50) DEFAULT 'checked_in'::character varying,
    notes text
);


ALTER TABLE public.check_ins OWNER TO golfos_user;

--
-- TOC entry 226 (class 1259 OID 16594)
-- Name: check_ins_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.check_ins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.check_ins_id_seq OWNER TO golfos_user;

--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 226
-- Name: check_ins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.check_ins_id_seq OWNED BY public.check_ins.id;


--
-- TOC entry 292 (class 1259 OID 23613)
-- Name: club_champion_qualifications; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.club_champion_qualifications AS
 SELECT ccp.tournament_id,
    ccp.club_group,
    ccp.user_id,
    u.first_name,
    u.last_name,
    u.club,
    ccp.total_score,
    ccp.championship_rank,
    ccp.is_club_champion,
    ccp.qualified_for_national,
    t.name AS tournament_name,
    t.is_club_championship,
    t.is_national_tournament
   FROM ((public.club_championship_participants ccp
     JOIN public.users u ON ((ccp.user_id = u.member_id)))
     JOIN public.tournaments t ON ((ccp.tournament_id = t.id)))
  WHERE (ccp.is_club_champion = true)
  ORDER BY ccp.tournament_id, ccp.championship_rank;


ALTER VIEW public.club_champion_qualifications OWNER TO golfos_user;

--
-- TOC entry 294 (class 1259 OID 23630)
-- Name: club_championship_matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.club_championship_matches (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    club_group character varying(100) NOT NULL,
    player1_id integer NOT NULL,
    player2_id integer NOT NULL,
    match_number integer NOT NULL,
    player1_holes_won integer DEFAULT 0,
    player2_holes_won integer DEFAULT 0,
    player1_holes_lost integer DEFAULT 0,
    player2_holes_lost integer DEFAULT 0,
    player1_net_holes integer DEFAULT 0,
    player2_net_holes integer DEFAULT 0,
    winner_id integer,
    match_status character varying(50) DEFAULT 'pending'::character varying,
    match_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    player1_hole_scores jsonb,
    player2_hole_scores jsonb,
    player1_net_hole_scores jsonb,
    player2_net_hole_scores jsonb,
    course_id integer,
    teebox character varying(50),
    player1_scorecard_photo_url text,
    player2_scorecard_photo_url text
);


ALTER TABLE public.club_championship_matches OWNER TO golfos_user;

--
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE club_championship_matches; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.club_championship_matches IS 'Tracks individual match play results for club championships';


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.match_number; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.match_number IS 'Match number within the 3-match series (1, 2, or 3)';


--
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_holes_won; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_holes_won IS 'Total holes won by player 1';


--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_holes_won; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_holes_won IS 'Total holes won by player 2';


--
-- TOC entry 4268 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_holes_lost; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_holes_lost IS 'Total holes lost by player 1';


--
-- TOC entry 4269 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_holes_lost; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_holes_lost IS 'Total holes lost by player 2';


--
-- TOC entry 4270 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_net_holes; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_net_holes IS 'Net holes won by player 1 (holes_won - holes_lost)';


--
-- TOC entry 4271 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_net_holes; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_net_holes IS 'Net holes won by player 2 (holes_won - holes_lost)';


--
-- TOC entry 4272 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_hole_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_hole_scores IS 'JSON array of gross scores for each hole for player 1';


--
-- TOC entry 4273 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_hole_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_hole_scores IS 'JSON array of gross scores for each hole for player 2';


--
-- TOC entry 4274 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_net_hole_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_net_hole_scores IS 'JSON array of net scores for each hole for player 1 (after handicap)';


--
-- TOC entry 4275 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_net_hole_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_net_hole_scores IS 'JSON array of net scores for each hole for player 2 (after handicap)';


--
-- TOC entry 4276 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.course_id; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.course_id IS 'ID of the course where the match was played';


--
-- TOC entry 4277 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.teebox; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.teebox IS 'Teebox used for the match';


--
-- TOC entry 4278 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player1_scorecard_photo_url; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player1_scorecard_photo_url IS 'URL of the scorecard photo uploaded by player 1';


--
-- TOC entry 4279 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN club_championship_matches.player2_scorecard_photo_url; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_championship_matches.player2_scorecard_photo_url IS 'URL of the scorecard photo uploaded by player 2';


--
-- TOC entry 293 (class 1259 OID 23629)
-- Name: club_championship_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.club_championship_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.club_championship_matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4280 (class 0 OID 0)
-- Dependencies: 293
-- Name: club_championship_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.club_championship_matches_id_seq OWNED BY public.club_championship_matches.id;


--
-- TOC entry 274 (class 1259 OID 23348)
-- Name: club_championship_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.club_championship_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.club_championship_participants_id_seq OWNER TO golfos_user;

--
-- TOC entry 4281 (class 0 OID 0)
-- Dependencies: 274
-- Name: club_championship_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.club_championship_participants_id_seq OWNED BY public.club_championship_participants.id;


--
-- TOC entry 287 (class 1259 OID 23553)
-- Name: club_groups; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.club_groups (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    group_name character varying(255) NOT NULL,
    participating_clubs text[] NOT NULL,
    min_participants integer DEFAULT 4,
    max_participants integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    participant_count integer DEFAULT 0,
    user_ids integer[] DEFAULT '{}'::integer[]
);


ALTER TABLE public.club_groups OWNER TO golfos_user;

--
-- TOC entry 4282 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN club_groups.participant_count; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.club_groups.participant_count IS 'Actual number of participants in this group';


--
-- TOC entry 286 (class 1259 OID 23552)
-- Name: club_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.club_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.club_groups_id_seq OWNER TO golfos_user;

--
-- TOC entry 4283 (class 0 OID 0)
-- Dependencies: 286
-- Name: club_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.club_groups_id_seq OWNED BY public.club_groups.id;


--
-- TOC entry 220 (class 1259 OID 16433)
-- Name: participation; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.participation (
    id integer NOT NULL,
    user_member_id integer,
    tournament_id integer,
    payment_submitted boolean DEFAULT false,
    payment_method character varying(50),
    payment_amount numeric(10,2),
    payment_notes text,
    payment_submitted_at timestamp without time zone
);


ALTER TABLE public.participation OWNER TO golfos_user;

--
-- TOC entry 4284 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN participation.payment_submitted; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.participation.payment_submitted IS 'Whether payment has been submitted';


--
-- TOC entry 4285 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN participation.payment_method; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.participation.payment_method IS 'Payment method: venmo, etc.';


--
-- TOC entry 4286 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN participation.payment_amount; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.participation.payment_amount IS 'Payment amount in dollars';


--
-- TOC entry 4287 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN participation.payment_notes; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.participation.payment_notes IS 'User notes about payment';


--
-- TOC entry 4288 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN participation.payment_submitted_at; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.participation.payment_submitted_at IS 'Timestamp when payment was submitted';


--
-- TOC entry 290 (class 1259 OID 23603)
-- Name: club_participant_counts; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.club_participant_counts AS
 SELECT t.id AS tournament_id,
    t.name AS tournament_name,
    u.club,
    count(p.user_member_id) AS participant_count
   FROM ((public.tournaments t
     JOIN public.participation p ON ((t.id = p.tournament_id)))
     JOIN public.users u ON ((p.user_member_id = u.member_id)))
  WHERE (t.is_club_championship = true)
  GROUP BY t.id, t.name, u.club
  ORDER BY t.id, (count(p.user_member_id)) DESC;


ALTER VIEW public.club_participant_counts OWNER TO golfos_user;

--
-- TOC entry 241 (class 1259 OID 17326)
-- Name: course_records; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.course_records (
    id integer NOT NULL,
    course_id integer,
    club character varying(50),
    user_id integer,
    scorecard_id integer,
    total_strokes integer NOT NULL,
    date_played date NOT NULL,
    is_current boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.course_records OWNER TO golfos_user;

--
-- TOC entry 240 (class 1259 OID 17325)
-- Name: course_records_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.course_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_records_id_seq OWNER TO golfos_user;

--
-- TOC entry 4289 (class 0 OID 0)
-- Dependencies: 240
-- Name: course_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.course_records_id_seq OWNED BY public.course_records.id;


--
-- TOC entry 235 (class 1259 OID 16963)
-- Name: gspro_courses; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.gspro_courses (
    id integer NOT NULL,
    server character varying(100),
    name character varying(255) NOT NULL,
    updated_date date,
    location character varying(255),
    designer character varying(255),
    elevation integer,
    is_par3 boolean DEFAULT false,
    is_beginner boolean DEFAULT false,
    is_coastal boolean DEFAULT false,
    is_desert boolean DEFAULT false,
    is_fantasy boolean DEFAULT false,
    is_heathland boolean DEFAULT false,
    is_historic boolean DEFAULT false,
    is_links boolean DEFAULT false,
    is_lowpoly boolean DEFAULT false,
    is_major_venue boolean DEFAULT false,
    is_mountain boolean DEFAULT false,
    is_parkland boolean DEFAULT false,
    is_tour_stop boolean DEFAULT false,
    is_training boolean DEFAULT false,
    is_tropical boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gspro_courses OWNER TO golfos_user;

--
-- TOC entry 234 (class 1259 OID 16962)
-- Name: gspro_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.gspro_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gspro_courses_id_seq OWNER TO golfos_user;

--
-- TOC entry 4290 (class 0 OID 0)
-- Dependencies: 234
-- Name: gspro_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.gspro_courses_id_seq OWNED BY public.gspro_courses.id;


--
-- TOC entry 224 (class 1259 OID 16497)
-- Name: league_participants; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.league_participants (
    id integer NOT NULL,
    user_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.league_participants OWNER TO golfos_user;

--
-- TOC entry 223 (class 1259 OID 16496)
-- Name: league_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.league_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.league_participants_id_seq OWNER TO golfos_user;

--
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 223
-- Name: league_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.league_participants_id_seq OWNED BY public.league_participants.id;


--
-- TOC entry 222 (class 1259 OID 16483)
-- Name: league_settings; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.league_settings (
    id integer NOT NULL,
    name character varying(255) DEFAULT 'Weekly Match Play League'::character varying NOT NULL,
    description text,
    min_matches integer DEFAULT 3,
    scoring_rules jsonb DEFAULT '{"tie": 1, "win": 3, "loss": 0}'::jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tournament_date date
);


ALTER TABLE public.league_settings OWNER TO golfos_user;

--
-- TOC entry 221 (class 1259 OID 16482)
-- Name: league_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.league_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.league_settings_id_seq OWNER TO golfos_user;

--
-- TOC entry 4292 (class 0 OID 0)
-- Dependencies: 221
-- Name: league_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.league_settings_id_seq OWNED BY public.league_settings.id;


--
-- TOC entry 233 (class 1259 OID 16694)
-- Name: matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    player1_id integer,
    player2_id integer,
    scores jsonb NOT NULL,
    winner character varying(255),
    match_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.matches OWNER TO golfos_user;

--
-- TOC entry 232 (class 1259 OID 16693)
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4293 (class 0 OID 0)
-- Dependencies: 232
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- TOC entry 277 (class 1259 OID 23378)
-- Name: national_tournament_seeding; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.national_tournament_seeding (
    id integer NOT NULL,
    national_tournament_id integer NOT NULL,
    club_championship_id integer NOT NULL,
    club character varying(100) NOT NULL,
    club_champion_id integer NOT NULL,
    seed_number integer NOT NULL,
    bracket_position integer,
    eliminated_round integer,
    is_eliminated boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.national_tournament_seeding OWNER TO golfos_user;

--
-- TOC entry 4294 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE national_tournament_seeding; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.national_tournament_seeding IS 'Tracks seeding and progression of club champions in national tournament';


--
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN national_tournament_seeding.seed_number; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.national_tournament_seeding.seed_number IS 'Seeding position in national tournament bracket';


--
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN national_tournament_seeding.bracket_position; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.national_tournament_seeding.bracket_position IS 'Position in single-elimination bracket';


--
-- TOC entry 4297 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN national_tournament_seeding.eliminated_round; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.national_tournament_seeding.eliminated_round IS 'Round number when eliminated (null if still active)';


--
-- TOC entry 283 (class 1259 OID 23474)
-- Name: national_tournament_bracket; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.national_tournament_bracket AS
 SELECT nts.id,
    nts.national_tournament_id,
    nts.club,
    nts.club_champion_id,
    u.first_name,
    u.last_name,
    nts.seed_number,
    nts.bracket_position,
    nts.eliminated_round,
    nts.is_eliminated,
    t.name AS national_tournament_name
   FROM ((public.national_tournament_seeding nts
     JOIN public.users u ON ((nts.club_champion_id = u.member_id)))
     JOIN public.tournaments t ON ((nts.national_tournament_id = t.id)))
  ORDER BY nts.seed_number;


ALTER VIEW public.national_tournament_bracket OWNER TO golfos_user;

--
-- TOC entry 276 (class 1259 OID 23377)
-- Name: national_tournament_seeding_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.national_tournament_seeding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.national_tournament_seeding_id_seq OWNER TO golfos_user;

--
-- TOC entry 4298 (class 0 OID 0)
-- Dependencies: 276
-- Name: national_tournament_seeding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.national_tournament_seeding_id_seq OWNED BY public.national_tournament_seeding.id;


--
-- TOC entry 219 (class 1259 OID 16432)
-- Name: participation_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.participation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participation_id_seq OWNER TO golfos_user;

--
-- TOC entry 4299 (class 0 OID 0)
-- Dependencies: 219
-- Name: participation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.participation_id_seq OWNED BY public.participation.id;


--
-- TOC entry 304 (class 1259 OID 25624)
-- Name: permission_audit_log; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.permission_audit_log (
    id integer NOT NULL,
    action character varying(50) NOT NULL,
    role_id integer,
    permission_id integer,
    admin_user_id integer,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permission_audit_log OWNER TO golfos_user;

--
-- TOC entry 303 (class 1259 OID 25623)
-- Name: permission_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.permission_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permission_audit_log_id_seq OWNER TO golfos_user;

--
-- TOC entry 4300 (class 0 OID 0)
-- Dependencies: 303
-- Name: permission_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.permission_audit_log_id_seq OWNED BY public.permission_audit_log.id;


--
-- TOC entry 296 (class 1259 OID 25549)
-- Name: permissions; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    permission_key character varying(100) NOT NULL,
    permission_name character varying(100) NOT NULL,
    description text,
    category character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO golfos_user;

--
-- TOC entry 295 (class 1259 OID 25548)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO golfos_user;

--
-- TOC entry 4301 (class 0 OID 0)
-- Dependencies: 295
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 267 (class 1259 OID 20932)
-- Name: registration_form_responses; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.registration_form_responses (
    id integer NOT NULL,
    tournament_id integer,
    user_member_id integer,
    form_data jsonb NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.registration_form_responses OWNER TO golfos_user;

--
-- TOC entry 266 (class 1259 OID 20931)
-- Name: registration_form_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.registration_form_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registration_form_responses_id_seq OWNER TO golfos_user;

--
-- TOC entry 4302 (class 0 OID 0)
-- Dependencies: 266
-- Name: registration_form_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.registration_form_responses_id_seq OWNED BY public.registration_form_responses.id;


--
-- TOC entry 298 (class 1259 OID 25562)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO golfos_user;

--
-- TOC entry 297 (class 1259 OID 25561)
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO golfos_user;

--
-- TOC entry 4303 (class 0 OID 0)
-- Dependencies: 297
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- TOC entry 300 (class 1259 OID 25586)
-- Name: roles; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    role_key character varying(50) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO golfos_user;

--
-- TOC entry 301 (class 1259 OID 25613)
-- Name: role_permissions_view; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.role_permissions_view AS
 SELECT r.id AS role_id,
    r.role_name,
    r.role_key,
    p.id AS permission_id,
    p.permission_key,
    p.permission_name,
    p.description AS permission_description,
    p.category
   FROM ((public.roles r
     LEFT JOIN public.role_permissions rp ON ((r.id = rp.role_id)))
     LEFT JOIN public.permissions p ON ((rp.permission_id = p.id)))
  WHERE (r.is_active = true)
  ORDER BY r.role_name, p.category, p.permission_name;


ALTER VIEW public.role_permissions_view OWNER TO golfos_user;

--
-- TOC entry 299 (class 1259 OID 25585)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO golfos_user;

--
-- TOC entry 4304 (class 0 OID 0)
-- Dependencies: 299
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 231 (class 1259 OID 16674)
-- Name: scorecards; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.scorecards (
    id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    player_name character varying(255) NOT NULL,
    date_played date NOT NULL,
    handicap numeric(5,2) DEFAULT 0,
    scores jsonb NOT NULL,
    total_strokes integer DEFAULT 0,
    total_mulligans integer DEFAULT 0,
    final_score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    teebox character varying(100),
    course_rating numeric,
    course_slope integer,
    software character varying(100),
    course_name character varying(255),
    differential numeric,
    csv_timestamp character varying(50),
    round_type character varying(20) DEFAULT 'sim'::character varying,
    course_id integer,
    teams jsonb,
    team_scores jsonb,
    scramble_data jsonb,
    holes_played integer DEFAULT 18,
    nine_type character varying(10) DEFAULT NULL::character varying,
    tournament_id integer,
    CONSTRAINT scorecards_round_type_check CHECK (((round_type)::text = ANY ((ARRAY['sim'::character varying, 'grass'::character varying, 'scramble'::character varying])::text[]))),
    CONSTRAINT scorecards_type_check CHECK (((type)::text = ANY ((ARRAY['stroke_play'::character varying, 'mully_golf'::character varying, 'scramble'::character varying])::text[])))
);


ALTER TABLE public.scorecards OWNER TO golfos_user;

--
-- TOC entry 230 (class 1259 OID 16673)
-- Name: scorecards_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.scorecards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scorecards_id_seq OWNER TO golfos_user;

--
-- TOC entry 4305 (class 0 OID 0)
-- Dependencies: 230
-- Name: scorecards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.scorecards_id_seq OWNED BY public.scorecards.id;


--
-- TOC entry 239 (class 1259 OID 17102)
-- Name: simulator_courses_combined; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.simulator_courses_combined (
    id integer NOT NULL,
    name text NOT NULL,
    platforms text[] NOT NULL,
    gspro_id integer,
    trackman_id integer,
    location text,
    designer text,
    elevation integer,
    course_types text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    par_values jsonb,
    teebox_data jsonb DEFAULT '[]'::jsonb,
    hole_indexes jsonb
);


ALTER TABLE public.simulator_courses_combined OWNER TO golfos_user;

--
-- TOC entry 4306 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN simulator_courses_combined.hole_indexes; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON COLUMN public.simulator_courses_combined.hole_indexes IS 'Array of handicap indexes for each hole (1-18) for proper scoring calculations';


--
-- TOC entry 305 (class 1259 OID 25779)
-- Name: scorecards_with_courses; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.scorecards_with_courses AS
 SELECT s.id,
    s.user_id,
    s.type,
    s.player_name,
    s.date_played,
    s.handicap,
    s.scores,
    s.total_strokes,
    s.total_mulligans,
    s.final_score,
    s.created_at,
    s.teebox,
    s.course_rating,
    s.course_slope,
    s.software,
    s.course_name,
    s.differential,
    s.csv_timestamp,
    s.round_type,
    s.course_id,
    s.teams,
    s.team_scores,
    s.scramble_data,
    s.holes_played,
    s.nine_type,
    s.tournament_id,
    c.name AS course_full_name,
    c.platforms AS course_platforms,
    c.location AS course_location,
    c.designer AS course_designer,
    c.elevation AS course_elevation,
    c.course_types
   FROM (public.scorecards s
     LEFT JOIN public.simulator_courses_combined c ON ((s.course_id = c.id)))
  ORDER BY s.date_played DESC, s.created_at DESC;


ALTER VIEW public.scorecards_with_courses OWNER TO golfos_user;

--
-- TOC entry 257 (class 1259 OID 19779)
-- Name: simulator_bookings; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.simulator_bookings (
    id integer NOT NULL,
    user_id integer,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(10) DEFAULT 'solo'::character varying,
    participants integer[] DEFAULT '{}'::integer[],
    bay integer DEFAULT 1
);


ALTER TABLE public.simulator_bookings OWNER TO golfos_user;

--
-- TOC entry 256 (class 1259 OID 19778)
-- Name: simulator_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.simulator_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.simulator_bookings_id_seq OWNER TO golfos_user;

--
-- TOC entry 4307 (class 0 OID 0)
-- Dependencies: 256
-- Name: simulator_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.simulator_bookings_id_seq OWNED BY public.simulator_bookings.id;


--
-- TOC entry 238 (class 1259 OID 17101)
-- Name: simulator_courses_combined_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.simulator_courses_combined_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.simulator_courses_combined_id_seq OWNER TO golfos_user;

--
-- TOC entry 4308 (class 0 OID 0)
-- Dependencies: 238
-- Name: simulator_courses_combined_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.simulator_courses_combined_id_seq OWNED BY public.simulator_courses_combined.id;


--
-- TOC entry 249 (class 1259 OID 18250)
-- Name: team_match_scores; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.team_match_scores (
    id integer NOT NULL,
    team_match_id integer NOT NULL,
    team_id integer NOT NULL,
    player_id integer NOT NULL,
    hole_number integer NOT NULL,
    score integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.team_match_scores OWNER TO golfos_user;

--
-- TOC entry 248 (class 1259 OID 18249)
-- Name: team_match_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.team_match_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_match_scores_id_seq OWNER TO golfos_user;

--
-- TOC entry 4309 (class 0 OID 0)
-- Dependencies: 248
-- Name: team_match_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.team_match_scores_id_seq OWNED BY public.team_match_scores.id;


--
-- TOC entry 247 (class 1259 OID 18212)
-- Name: team_matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.team_matches (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    team1_id integer NOT NULL,
    team2_id integer NOT NULL,
    round_number integer DEFAULT 1,
    match_number integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    winner_team_id integer,
    match_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.team_matches OWNER TO golfos_user;

--
-- TOC entry 246 (class 1259 OID 18211)
-- Name: team_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.team_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4310 (class 0 OID 0)
-- Dependencies: 246
-- Name: team_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.team_matches_id_seq OWNED BY public.team_matches.id;


--
-- TOC entry 245 (class 1259 OID 18034)
-- Name: team_members; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    team_id integer NOT NULL,
    user_member_id integer NOT NULL,
    is_captain boolean DEFAULT false,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tournament_id integer NOT NULL
);


ALTER TABLE public.team_members OWNER TO golfos_user;

--
-- TOC entry 4311 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE team_members; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.team_members IS 'Members of tournament teams (including captain)';


--
-- TOC entry 244 (class 1259 OID 18033)
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_id_seq OWNER TO golfos_user;

--
-- TOC entry 4312 (class 0 OID 0)
-- Dependencies: 244
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- TOC entry 251 (class 1259 OID 18278)
-- Name: team_standings; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.team_standings (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    team_id integer NOT NULL,
    matches_played integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    ties integer DEFAULT 0,
    total_points integer DEFAULT 0,
    total_score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.team_standings OWNER TO golfos_user;

--
-- TOC entry 250 (class 1259 OID 18277)
-- Name: team_standings_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.team_standings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_standings_id_seq OWNER TO golfos_user;

--
-- TOC entry 4313 (class 0 OID 0)
-- Dependencies: 250
-- Name: team_standings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.team_standings_id_seq OWNED BY public.team_standings.id;


--
-- TOC entry 229 (class 1259 OID 16618)
-- Name: tournament_matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_matches (
    id integer NOT NULL,
    tournament_id integer,
    player1_id integer,
    player2_id integer,
    round_number integer DEFAULT 1,
    match_number integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    winner_id integer,
    scores jsonb,
    match_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    group_number integer
);


ALTER TABLE public.tournament_matches OWNER TO golfos_user;

--
-- TOC entry 228 (class 1259 OID 16617)
-- Name: tournament_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4314 (class 0 OID 0)
-- Dependencies: 228
-- Name: tournament_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournament_matches_id_seq OWNED BY public.tournament_matches.id;


--
-- TOC entry 263 (class 1259 OID 20604)
-- Name: tournament_round_participants; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_round_participants (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    round_id integer NOT NULL,
    user_member_id integer NOT NULL,
    registration_type character varying(50) DEFAULT 'full_tournament'::character varying,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered'::character varying
);


ALTER TABLE public.tournament_round_participants OWNER TO golfos_user;

--
-- TOC entry 4315 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE tournament_round_participants; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.tournament_round_participants IS 'Participants for individual tournament rounds';


--
-- TOC entry 262 (class 1259 OID 20603)
-- Name: tournament_round_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_round_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_round_participants_id_seq OWNER TO golfos_user;

--
-- TOC entry 4316 (class 0 OID 0)
-- Dependencies: 262
-- Name: tournament_round_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournament_round_participants_id_seq OWNED BY public.tournament_round_participants.id;


--
-- TOC entry 265 (class 1259 OID 20631)
-- Name: tournament_round_scores; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_round_scores (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    round_id integer NOT NULL,
    user_member_id integer NOT NULL,
    scorecard_id integer,
    total_score integer,
    hole_scores jsonb,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    submitted_by integer,
    notes text
);


ALTER TABLE public.tournament_round_scores OWNER TO golfos_user;

--
-- TOC entry 4317 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE tournament_round_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.tournament_round_scores IS 'Scores for individual tournament rounds';


--
-- TOC entry 264 (class 1259 OID 20630)
-- Name: tournament_round_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_round_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_round_scores_id_seq OWNER TO golfos_user;

--
-- TOC entry 4318 (class 0 OID 0)
-- Dependencies: 264
-- Name: tournament_round_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournament_round_scores_id_seq OWNED BY public.tournament_round_scores.id;


--
-- TOC entry 261 (class 1259 OID 20579)
-- Name: tournament_rounds; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_rounds (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    round_number integer NOT NULL,
    round_name character varying(255),
    start_date date,
    end_date date,
    registration_deadline date,
    max_participants integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    registration_open boolean DEFAULT true,
    course_id integer,
    course_name character varying(255),
    location character varying(255),
    rules text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tournament_rounds OWNER TO golfos_user;

--
-- TOC entry 4319 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE tournament_rounds; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.tournament_rounds IS 'Individual rounds/weeks within a multi-round tournament';


--
-- TOC entry 260 (class 1259 OID 20578)
-- Name: tournament_rounds_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_rounds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_rounds_id_seq OWNER TO golfos_user;

--
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 260
-- Name: tournament_rounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournament_rounds_id_seq OWNED BY public.tournament_rounds.id;


--
-- TOC entry 254 (class 1259 OID 19169)
-- Name: tournament_team_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_team_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tournament_team_scores_id_seq OWNER TO golfos_user;

--
-- TOC entry 255 (class 1259 OID 19170)
-- Name: tournament_team_scores; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_team_scores (
    id integer DEFAULT nextval('public.tournament_team_scores_id_seq'::regclass) NOT NULL,
    team_id integer NOT NULL,
    tournament_id integer NOT NULL,
    total_score integer,
    hole_scores jsonb,
    submitted_by integer NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tournament_team_scores OWNER TO golfos_user;

--
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE tournament_team_scores; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.tournament_team_scores IS 'Scores submitted by team captains for scramble tournaments';


--
-- TOC entry 243 (class 1259 OID 18013)
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.tournament_teams (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    captain_id integer,
    player_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tournament_teams OWNER TO golfos_user;

--
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE tournament_teams; Type: COMMENT; Schema: public; Owner: golfos_user
--

COMMENT ON TABLE public.tournament_teams IS 'Teams formed for scramble tournaments';


--
-- TOC entry 242 (class 1259 OID 18012)
-- Name: tournament_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournament_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_teams_id_seq OWNER TO golfos_user;

--
-- TOC entry 4323 (class 0 OID 0)
-- Dependencies: 242
-- Name: tournament_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournament_teams_id_seq OWNED BY public.tournament_teams.id;


--
-- TOC entry 217 (class 1259 OID 16423)
-- Name: tournaments_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.tournaments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournaments_id_seq OWNER TO golfos_user;

--
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 217
-- Name: tournaments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.tournaments_id_seq OWNED BY public.tournaments.id;


--
-- TOC entry 237 (class 1259 OID 17028)
-- Name: trackman_courses; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.trackman_courses (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.trackman_courses OWNER TO golfos_user;

--
-- TOC entry 236 (class 1259 OID 17027)
-- Name: trackman_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.trackman_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trackman_courses_id_seq OWNER TO golfos_user;

--
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 236
-- Name: trackman_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.trackman_courses_id_seq OWNED BY public.trackman_courses.id;


--
-- TOC entry 302 (class 1259 OID 25618)
-- Name: user_permissions_view; Type: VIEW; Schema: public; Owner: golfos_user
--

CREATE VIEW public.user_permissions_view AS
 SELECT u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    r.role_name,
    r.role_key,
    p.permission_key,
    p.permission_name,
    p.category
   FROM (((public.users u
     LEFT JOIN public.roles r ON ((u.role_id = r.id)))
     LEFT JOIN public.role_permissions rp ON ((r.id = rp.role_id)))
     LEFT JOIN public.permissions p ON ((rp.permission_id = p.id)))
  WHERE (r.is_active = true);


ALTER VIEW public.user_permissions_view OWNER TO golfos_user;

--
-- TOC entry 225 (class 1259 OID 16512)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.user_profiles (
    user_id integer NOT NULL,
    total_matches integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    ties integer DEFAULT 0,
    total_points integer DEFAULT 0,
    win_rate numeric(5,2) DEFAULT 0.00,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_profiles OWNER TO golfos_user;

--
-- TOC entry 259 (class 1259 OID 20158)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO golfos_user;

--
-- TOC entry 258 (class 1259 OID 20157)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO golfos_user;

--
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 258
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- TOC entry 273 (class 1259 OID 21160)
-- Name: weekly_leaderboards; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.weekly_leaderboards (
    id integer NOT NULL,
    tournament_id integer,
    week_start_date date NOT NULL,
    user_id integer,
    total_hole_points numeric(5,2) DEFAULT 0,
    total_round_points numeric(5,2) DEFAULT 0,
    total_match_bonus numeric(5,2) DEFAULT 0,
    total_score numeric(5,2) DEFAULT 0,
    matches_played integer DEFAULT 0,
    matches_won integer DEFAULT 0,
    matches_tied integer DEFAULT 0,
    matches_lost integer DEFAULT 0,
    live_matches_played integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.weekly_leaderboards OWNER TO golfos_user;

--
-- TOC entry 272 (class 1259 OID 21159)
-- Name: weekly_leaderboards_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.weekly_leaderboards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_leaderboards_id_seq OWNER TO golfos_user;

--
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 272
-- Name: weekly_leaderboards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.weekly_leaderboards_id_seq OWNED BY public.weekly_leaderboards.id;


--
-- TOC entry 271 (class 1259 OID 21108)
-- Name: weekly_matches; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.weekly_matches (
    id integer NOT NULL,
    tournament_id integer,
    week_start_date date NOT NULL,
    player1_id integer,
    player2_id integer,
    player1_scorecard_id integer,
    player2_scorecard_id integer,
    hole_points_player1 numeric(5,2) DEFAULT 0,
    hole_points_player2 numeric(5,2) DEFAULT 0,
    round1_points_player1 numeric(5,2) DEFAULT 0,
    round1_points_player2 numeric(5,2) DEFAULT 0,
    round2_points_player1 numeric(5,2) DEFAULT 0,
    round2_points_player2 numeric(5,2) DEFAULT 0,
    round3_points_player1 numeric(5,2) DEFAULT 0,
    round3_points_player2 numeric(5,2) DEFAULT 0,
    match_winner_id integer,
    match_live_bonus_player1 numeric(5,2) DEFAULT 0,
    match_live_bonus_player2 numeric(5,2) DEFAULT 0,
    total_points_player1 numeric(5,2) DEFAULT 0,
    total_points_player2 numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    player1_scores jsonb,
    player2_scores jsonb,
    CONSTRAINT weekly_matches_player_order_chk CHECK ((player1_id < player2_id))
);


ALTER TABLE public.weekly_matches OWNER TO golfos_user;

--
-- TOC entry 270 (class 1259 OID 21107)
-- Name: weekly_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.weekly_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_matches_id_seq OWNER TO golfos_user;

--
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 270
-- Name: weekly_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.weekly_matches_id_seq OWNED BY public.weekly_matches.id;


--
-- TOC entry 269 (class 1259 OID 21084)
-- Name: weekly_scorecards; Type: TABLE; Schema: public; Owner: golfos_user
--

CREATE TABLE public.weekly_scorecards (
    id integer NOT NULL,
    user_id integer,
    tournament_id integer,
    week_start_date date NOT NULL,
    hole_scores jsonb NOT NULL,
    total_score integer NOT NULL,
    is_live boolean DEFAULT false,
    group_id character varying(50),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.weekly_scorecards OWNER TO golfos_user;

--
-- TOC entry 268 (class 1259 OID 21083)
-- Name: weekly_scorecards_id_seq; Type: SEQUENCE; Schema: public; Owner: golfos_user
--

CREATE SEQUENCE public.weekly_scorecards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_scorecards_id_seq OWNER TO golfos_user;

--
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 268
-- Name: weekly_scorecards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: golfos_user
--

ALTER SEQUENCE public.weekly_scorecards_id_seq OWNED BY public.weekly_scorecards.id;


--
-- TOC entry 3665 (class 2604 OID 23534)
-- Name: championship_groups id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_groups ALTER COLUMN id SET DEFAULT nextval('public.championship_groups_id_seq'::regclass);


--
-- TOC entry 3661 (class 2604 OID 23432)
-- Name: championship_matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches ALTER COLUMN id SET DEFAULT nextval('public.championship_matches_id_seq'::regclass);


--
-- TOC entry 3673 (class 2604 OID 23576)
-- Name: championship_progression id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression ALTER COLUMN id SET DEFAULT nextval('public.championship_progression_id_seq'::regclass);


--
-- TOC entry 3658 (class 2604 OID 23414)
-- Name: championship_rounds id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_rounds ALTER COLUMN id SET DEFAULT nextval('public.championship_rounds_id_seq'::regclass);


--
-- TOC entry 3512 (class 2604 OID 16598)
-- Name: check_ins id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.check_ins ALTER COLUMN id SET DEFAULT nextval('public.check_ins_id_seq'::regclass);


--
-- TOC entry 3677 (class 2604 OID 23633)
-- Name: club_championship_matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches ALTER COLUMN id SET DEFAULT nextval('public.club_championship_matches_id_seq'::regclass);


--
-- TOC entry 3637 (class 2604 OID 23352)
-- Name: club_championship_participants id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants ALTER COLUMN id SET DEFAULT nextval('public.club_championship_participants_id_seq'::regclass);


--
-- TOC entry 3668 (class 2604 OID 23556)
-- Name: club_groups id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_groups ALTER COLUMN id SET DEFAULT nextval('public.club_groups_id_seq'::regclass);


--
-- TOC entry 3555 (class 2604 OID 17329)
-- Name: course_records id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records ALTER COLUMN id SET DEFAULT nextval('public.course_records_id_seq'::regclass);


--
-- TOC entry 3532 (class 2604 OID 16966)
-- Name: gspro_courses id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.gspro_courses ALTER COLUMN id SET DEFAULT nextval('public.gspro_courses_id_seq'::regclass);


--
-- TOC entry 3502 (class 2604 OID 16500)
-- Name: league_participants id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_participants ALTER COLUMN id SET DEFAULT nextval('public.league_participants_id_seq'::regclass);


--
-- TOC entry 3496 (class 2604 OID 16486)
-- Name: league_settings id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_settings ALTER COLUMN id SET DEFAULT nextval('public.league_settings_id_seq'::regclass);


--
-- TOC entry 3529 (class 2604 OID 16697)
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- TOC entry 3654 (class 2604 OID 23381)
-- Name: national_tournament_seeding id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding ALTER COLUMN id SET DEFAULT nextval('public.national_tournament_seeding_id_seq'::regclass);


--
-- TOC entry 3494 (class 2604 OID 16436)
-- Name: participation id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.participation ALTER COLUMN id SET DEFAULT nextval('public.participation_id_seq'::regclass);


--
-- TOC entry 3697 (class 2604 OID 25627)
-- Name: permission_audit_log id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permission_audit_log ALTER COLUMN id SET DEFAULT nextval('public.permission_audit_log_id_seq'::regclass);


--
-- TOC entry 3687 (class 2604 OID 25552)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3604 (class 2604 OID 20935)
-- Name: registration_form_responses id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.registration_form_responses ALTER COLUMN id SET DEFAULT nextval('public.registration_form_responses_id_seq'::regclass);


--
-- TOC entry 3690 (class 2604 OID 25565)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 3692 (class 2604 OID 25589)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3520 (class 2604 OID 16677)
-- Name: scorecards id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.scorecards ALTER COLUMN id SET DEFAULT nextval('public.scorecards_id_seq'::regclass);


--
-- TOC entry 3586 (class 2604 OID 19782)
-- Name: simulator_bookings id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.simulator_bookings ALTER COLUMN id SET DEFAULT nextval('public.simulator_bookings_id_seq'::regclass);


--
-- TOC entry 3551 (class 2604 OID 17105)
-- Name: simulator_courses_combined id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.simulator_courses_combined ALTER COLUMN id SET DEFAULT nextval('public.simulator_courses_combined_id_seq'::regclass);


--
-- TOC entry 3573 (class 2604 OID 18253)
-- Name: team_match_scores id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores ALTER COLUMN id SET DEFAULT nextval('public.team_match_scores_id_seq'::regclass);


--
-- TOC entry 3567 (class 2604 OID 18215)
-- Name: team_matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches ALTER COLUMN id SET DEFAULT nextval('public.team_matches_id_seq'::regclass);


--
-- TOC entry 3564 (class 2604 OID 18037)
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- TOC entry 3575 (class 2604 OID 18281)
-- Name: team_standings id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_standings ALTER COLUMN id SET DEFAULT nextval('public.team_standings_id_seq'::regclass);


--
-- TOC entry 3515 (class 2604 OID 16621)
-- Name: tournament_matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches ALTER COLUMN id SET DEFAULT nextval('public.tournament_matches_id_seq'::regclass);


--
-- TOC entry 3598 (class 2604 OID 20607)
-- Name: tournament_round_participants id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants ALTER COLUMN id SET DEFAULT nextval('public.tournament_round_participants_id_seq'::regclass);


--
-- TOC entry 3602 (class 2604 OID 20634)
-- Name: tournament_round_scores id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores ALTER COLUMN id SET DEFAULT nextval('public.tournament_round_scores_id_seq'::regclass);


--
-- TOC entry 3593 (class 2604 OID 20582)
-- Name: tournament_rounds id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_rounds ALTER COLUMN id SET DEFAULT nextval('public.tournament_rounds_id_seq'::regclass);


--
-- TOC entry 3559 (class 2604 OID 18016)
-- Name: tournament_teams id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_teams ALTER COLUMN id SET DEFAULT nextval('public.tournament_teams_id_seq'::regclass);


--
-- TOC entry 3454 (class 2604 OID 16427)
-- Name: tournaments id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournaments ALTER COLUMN id SET DEFAULT nextval('public.tournaments_id_seq'::regclass);


--
-- TOC entry 3549 (class 2604 OID 17031)
-- Name: trackman_courses id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.trackman_courses ALTER COLUMN id SET DEFAULT nextval('public.trackman_courses_id_seq'::regclass);


--
-- TOC entry 3591 (class 2604 OID 20161)
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- TOC entry 3625 (class 2604 OID 21163)
-- Name: weekly_leaderboards id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_leaderboards ALTER COLUMN id SET DEFAULT nextval('public.weekly_leaderboards_id_seq'::regclass);


--
-- TOC entry 3611 (class 2604 OID 21111)
-- Name: weekly_matches id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches ALTER COLUMN id SET DEFAULT nextval('public.weekly_matches_id_seq'::regclass);


--
-- TOC entry 3606 (class 2604 OID 21087)
-- Name: weekly_scorecards id; Type: DEFAULT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_scorecards ALTER COLUMN id SET DEFAULT nextval('public.weekly_scorecards_id_seq'::regclass);


--
-- TOC entry 3904 (class 2606 OID 23540)
-- Name: championship_groups championship_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_groups
    ADD CONSTRAINT championship_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3896 (class 2606 OID 23437)
-- Name: championship_matches championship_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3914 (class 2606 OID 23583)
-- Name: championship_progression championship_progression_club_championship_id_club_group_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression
    ADD CONSTRAINT championship_progression_club_championship_id_club_group_key UNIQUE (club_championship_id, club_group);


--
-- TOC entry 3916 (class 2606 OID 23581)
-- Name: championship_progression championship_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression
    ADD CONSTRAINT championship_progression_pkey PRIMARY KEY (id);


--
-- TOC entry 3890 (class 2606 OID 23418)
-- Name: championship_rounds championship_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_rounds
    ADD CONSTRAINT championship_rounds_pkey PRIMARY KEY (id);


--
-- TOC entry 3892 (class 2606 OID 23420)
-- Name: championship_rounds championship_rounds_tournament_id_round_number_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_rounds
    ADD CONSTRAINT championship_rounds_tournament_id_round_number_key UNIQUE (tournament_id, round_number);


--
-- TOC entry 3746 (class 2606 OID 16604)
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);


--
-- TOC entry 3748 (class 2606 OID 16606)
-- Name: check_ins check_ins_tournament_id_user_member_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_tournament_id_user_member_id_key UNIQUE (tournament_id, user_member_id);


--
-- TOC entry 3922 (class 2606 OID 23644)
-- Name: club_championship_matches club_championship_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 23646)
-- Name: club_championship_matches club_championship_matches_tournament_id_club_group_player1__key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_tournament_id_club_group_player1__key UNIQUE (tournament_id, club_group, player1_id, player2_id, match_number);


--
-- TOC entry 3870 (class 2606 OID 23360)
-- Name: club_championship_participants club_championship_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants
    ADD CONSTRAINT club_championship_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 3872 (class 2606 OID 23362)
-- Name: club_championship_participants club_championship_participants_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants
    ADD CONSTRAINT club_championship_participants_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- TOC entry 3908 (class 2606 OID 23562)
-- Name: club_groups club_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_groups
    ADD CONSTRAINT club_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3910 (class 2606 OID 23564)
-- Name: club_groups club_groups_tournament_id_group_name_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_groups
    ADD CONSTRAINT club_groups_tournament_id_group_name_key UNIQUE (tournament_id, group_name);


--
-- TOC entry 3773 (class 2606 OID 17336)
-- Name: course_records course_records_course_id_club_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records
    ADD CONSTRAINT course_records_course_id_club_key UNIQUE (course_id, club);


--
-- TOC entry 3775 (class 2606 OID 17334)
-- Name: course_records course_records_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records
    ADD CONSTRAINT course_records_pkey PRIMARY KEY (id);


--
-- TOC entry 3759 (class 2606 OID 16986)
-- Name: gspro_courses gspro_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.gspro_courses
    ADD CONSTRAINT gspro_courses_pkey PRIMARY KEY (id);


--
-- TOC entry 3740 (class 2606 OID 16504)
-- Name: league_participants league_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_participants
    ADD CONSTRAINT league_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 3742 (class 2606 OID 16506)
-- Name: league_participants league_participants_user_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_participants
    ADD CONSTRAINT league_participants_user_id_key UNIQUE (user_id);


--
-- TOC entry 3738 (class 2606 OID 16495)
-- Name: league_settings league_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_settings
    ADD CONSTRAINT league_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3757 (class 2606 OID 16703)
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3884 (class 2606 OID 23388)
-- Name: national_tournament_seeding national_tournament_seeding_national_tournament_id_club_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_national_tournament_id_club_key UNIQUE (national_tournament_id, club);


--
-- TOC entry 3886 (class 2606 OID 23390)
-- Name: national_tournament_seeding national_tournament_seeding_national_tournament_id_seed_num_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_national_tournament_id_seed_num_key UNIQUE (national_tournament_id, seed_number);


--
-- TOC entry 3888 (class 2606 OID 23386)
-- Name: national_tournament_seeding national_tournament_seeding_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_pkey PRIMARY KEY (id);


--
-- TOC entry 3734 (class 2606 OID 16438)
-- Name: participation participation_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.participation
    ADD CONSTRAINT participation_pkey PRIMARY KEY (id);


--
-- TOC entry 3736 (class 2606 OID 16440)
-- Name: participation participation_user_member_id_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.participation
    ADD CONSTRAINT participation_user_member_id_tournament_id_key UNIQUE (user_member_id, tournament_id);


--
-- TOC entry 3952 (class 2606 OID 25632)
-- Name: permission_audit_log permission_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3934 (class 2606 OID 25560)
-- Name: permissions permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);


--
-- TOC entry 3936 (class 2606 OID 25558)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3850 (class 2606 OID 20940)
-- Name: registration_form_responses registration_form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.registration_form_responses
    ADD CONSTRAINT registration_form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 3852 (class 2606 OID 20942)
-- Name: registration_form_responses registration_form_responses_tournament_id_user_member_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.registration_form_responses
    ADD CONSTRAINT registration_form_responses_tournament_id_user_member_id_key UNIQUE (tournament_id, user_member_id);


--
-- TOC entry 3940 (class 2606 OID 25568)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3942 (class 2606 OID 25570)
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- TOC entry 3945 (class 2606 OID 25597)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3947 (class 2606 OID 25601)
-- Name: roles roles_role_key_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_key_key UNIQUE (role_key);


--
-- TOC entry 3949 (class 2606 OID 25599)
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- TOC entry 3755 (class 2606 OID 16687)
-- Name: scorecards scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT scorecards_pkey PRIMARY KEY (id);


--
-- TOC entry 3819 (class 2606 OID 19785)
-- Name: simulator_bookings simulator_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.simulator_bookings
    ADD CONSTRAINT simulator_bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 3771 (class 2606 OID 17111)
-- Name: simulator_courses_combined simulator_courses_combined_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.simulator_courses_combined
    ADD CONSTRAINT simulator_courses_combined_pkey PRIMARY KEY (id);


--
-- TOC entry 3802 (class 2606 OID 18259)
-- Name: team_match_scores team_match_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores
    ADD CONSTRAINT team_match_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 3804 (class 2606 OID 18261)
-- Name: team_match_scores team_match_scores_team_match_id_team_id_player_id_hole_numb_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores
    ADD CONSTRAINT team_match_scores_team_match_id_team_id_player_id_hole_numb_key UNIQUE (team_match_id, team_id, player_id, hole_number);


--
-- TOC entry 3795 (class 2606 OID 18222)
-- Name: team_matches team_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3797 (class 2606 OID 18224)
-- Name: team_matches team_matches_tournament_id_team1_id_team2_id_round_number_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_tournament_id_team1_id_team2_id_round_number_key UNIQUE (tournament_id, team1_id, team2_id, round_number);


--
-- TOC entry 3785 (class 2606 OID 18041)
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3787 (class 2606 OID 18049)
-- Name: team_members team_members_team_id_user_member_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_member_id_key UNIQUE (team_id, user_member_id);


--
-- TOC entry 3789 (class 2606 OID 19204)
-- Name: team_members team_members_tournament_user_unique; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_tournament_user_unique UNIQUE (tournament_id, user_member_id);


--
-- TOC entry 3809 (class 2606 OID 18292)
-- Name: team_standings team_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_standings
    ADD CONSTRAINT team_standings_pkey PRIMARY KEY (id);


--
-- TOC entry 3811 (class 2606 OID 18300)
-- Name: team_standings team_standings_tournament_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_standings
    ADD CONSTRAINT team_standings_tournament_id_team_id_key UNIQUE (tournament_id, team_id);


--
-- TOC entry 3750 (class 2606 OID 16629)
-- Name: tournament_matches tournament_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3752 (class 2606 OID 16631)
-- Name: tournament_matches tournament_matches_tournament_id_player1_id_player2_id_roun_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_player1_id_player2_id_roun_key UNIQUE (tournament_id, player1_id, player2_id, round_number);


--
-- TOC entry 3837 (class 2606 OID 20612)
-- Name: tournament_round_participants tournament_round_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants
    ADD CONSTRAINT tournament_round_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 3839 (class 2606 OID 20614)
-- Name: tournament_round_participants tournament_round_participants_tournament_id_round_id_user_m_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants
    ADD CONSTRAINT tournament_round_participants_tournament_id_round_id_user_m_key UNIQUE (tournament_id, round_id, user_member_id);


--
-- TOC entry 3844 (class 2606 OID 20639)
-- Name: tournament_round_scores tournament_round_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 3846 (class 2606 OID 20641)
-- Name: tournament_round_scores tournament_round_scores_tournament_id_round_id_user_member__key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_tournament_id_round_id_user_member__key UNIQUE (tournament_id, round_id, user_member_id);


--
-- TOC entry 3830 (class 2606 OID 20590)
-- Name: tournament_rounds tournament_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_rounds
    ADD CONSTRAINT tournament_rounds_pkey PRIMARY KEY (id);


--
-- TOC entry 3832 (class 2606 OID 20592)
-- Name: tournament_rounds tournament_rounds_tournament_id_round_number_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_rounds
    ADD CONSTRAINT tournament_rounds_tournament_id_round_number_key UNIQUE (tournament_id, round_number);


--
-- TOC entry 3815 (class 2606 OID 19178)
-- Name: tournament_team_scores tournament_team_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_team_scores
    ADD CONSTRAINT tournament_team_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 3817 (class 2606 OID 19180)
-- Name: tournament_team_scores tournament_team_scores_team_tournament_unique; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_team_scores
    ADD CONSTRAINT tournament_team_scores_team_tournament_unique UNIQUE (team_id, tournament_id);


--
-- TOC entry 3779 (class 2606 OID 18022)
-- Name: tournament_teams tournament_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_pkey PRIMARY KEY (id);


--
-- TOC entry 3730 (class 2606 OID 16431)
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- TOC entry 3766 (class 2606 OID 17034)
-- Name: trackman_courses trackman_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.trackman_courses
    ADD CONSTRAINT trackman_courses_pkey PRIMARY KEY (id);


--
-- TOC entry 3744 (class 2606 OID 16523)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3823 (class 2606 OID 20164)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3825 (class 2606 OID 20166)
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- TOC entry 3706 (class 2606 OID 16404)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (member_id);


--
-- TOC entry 3866 (class 2606 OID 21176)
-- Name: weekly_leaderboards weekly_leaderboards_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_leaderboards
    ADD CONSTRAINT weekly_leaderboards_pkey PRIMARY KEY (id);


--
-- TOC entry 3868 (class 2606 OID 21178)
-- Name: weekly_leaderboards weekly_leaderboards_tournament_id_week_start_date_user_id_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_leaderboards
    ADD CONSTRAINT weekly_leaderboards_tournament_id_week_start_date_user_id_key UNIQUE (tournament_id, week_start_date, user_id);


--
-- TOC entry 3861 (class 2606 OID 21126)
-- Name: weekly_matches weekly_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3863 (class 2606 OID 21128)
-- Name: weekly_matches weekly_matches_tournament_id_week_start_date_player1_id_pla_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_tournament_id_week_start_date_player1_id_pla_key UNIQUE (tournament_id, week_start_date, player1_id, player2_id);


--
-- TOC entry 3856 (class 2606 OID 21094)
-- Name: weekly_scorecards weekly_scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_scorecards
    ADD CONSTRAINT weekly_scorecards_pkey PRIMARY KEY (id);


--
-- TOC entry 3858 (class 2606 OID 21096)
-- Name: weekly_scorecards weekly_scorecards_user_id_tournament_id_week_start_date_key; Type: CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_scorecards
    ADD CONSTRAINT weekly_scorecards_user_id_tournament_id_week_start_date_key UNIQUE (user_id, tournament_id, week_start_date);


--
-- TOC entry 3905 (class 1259 OID 23547)
-- Name: idx_championship_groups_parent; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_groups_parent ON public.championship_groups USING btree (parent_group_id);


--
-- TOC entry 3906 (class 1259 OID 23546)
-- Name: idx_championship_groups_type; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_groups_type ON public.championship_groups USING btree (championship_type);


--
-- TOC entry 3897 (class 1259 OID 23465)
-- Name: idx_championship_matches_player1; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_player1 ON public.championship_matches USING btree (player1_id);


--
-- TOC entry 3898 (class 1259 OID 23466)
-- Name: idx_championship_matches_player2; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_player2 ON public.championship_matches USING btree (player2_id);


--
-- TOC entry 3899 (class 1259 OID 23464)
-- Name: idx_championship_matches_round; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_round ON public.championship_matches USING btree (round_id);


--
-- TOC entry 3900 (class 1259 OID 23468)
-- Name: idx_championship_matches_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_status ON public.championship_matches USING btree (match_status);


--
-- TOC entry 3901 (class 1259 OID 23463)
-- Name: idx_championship_matches_tournament; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_tournament ON public.championship_matches USING btree (tournament_id);


--
-- TOC entry 3902 (class 1259 OID 23467)
-- Name: idx_championship_matches_winner; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_matches_winner ON public.championship_matches USING btree (winner_id);


--
-- TOC entry 3917 (class 1259 OID 23601)
-- Name: idx_championship_progression_champion; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_progression_champion ON public.championship_progression USING btree (club_champion_id);


--
-- TOC entry 3918 (class 1259 OID 23599)
-- Name: idx_championship_progression_club; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_progression_club ON public.championship_progression USING btree (club_championship_id);


--
-- TOC entry 3919 (class 1259 OID 23600)
-- Name: idx_championship_progression_national; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_progression_national ON public.championship_progression USING btree (national_championship_id);


--
-- TOC entry 3920 (class 1259 OID 23602)
-- Name: idx_championship_progression_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_progression_status ON public.championship_progression USING btree (progression_status);


--
-- TOC entry 3893 (class 1259 OID 23427)
-- Name: idx_championship_rounds_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_rounds_status ON public.championship_rounds USING btree (status);


--
-- TOC entry 3894 (class 1259 OID 23426)
-- Name: idx_championship_rounds_tournament; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_championship_rounds_tournament ON public.championship_rounds USING btree (tournament_id);


--
-- TOC entry 3873 (class 1259 OID 23376)
-- Name: idx_club_championship_champion; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_champion ON public.club_championship_participants USING btree (is_club_champion);


--
-- TOC entry 3874 (class 1259 OID 23375)
-- Name: idx_club_championship_club; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_club ON public.club_championship_participants USING btree (club);


--
-- TOC entry 3875 (class 1259 OID 23550)
-- Name: idx_club_championship_club_group; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_club_group ON public.club_championship_participants USING btree (club_group);


--
-- TOC entry 3876 (class 1259 OID 23551)
-- Name: idx_club_championship_qualified; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_qualified ON public.club_championship_participants USING btree (qualified_for_national);


--
-- TOC entry 3877 (class 1259 OID 23373)
-- Name: idx_club_championship_tournament; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_tournament ON public.club_championship_participants USING btree (tournament_id);


--
-- TOC entry 3878 (class 1259 OID 23374)
-- Name: idx_club_championship_user; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_championship_user ON public.club_championship_participants USING btree (user_id);


--
-- TOC entry 3911 (class 1259 OID 23571)
-- Name: idx_club_groups_clubs; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_groups_clubs ON public.club_groups USING gin (participating_clubs);


--
-- TOC entry 3912 (class 1259 OID 23570)
-- Name: idx_club_groups_tournament; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_groups_tournament ON public.club_groups USING btree (tournament_id);


--
-- TOC entry 3925 (class 1259 OID 23668)
-- Name: idx_club_matches_group; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_group ON public.club_championship_matches USING btree (club_group);


--
-- TOC entry 3926 (class 1259 OID 23669)
-- Name: idx_club_matches_player1; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_player1 ON public.club_championship_matches USING btree (player1_id);


--
-- TOC entry 3927 (class 1259 OID 23670)
-- Name: idx_club_matches_player2; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_player2 ON public.club_championship_matches USING btree (player2_id);


--
-- TOC entry 3928 (class 1259 OID 23672)
-- Name: idx_club_matches_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_status ON public.club_championship_matches USING btree (match_status);


--
-- TOC entry 3929 (class 1259 OID 23667)
-- Name: idx_club_matches_tournament; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_tournament ON public.club_championship_matches USING btree (tournament_id);


--
-- TOC entry 3930 (class 1259 OID 23671)
-- Name: idx_club_matches_winner; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_club_matches_winner ON public.club_championship_matches USING btree (winner_id);


--
-- TOC entry 3760 (class 1259 OID 16989)
-- Name: idx_gspro_courses_designer; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_gspro_courses_designer ON public.gspro_courses USING btree (designer);


--
-- TOC entry 3761 (class 1259 OID 16988)
-- Name: idx_gspro_courses_location; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_gspro_courses_location ON public.gspro_courses USING btree (location);


--
-- TOC entry 3762 (class 1259 OID 16987)
-- Name: idx_gspro_courses_name; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_gspro_courses_name ON public.gspro_courses USING btree (name);


--
-- TOC entry 3763 (class 1259 OID 16990)
-- Name: idx_gspro_courses_server; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_gspro_courses_server ON public.gspro_courses USING btree (server);


--
-- TOC entry 3879 (class 1259 OID 23408)
-- Name: idx_national_tournament_champion; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_national_tournament_champion ON public.national_tournament_seeding USING btree (club_champion_id);


--
-- TOC entry 3880 (class 1259 OID 23407)
-- Name: idx_national_tournament_club; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_national_tournament_club ON public.national_tournament_seeding USING btree (club);


--
-- TOC entry 3881 (class 1259 OID 23406)
-- Name: idx_national_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_national_tournament_id ON public.national_tournament_seeding USING btree (national_tournament_id);


--
-- TOC entry 3882 (class 1259 OID 23409)
-- Name: idx_national_tournament_seed; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_national_tournament_seed ON public.national_tournament_seeding USING btree (seed_number);


--
-- TOC entry 3731 (class 1259 OID 20980)
-- Name: idx_participation_payment_submitted; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_participation_payment_submitted ON public.participation USING btree (payment_submitted);


--
-- TOC entry 3732 (class 1259 OID 20981)
-- Name: idx_participation_tournament_user; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_participation_tournament_user ON public.participation USING btree (tournament_id, user_member_id);


--
-- TOC entry 3950 (class 1259 OID 25648)
-- Name: idx_permission_audit_created; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_permission_audit_created ON public.permission_audit_log USING btree (created_at DESC);


--
-- TOC entry 3931 (class 1259 OID 25602)
-- Name: idx_permissions_category; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_permissions_category ON public.permissions USING btree (category);


--
-- TOC entry 3932 (class 1259 OID 25603)
-- Name: idx_permissions_key; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_permissions_key ON public.permissions USING btree (permission_key);


--
-- TOC entry 3847 (class 1259 OID 20953)
-- Name: idx_registration_form_responses_tournament_user; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_registration_form_responses_tournament_user ON public.registration_form_responses USING btree (tournament_id, user_member_id);


--
-- TOC entry 3848 (class 1259 OID 20954)
-- Name: idx_registration_form_responses_user; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_registration_form_responses_user ON public.registration_form_responses USING btree (user_member_id);


--
-- TOC entry 3937 (class 1259 OID 25606)
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- TOC entry 3938 (class 1259 OID 25605)
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id);


--
-- TOC entry 3943 (class 1259 OID 25604)
-- Name: idx_roles_key; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_roles_key ON public.roles USING btree (role_key);


--
-- TOC entry 3753 (class 1259 OID 17145)
-- Name: idx_scorecards_course_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_scorecards_course_id ON public.scorecards USING btree (course_id);


--
-- TOC entry 3767 (class 1259 OID 17113)
-- Name: idx_simulator_courses_combined_name; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_simulator_courses_combined_name ON public.simulator_courses_combined USING btree (name);


--
-- TOC entry 3768 (class 1259 OID 17112)
-- Name: idx_simulator_courses_combined_platforms; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_simulator_courses_combined_platforms ON public.simulator_courses_combined USING gin (platforms);


--
-- TOC entry 3769 (class 1259 OID 23333)
-- Name: idx_simulator_courses_hole_indexes; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_simulator_courses_hole_indexes ON public.simulator_courses_combined USING gin (hole_indexes);


--
-- TOC entry 3798 (class 1259 OID 18326)
-- Name: idx_team_match_scores_player_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_match_scores_player_id ON public.team_match_scores USING btree (player_id);


--
-- TOC entry 3799 (class 1259 OID 18325)
-- Name: idx_team_match_scores_team_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_match_scores_team_id ON public.team_match_scores USING btree (team_id);


--
-- TOC entry 3800 (class 1259 OID 18323)
-- Name: idx_team_match_scores_team_match_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_match_scores_team_match_id ON public.team_match_scores USING btree (team_match_id);


--
-- TOC entry 3790 (class 1259 OID 18322)
-- Name: idx_team_matches_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_matches_status ON public.team_matches USING btree (status);


--
-- TOC entry 3791 (class 1259 OID 18319)
-- Name: idx_team_matches_team1_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_matches_team1_id ON public.team_matches USING btree (team1_id);


--
-- TOC entry 3792 (class 1259 OID 18320)
-- Name: idx_team_matches_team2_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_matches_team2_id ON public.team_matches USING btree (team2_id);


--
-- TOC entry 3793 (class 1259 OID 18318)
-- Name: idx_team_matches_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_matches_tournament_id ON public.team_matches USING btree (tournament_id);


--
-- TOC entry 3780 (class 1259 OID 18080)
-- Name: idx_team_members_captain; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_members_captain ON public.team_members USING btree (is_captain);


--
-- TOC entry 3781 (class 1259 OID 18078)
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- TOC entry 3782 (class 1259 OID 19205)
-- Name: idx_team_members_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_members_tournament_id ON public.team_members USING btree (tournament_id);


--
-- TOC entry 3783 (class 1259 OID 18079)
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_member_id);


--
-- TOC entry 3805 (class 1259 OID 18328)
-- Name: idx_team_standings_team_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_standings_team_id ON public.team_standings USING btree (team_id);


--
-- TOC entry 3806 (class 1259 OID 18329)
-- Name: idx_team_standings_total_points; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_standings_total_points ON public.team_standings USING btree (total_points DESC);


--
-- TOC entry 3807 (class 1259 OID 18327)
-- Name: idx_team_standings_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_team_standings_tournament_id ON public.team_standings USING btree (tournament_id);


--
-- TOC entry 3833 (class 1259 OID 20676)
-- Name: idx_tournament_round_participants_round_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_participants_round_id ON public.tournament_round_participants USING btree (round_id);


--
-- TOC entry 3834 (class 1259 OID 20675)
-- Name: idx_tournament_round_participants_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_participants_tournament_id ON public.tournament_round_participants USING btree (tournament_id);


--
-- TOC entry 3835 (class 1259 OID 20677)
-- Name: idx_tournament_round_participants_user_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_participants_user_id ON public.tournament_round_participants USING btree (user_member_id);


--
-- TOC entry 3840 (class 1259 OID 20679)
-- Name: idx_tournament_round_scores_round_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_scores_round_id ON public.tournament_round_scores USING btree (round_id);


--
-- TOC entry 3841 (class 1259 OID 20678)
-- Name: idx_tournament_round_scores_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_scores_tournament_id ON public.tournament_round_scores USING btree (tournament_id);


--
-- TOC entry 3842 (class 1259 OID 20680)
-- Name: idx_tournament_round_scores_user_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_round_scores_user_id ON public.tournament_round_scores USING btree (user_member_id);


--
-- TOC entry 3826 (class 1259 OID 20673)
-- Name: idx_tournament_rounds_round_number; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_rounds_round_number ON public.tournament_rounds USING btree (round_number);


--
-- TOC entry 3827 (class 1259 OID 20674)
-- Name: idx_tournament_rounds_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_rounds_status ON public.tournament_rounds USING btree (status);


--
-- TOC entry 3828 (class 1259 OID 20672)
-- Name: idx_tournament_rounds_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_rounds_tournament_id ON public.tournament_rounds USING btree (tournament_id);


--
-- TOC entry 3812 (class 1259 OID 19196)
-- Name: idx_tournament_team_scores_team_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_team_scores_team_id ON public.tournament_team_scores USING btree (team_id);


--
-- TOC entry 3813 (class 1259 OID 19197)
-- Name: idx_tournament_team_scores_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_team_scores_tournament_id ON public.tournament_team_scores USING btree (tournament_id);


--
-- TOC entry 3776 (class 1259 OID 18072)
-- Name: idx_tournament_teams_captain_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_teams_captain_id ON public.tournament_teams USING btree (captain_id);


--
-- TOC entry 3777 (class 1259 OID 18063)
-- Name: idx_tournament_teams_tournament_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournament_teams_tournament_id ON public.tournament_teams USING btree (tournament_id);


--
-- TOC entry 3707 (class 1259 OID 23347)
-- Name: idx_tournaments_championship_club; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_championship_club ON public.tournaments USING btree (championship_club);


--
-- TOC entry 3708 (class 1259 OID 23528)
-- Name: idx_tournaments_championship_group; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_championship_group ON public.tournaments USING btree (championship_group_id);


--
-- TOC entry 3709 (class 1259 OID 23527)
-- Name: idx_tournaments_championship_type; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_championship_type ON public.tournaments USING btree (championship_type);


--
-- TOC entry 3710 (class 1259 OID 23345)
-- Name: idx_tournaments_club_championship; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_club_championship ON public.tournaments USING btree (is_club_championship);


--
-- TOC entry 3711 (class 1259 OID 18447)
-- Name: idx_tournaments_course_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_course_id ON public.tournaments USING btree (course_id);


--
-- TOC entry 3712 (class 1259 OID 16730)
-- Name: idx_tournaments_created_by; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_created_by ON public.tournaments USING btree (created_by);


--
-- TOC entry 3713 (class 1259 OID 24302)
-- Name: idx_tournaments_gspro_course_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_gspro_course_id ON public.tournaments USING btree (gspro_course_id);


--
-- TOC entry 3714 (class 1259 OID 20889)
-- Name: idx_tournaments_has_registration_form; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_has_registration_form ON public.tournaments USING btree (has_registration_form);


--
-- TOC entry 3715 (class 1259 OID 18448)
-- Name: idx_tournaments_hole_configuration; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_hole_configuration ON public.tournaments USING btree (hole_configuration);


--
-- TOC entry 3716 (class 1259 OID 23346)
-- Name: idx_tournaments_national; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_national ON public.tournaments USING btree (is_national_tournament);


--
-- TOC entry 3717 (class 1259 OID 23344)
-- Name: idx_tournaments_parent_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_parent_id ON public.tournaments USING btree (parent_tournament_id);


--
-- TOC entry 3718 (class 1259 OID 20979)
-- Name: idx_tournaments_payment_organizer; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_payment_organizer ON public.tournaments USING btree (payment_organizer);


--
-- TOC entry 3719 (class 1259 OID 19064)
-- Name: idx_tournaments_pins; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_pins ON public.tournaments USING btree (pins);


--
-- TOC entry 3720 (class 1259 OID 23529)
-- Name: idx_tournaments_regional; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_regional ON public.tournaments USING btree (is_regional_championship);


--
-- TOC entry 3721 (class 1259 OID 16728)
-- Name: idx_tournaments_registration_deadline; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_registration_deadline ON public.tournaments USING btree (registration_deadline);


--
-- TOC entry 3722 (class 1259 OID 23343)
-- Name: idx_tournaments_series; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_series ON public.tournaments USING btree (tournament_series);


--
-- TOC entry 3723 (class 1259 OID 16729)
-- Name: idx_tournaments_start_date; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_start_date ON public.tournaments USING btree (start_date);


--
-- TOC entry 3724 (class 1259 OID 16727)
-- Name: idx_tournaments_status; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_status ON public.tournaments USING btree (status);


--
-- TOC entry 3725 (class 1259 OID 19061)
-- Name: idx_tournaments_team_size; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_team_size ON public.tournaments USING btree (team_size);


--
-- TOC entry 3726 (class 1259 OID 19063)
-- Name: idx_tournaments_tee; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_tee ON public.tournaments USING btree (tee);


--
-- TOC entry 3727 (class 1259 OID 24303)
-- Name: idx_tournaments_trackman_course_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_trackman_course_id ON public.tournaments USING btree (trackman_course_id);


--
-- TOC entry 3728 (class 1259 OID 22610)
-- Name: idx_tournaments_week_start_date; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_tournaments_week_start_date ON public.tournaments USING btree (week_start_date);


--
-- TOC entry 3764 (class 1259 OID 17035)
-- Name: idx_trackman_courses_name; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_trackman_courses_name ON public.trackman_courses USING btree (name);


--
-- TOC entry 3820 (class 1259 OID 20183)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 3821 (class 1259 OID 20182)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 3703 (class 1259 OID 25462)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 3704 (class 1259 OID 25612)
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- TOC entry 3864 (class 1259 OID 21202)
-- Name: idx_weekly_leaderboards_tournament_week; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_weekly_leaderboards_tournament_week ON public.weekly_leaderboards USING btree (tournament_id, week_start_date);


--
-- TOC entry 3859 (class 1259 OID 21200)
-- Name: idx_weekly_matches_tournament_week; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_weekly_matches_tournament_week ON public.weekly_matches USING btree (tournament_id, week_start_date);


--
-- TOC entry 3853 (class 1259 OID 21192)
-- Name: idx_weekly_scorecards_tournament_week; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_weekly_scorecards_tournament_week ON public.weekly_scorecards USING btree (tournament_id, week_start_date);


--
-- TOC entry 3854 (class 1259 OID 21198)
-- Name: idx_weekly_scorecards_user_week; Type: INDEX; Schema: public; Owner: golfos_user
--

CREATE INDEX idx_weekly_scorecards_user_week ON public.weekly_scorecards USING btree (user_id, week_start_date);


--
-- TOC entry 4029 (class 2606 OID 23541)
-- Name: championship_groups championship_groups_parent_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_groups
    ADD CONSTRAINT championship_groups_parent_group_id_fkey FOREIGN KEY (parent_group_id) REFERENCES public.championship_groups(id);


--
-- TOC entry 4024 (class 2606 OID 23448)
-- Name: championship_matches championship_matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4025 (class 2606 OID 23453)
-- Name: championship_matches championship_matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4026 (class 2606 OID 23443)
-- Name: championship_matches championship_matches_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.championship_rounds(id) ON DELETE CASCADE;


--
-- TOC entry 4027 (class 2606 OID 23438)
-- Name: championship_matches championship_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4028 (class 2606 OID 23458)
-- Name: championship_matches championship_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_matches
    ADD CONSTRAINT championship_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4031 (class 2606 OID 23594)
-- Name: championship_progression championship_progression_club_champion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression
    ADD CONSTRAINT championship_progression_club_champion_id_fkey FOREIGN KEY (club_champion_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4032 (class 2606 OID 23584)
-- Name: championship_progression championship_progression_club_championship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression
    ADD CONSTRAINT championship_progression_club_championship_id_fkey FOREIGN KEY (club_championship_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4033 (class 2606 OID 23589)
-- Name: championship_progression championship_progression_national_championship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_progression
    ADD CONSTRAINT championship_progression_national_championship_id_fkey FOREIGN KEY (national_championship_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4023 (class 2606 OID 23421)
-- Name: championship_rounds championship_rounds_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.championship_rounds
    ADD CONSTRAINT championship_rounds_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3961 (class 2606 OID 16607)
-- Name: check_ins check_ins_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3962 (class 2606 OID 16612)
-- Name: check_ins check_ins_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4034 (class 2606 OID 23652)
-- Name: club_championship_matches club_championship_matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4035 (class 2606 OID 23657)
-- Name: club_championship_matches club_championship_matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4036 (class 2606 OID 23647)
-- Name: club_championship_matches club_championship_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4037 (class 2606 OID 23662)
-- Name: club_championship_matches club_championship_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT club_championship_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4017 (class 2606 OID 23363)
-- Name: club_championship_participants club_championship_participants_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants
    ADD CONSTRAINT club_championship_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4018 (class 2606 OID 23368)
-- Name: club_championship_participants club_championship_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants
    ADD CONSTRAINT club_championship_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4030 (class 2606 OID 23565)
-- Name: club_groups club_groups_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_groups
    ADD CONSTRAINT club_groups_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3972 (class 2606 OID 17337)
-- Name: course_records course_records_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records
    ADD CONSTRAINT course_records_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.simulator_courses_combined(id);


--
-- TOC entry 3973 (class 2606 OID 17347)
-- Name: course_records course_records_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records
    ADD CONSTRAINT course_records_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id);


--
-- TOC entry 3974 (class 2606 OID 17342)
-- Name: course_records course_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.course_records
    ADD CONSTRAINT course_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id);


--
-- TOC entry 4038 (class 2606 OID 24047)
-- Name: club_championship_matches fk_club_championship_matches_course; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_matches
    ADD CONSTRAINT fk_club_championship_matches_course FOREIGN KEY (course_id) REFERENCES public.simulator_courses_combined(id);


--
-- TOC entry 4019 (class 2606 OID 24134)
-- Name: club_championship_participants fk_club_championship_participants_group; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.club_championship_participants
    ADD CONSTRAINT fk_club_championship_participants_group FOREIGN KEY (group_id) REFERENCES public.club_groups(id);


--
-- TOC entry 3967 (class 2606 OID 17140)
-- Name: scorecards fk_scorecards_course_id; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT fk_scorecards_course_id FOREIGN KEY (course_id) REFERENCES public.simulator_courses_combined(id) ON DELETE SET NULL;


--
-- TOC entry 3959 (class 2606 OID 16507)
-- Name: league_participants league_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.league_participants
    ADD CONSTRAINT league_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id);


--
-- TOC entry 3970 (class 2606 OID 16704)
-- Name: matches matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(member_id);


--
-- TOC entry 3971 (class 2606 OID 16709)
-- Name: matches matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(member_id);


--
-- TOC entry 4020 (class 2606 OID 23401)
-- Name: national_tournament_seeding national_tournament_seeding_club_champion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_club_champion_id_fkey FOREIGN KEY (club_champion_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4021 (class 2606 OID 23396)
-- Name: national_tournament_seeding national_tournament_seeding_club_championship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_club_championship_id_fkey FOREIGN KEY (club_championship_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4022 (class 2606 OID 23391)
-- Name: national_tournament_seeding national_tournament_seeding_national_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.national_tournament_seeding
    ADD CONSTRAINT national_tournament_seeding_national_tournament_id_fkey FOREIGN KEY (national_tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3957 (class 2606 OID 16446)
-- Name: participation participation_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.participation
    ADD CONSTRAINT participation_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3958 (class 2606 OID 16441)
-- Name: participation participation_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.participation
    ADD CONSTRAINT participation_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4040 (class 2606 OID 25643)
-- Name: permission_audit_log permission_audit_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(member_id);


--
-- TOC entry 4041 (class 2606 OID 25638)
-- Name: permission_audit_log permission_audit_log_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- TOC entry 4042 (class 2606 OID 25633)
-- Name: permission_audit_log permission_audit_log_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 4005 (class 2606 OID 20943)
-- Name: registration_form_responses registration_form_responses_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.registration_form_responses
    ADD CONSTRAINT registration_form_responses_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4006 (class 2606 OID 20948)
-- Name: registration_form_responses registration_form_responses_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.registration_form_responses
    ADD CONSTRAINT registration_form_responses_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4039 (class 2606 OID 25576)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 3968 (class 2606 OID 20430)
-- Name: scorecards scorecards_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT scorecards_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3969 (class 2606 OID 16688)
-- Name: scorecards scorecards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT scorecards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3992 (class 2606 OID 19786)
-- Name: simulator_bookings simulator_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.simulator_bookings
    ADD CONSTRAINT simulator_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3984 (class 2606 OID 18272)
-- Name: team_match_scores team_match_scores_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores
    ADD CONSTRAINT team_match_scores_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3985 (class 2606 OID 18267)
-- Name: team_match_scores team_match_scores_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores
    ADD CONSTRAINT team_match_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3986 (class 2606 OID 18262)
-- Name: team_match_scores team_match_scores_team_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_match_scores
    ADD CONSTRAINT team_match_scores_team_match_id_fkey FOREIGN KEY (team_match_id) REFERENCES public.team_matches(id) ON DELETE CASCADE;


--
-- TOC entry 3980 (class 2606 OID 18230)
-- Name: team_matches team_matches_team1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3981 (class 2606 OID 18235)
-- Name: team_matches team_matches_team2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3982 (class 2606 OID 18225)
-- Name: team_matches team_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3983 (class 2606 OID 18240)
-- Name: team_matches team_matches_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.tournament_teams(id);


--
-- TOC entry 3977 (class 2606 OID 18053)
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3978 (class 2606 OID 19198)
-- Name: team_members team_members_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3979 (class 2606 OID 18058)
-- Name: team_members team_members_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3987 (class 2606 OID 18306)
-- Name: team_standings team_standings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_standings
    ADD CONSTRAINT team_standings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3988 (class 2606 OID 18301)
-- Name: team_standings team_standings_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.team_standings
    ADD CONSTRAINT team_standings_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3963 (class 2606 OID 16637)
-- Name: tournament_matches tournament_matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3964 (class 2606 OID 16642)
-- Name: tournament_matches tournament_matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3965 (class 2606 OID 16632)
-- Name: tournament_matches tournament_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3966 (class 2606 OID 16647)
-- Name: tournament_matches tournament_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(member_id);


--
-- TOC entry 3997 (class 2606 OID 20620)
-- Name: tournament_round_participants tournament_round_participants_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants
    ADD CONSTRAINT tournament_round_participants_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.tournament_rounds(id) ON DELETE CASCADE;


--
-- TOC entry 3998 (class 2606 OID 20615)
-- Name: tournament_round_participants tournament_round_participants_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants
    ADD CONSTRAINT tournament_round_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3999 (class 2606 OID 20625)
-- Name: tournament_round_participants tournament_round_participants_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_participants
    ADD CONSTRAINT tournament_round_participants_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4000 (class 2606 OID 20647)
-- Name: tournament_round_scores tournament_round_scores_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.tournament_rounds(id) ON DELETE CASCADE;


--
-- TOC entry 4001 (class 2606 OID 20657)
-- Name: tournament_round_scores tournament_round_scores_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;


--
-- TOC entry 4002 (class 2606 OID 20662)
-- Name: tournament_round_scores tournament_round_scores_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(member_id);


--
-- TOC entry 4003 (class 2606 OID 20642)
-- Name: tournament_round_scores tournament_round_scores_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4004 (class 2606 OID 20652)
-- Name: tournament_round_scores tournament_round_scores_user_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_round_scores
    ADD CONSTRAINT tournament_round_scores_user_member_id_fkey FOREIGN KEY (user_member_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3995 (class 2606 OID 20598)
-- Name: tournament_rounds tournament_rounds_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_rounds
    ADD CONSTRAINT tournament_rounds_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.simulator_courses_combined(id);


--
-- TOC entry 3996 (class 2606 OID 20593)
-- Name: tournament_rounds tournament_rounds_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_rounds
    ADD CONSTRAINT tournament_rounds_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3989 (class 2606 OID 19191)
-- Name: tournament_team_scores tournament_team_scores_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_team_scores
    ADD CONSTRAINT tournament_team_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(member_id);


--
-- TOC entry 3990 (class 2606 OID 19181)
-- Name: tournament_team_scores tournament_team_scores_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_team_scores
    ADD CONSTRAINT tournament_team_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- TOC entry 3991 (class 2606 OID 19186)
-- Name: tournament_team_scores tournament_team_scores_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_team_scores
    ADD CONSTRAINT tournament_team_scores_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3975 (class 2606 OID 18028)
-- Name: tournament_teams tournament_teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.users(member_id);


--
-- TOC entry 3976 (class 2606 OID 18023)
-- Name: tournament_teams tournament_teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 3954 (class 2606 OID 18437)
-- Name: tournaments tournaments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.simulator_courses_combined(id);


--
-- TOC entry 3955 (class 2606 OID 16720)
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(member_id);


--
-- TOC entry 3956 (class 2606 OID 23338)
-- Name: tournaments tournaments_parent_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_parent_tournament_id_fkey FOREIGN KEY (parent_tournament_id) REFERENCES public.tournaments(id);


--
-- TOC entry 3960 (class 2606 OID 16524)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id);


--
-- TOC entry 3993 (class 2606 OID 20177)
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(member_id);


--
-- TOC entry 3994 (class 2606 OID 20167)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 3953 (class 2606 OID 25607)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 4015 (class 2606 OID 21179)
-- Name: weekly_leaderboards weekly_leaderboards_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_leaderboards
    ADD CONSTRAINT weekly_leaderboards_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4016 (class 2606 OID 21184)
-- Name: weekly_leaderboards weekly_leaderboards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_leaderboards
    ADD CONSTRAINT weekly_leaderboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4009 (class 2606 OID 21154)
-- Name: weekly_matches weekly_matches_match_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_match_winner_id_fkey FOREIGN KEY (match_winner_id) REFERENCES public.users(member_id);


--
-- TOC entry 4010 (class 2606 OID 21134)
-- Name: weekly_matches weekly_matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4011 (class 2606 OID 21144)
-- Name: weekly_matches weekly_matches_player1_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_player1_scorecard_id_fkey FOREIGN KEY (player1_scorecard_id) REFERENCES public.weekly_scorecards(id) ON DELETE CASCADE;


--
-- TOC entry 4012 (class 2606 OID 21139)
-- Name: weekly_matches weekly_matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4013 (class 2606 OID 21149)
-- Name: weekly_matches weekly_matches_player2_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_player2_scorecard_id_fkey FOREIGN KEY (player2_scorecard_id) REFERENCES public.weekly_scorecards(id) ON DELETE CASCADE;


--
-- TOC entry 4014 (class 2606 OID 21129)
-- Name: weekly_matches weekly_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_matches
    ADD CONSTRAINT weekly_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4007 (class 2606 OID 21102)
-- Name: weekly_scorecards weekly_scorecards_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_scorecards
    ADD CONSTRAINT weekly_scorecards_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4008 (class 2606 OID 21097)
-- Name: weekly_scorecards weekly_scorecards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: golfos_user
--

ALTER TABLE ONLY public.weekly_scorecards
    ADD CONSTRAINT weekly_scorecards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(member_id) ON DELETE CASCADE;


--
-- TOC entry 4202 (class 0 OID 0)
-- Dependencies: 319
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision) TO golfos_user;


--
-- TOC entry 4203 (class 0 OID 0)
-- Dependencies: 318
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO golfos_user;


--
-- TOC entry 2283 (class 826 OID 16391)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO golfos_user;


--
-- TOC entry 2285 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO golfos_user;


--
-- TOC entry 2284 (class 826 OID 16392)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO golfos_user;


--
-- TOC entry 2282 (class 826 OID 16390)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO golfos_user;


-- Completed on 2025-10-23 13:06:37 EDT

--
-- PostgreSQL database dump complete
--


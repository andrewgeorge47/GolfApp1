-- Seed Data for Simulator System
-- Date: 2025-11-26
-- Description: Insert equipment data for launch monitors, projectors, and hitting mats

-- Note: Adjust the column mappings based on your actual JSON data structure
-- This assumes the data from SimSetUp/launch_monitors.sql, projectors.sql, hitting_mats.sql

-- ============================================================================
-- LAUNCH MONITORS
-- ============================================================================

-- Format: (name, price, technology, placement, min_ceiling_height, min_room_width, min_room_depth, distance_from_screen, purchase_url, rating, score)

INSERT INTO simulator_launch_monitors (name, price, technology, placement, min_ceiling_height, min_room_width, min_room_depth, distance_from_screen, purchase_url, rating, score) VALUES
('SkyTrak+', 2995.0, 'Camera-based', 'Side', 8.5, 13.0, 15.0, NULL, 'https://www.skytrakgolf.com/', NULL, 9.2),
('FlightScope Mevo+', 2299.0, 'Radar-based', 'Behind', 9.0, 11.0, 18.0, 8.0, 'https://www.flightscope.com/', NULL, 9.0),
('Foresight GCQuad', 14500.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 10.0),
('Trackman 4 Indoor', 21995.0, 'Radar-based', 'Behind', 10.0, 15.0, 20.0, 12.0, 'https://www.trackman.com/', NULL, 10.0),
('Uneekor Eye Mini Lite', 3500.0, 'Camera-based', 'Side', 8.5, 11.0, 12.0, NULL, 'https://uneekor.com/', NULL, 8.5),
('Uneekor QED', 6000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://uneekor.com/', NULL, 9.5),
('Uneekor Eye XO', 8000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://uneekor.com/', NULL, 9.7),
('Uneekor Eye XO2', 11000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://uneekor.com/', NULL, 9.8),
('Rapsodo MLM2 Pro', 699.0, 'Camera-based', 'Side', 8.0, 11.0, 12.0, NULL, 'https://rapsodo.com/', NULL, 7.5),
('Garmin R10', 599.0, 'Radar-based', 'Behind', 8.0, 11.0, 15.0, 8.0, 'https://www.garmin.com/', NULL, 7.8),
('Garmin R50', 4999.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.garmin.com/', NULL, 9.0),
('TruGolf Apogee', 9000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://trugolf.com/', NULL, 9.3),
('ProTee VX', 6999.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.aboutgolf.com/', NULL, 9.1),
('Full Swing KIT', 4999.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://fullswinggolf.com/', NULL, 8.8),
('Swing Caddie SC4', 599.0, 'Radar-based', 'Behind', 8.0, 11.0, 15.0, 8.0, 'https://swingcaddie.com/', NULL, 7.6),
('Uneekor Eye Mini', 4500.0, 'Camera-based', 'Side', 8.5, 11.0, 12.0, NULL, 'https://uneekor.com/', NULL, 8.8),
('ProTee RLX', 7999.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.aboutgolf.com/', NULL, 9.2),
('ProTee RX', 5150.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.aboutgolf.com/', NULL, 8.9),
('ESB1', 475.0, 'Radar-based', 'Behind', 8.0, 11.0, 15.0, 8.0, 'https://www.ernestgolf.com/', NULL, 7.0),
('ES Tour Plus 2.0', 1995.0, 'Camera-based', 'Side', 8.5, 11.0, 12.0, NULL, 'https://www.ernestgolf.com/', NULL, 8.0),
('NVISAGE N1', 4995.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://nvisage.golf/', NULL, 8.7),
('ES OVT', 11000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.ernestgolf.com/', NULL, 9.6),
('Rapsodo MLM', 299.0, 'Radar-based', 'Behind', 8.0, 11.0, 15.0, 8.0, 'https://rapsodo.com/', NULL, 6.5),
('Trackman 4 Outdoor', 25000.0, 'Radar-based', 'Behind', 10.0, 15.0, 20.0, 12.0, 'https://www.trackman.com/', NULL, 10.0),
('Trackman iO Home', 13995.0, 'Radar-based', 'Behind', 10.0, 15.0, 20.0, 12.0, 'https://www.trackman.com/', NULL, 9.8),
('Trackman iO Home Complete', 18995.0, 'Radar-based', 'Behind', 10.0, 15.0, 20.0, 12.0, 'https://www.trackman.com/', NULL, 9.9),
('Foresight GC3 Ball Data', 7000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 9.0),
('Bushnell Launch Pro Ball Data', 3500.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.bushnellgolf.com/', NULL, 8.5),
('Foresight Falcon', 14995.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 9.5),
('Foresight GCHawk', 19995.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 9.8),
('Foresight GCQuad Max', 18000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 9.9),
('Bushnell Launch Pro Club Data', 4500.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.bushnellgolf.com/', NULL, 8.7),
('Foresight GC3 Club Data', 10000.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.foresightsports.com/', NULL, 9.3),
('Optishot Orbit', 749.0, 'Camera-based', 'Side', 8.0, 11.0, 12.0, NULL, 'https://www.optishot.com/', NULL, 7.2),
('Optishot Nova', 1749.0, 'Camera-based', 'Side', 8.5, 11.0, 12.0, NULL, 'https://www.optishot.com/', NULL, 7.8),
('Optishot ORION', 6999.0, 'Camera-based', 'Side', 9.0, 13.0, 15.0, NULL, 'https://www.optishot.com/', NULL, 8.5);

-- ============================================================================
-- PROJECTORS
-- ============================================================================

-- Format: (name, price, throw_ratio, max_image_size, brightness, purchase_url, light_source, resolution, lumens, achievable_aspect_ratio, rating, score)

INSERT INTO simulator_projectors (name, price, throw_ratio, max_image_size, brightness, purchase_url, light_source, resolution, lumens, achievable_aspect_ratio, rating, score) VALUES
('BenQ LW600ST', 899.0, 0.72, 120, 3600, 'https://www.benq.com/', 'Lamp', '1280x800', '3600', '16:10', NULL, 8.5),
('BenQ TK700STi', 1699.0, 1.0, 120, 3000, 'https://www.benq.com/', 'Lamp', '3840x2160', '3000', '16:9', NULL, 9.2),
('BenQ LU710', 1699.0, 1.29, 150, 4000, 'https://www.benq.com/', 'Laser', '1920x1200', '4000', '16:10', NULL, 9.0),
('BenQ LH710', 1798.0, 1.13, 150, 4000, 'https://www.benq.com/', 'Laser', '1920x1080', '4000', '16:9', NULL, 9.0),
('Optoma EH200ST', 950.0, 0.49, 100, 3000, 'https://www.optoma.com/', 'Lamp', '1920x1080', '3000', '16:9', NULL, 8.3),
('BenQ TH671ST', 799.0, 0.76, 120, 3000, 'https://www.benq.com/', 'Lamp', '1920x1080', '3000', '16:9', NULL, 8.0),
('BenQ LK936ST', 5499.0, 0.85, 200, 5100, 'https://www.benq.com/', 'Laser', '3840x2160', '5100', '16:9', NULL, 9.8);

-- ============================================================================
-- HITTING MATS
-- ============================================================================

-- Format: (name, price, dimensions, features, realistic_feel, shock_absorption, durability, sliding, use_on_concrete, quality_metric, rating, purchase_url)

INSERT INTO simulator_hitting_mats (name, price, dimensions, features, realistic_feel, shock_absorption, durability, sliding, use_on_concrete, quality_metric, rating, purchase_url) VALUES
('Carls Place', 535.0, '5x5 ft', 'Premium turf with realistic feel', 8.5, 8.0, 9.0, 8.5, 9.0, 8.6, 8.6, 'https://www.carlofet.com/'),
('Sigpro', 616.0, '4x5 ft', 'Professional grade', 8.3, 8.5, 9.2, 8.0, 9.0, 8.6, 8.6, 'https://www.sigprogolf.com/'),
('Gung Ho Holy Grail', 1245.0, '5x5 ft', 'Premium with multiple hitting surfaces', 9.0, 9.0, 9.5, 9.0, 9.5, 9.2, 9.2, 'https://www.gungho.golf/'),
('EZ-Tee Hybrid', 495.0, '4x5 ft', 'Versatile hitting surface', 7.5, 7.5, 8.0, 7.5, 8.0, 7.7, 7.7, 'https://www.rawhidegolfball.com/'),
('Monster Mat', 799.0, '5x5 ft', 'Heavy-duty construction', 8.0, 8.5, 9.0, 8.0, 9.0, 8.5, 8.5, 'https://www.rawhidegolfball.com/'),
('Go Sports', 299.0, '4x5 ft', 'Budget-friendly option', 7.0, 7.0, 7.5, 7.0, 7.5, 7.2, 7.2, 'https://www.gosports.com/'),
('Fiberbuilt', 1695.0, '4x5 ft', 'Premium fiber system', 9.5, 9.5, 9.8, 9.5, 9.5, 9.6, 9.6, 'https://www.fiberbuiltgolf.com/'),
('Bullseye Golf', 350.0, '4x5 ft', 'Entry-level mat', 6.5, 6.5, 7.0, 6.5, 7.0, 6.7, 6.7, 'https://www.bullseyegolf.com/'),
('TrueStrike', 450.0, '4x4 ft', 'Portable striking mat', 7.8, 7.5, 8.0, 7.5, 8.0, 7.7, 7.7, 'https://www.truestrikegolfmats.com/'),
('Country Club Elite', 699.0, '5x5 ft', 'Real-feel grass simulation', 8.8, 8.5, 9.0, 8.5, 9.0, 8.8, 8.8, 'https://www.countryclubgolfmats.com/'),
('DuraPro', 420.0, '4x5 ft', 'Durable commercial grade', 7.3, 7.5, 8.5, 7.0, 8.5, 7.8, 7.8, 'https://www.durapromats.com/'),
('Rawhide', 580.0, '4x5 ft', 'Natural feel turf', 8.0, 8.0, 8.5, 8.0, 8.5, 8.2, 8.2, 'https://www.rawhidegolfball.com/');

-- Verify counts
SELECT 'Launch Monitors' as table_name, COUNT(*) as count FROM simulator_launch_monitors
UNION ALL
SELECT 'Projectors', COUNT(*) FROM simulator_projectors
UNION ALL
SELECT 'Hitting Mats', COUNT(*) FROM simulator_hitting_mats;

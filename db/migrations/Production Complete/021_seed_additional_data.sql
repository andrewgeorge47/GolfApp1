-- Additional Seed Data for Simulator System
-- Date: 2025-11-26
-- Description: Insert data for computers, impact screens, and simulation software

-- ============================================================================
-- COMPUTERS
-- ============================================================================

INSERT INTO simulator_computers (name, price, processor, graphics_card, ram, storage, form_factor, performance_tier, rating, score, purchase_url) VALUES
-- NEW TIER 1 (Budget Gaming: RTX 3050-3060)
('STGAubron Gaming PC', 770.0, 'Intel i7-9700K', 'RTX 3060', 32, '1TB SSD', 'Desktop', 'Budget', 8.0, 8.0, 'https://www.amazon.com/STGAubron-Computer-Desktop-GeForce-Windows/dp/B0DPR1TR3R'),
('Raven PC RTX 3060', 850.0, 'Ryzen 7 5700G', 'RTX 3060', 16, '500GB SSD', 'Desktop', 'Budget', 8.2, 8.2, 'https://flyingphoenixpcs.com/products/certified-pre-owned-raven-nvidia-rtx-3060'),
('CyberPowerPC Gamer Xtreme', 1199.0, 'Intel i7-14700F', 'RTX 4060', 16, '1TB SSD', 'Desktop', 'Budget', 8.5, 8.5, 'https://www.amazon.com'),
('LXZ Gaming PC', 899.0, 'Intel i5-12400F', 'RTX 3050', 16, '512GB SSD', 'Desktop', 'Budget', 7.8, 7.8, 'https://www.amazon.com'),
('STGAubron 3060 1TB Model', 999.0, 'Intel i7-10700F', 'RTX 3060', 16, '1TB SSD', 'Desktop', 'Budget', 8.3, 8.3, 'https://www.amazon.com'),

-- USED TIER 1
('Used RTX 3060 Build', 650.0, 'Intel i7-8700', 'RTX 3060', 16, '512GB SSD', 'Desktop', 'Budget', 7.5, 7.5, 'https://www.ebay.com'),
('Used Ryzen 7 3700X Gaming PC', 700.0, 'Ryzen 7 3700X', 'RTX 3060', 16, '1TB SSD', 'Desktop', 'Budget', 7.8, 7.8, 'local'),
('Dell RTX 3060 Tower', 675.0, 'Intel i5-10400F', 'RTX 3060', 16, '1TB SSD', 'Desktop', 'Budget', 7.6, 7.6, 'local'),
('Custom Build GTX 1080 Upgraded to 3060', 600.0, 'Intel i7-7700K', 'RTX 3060', 16, '2TB HDD', 'Desktop', 'Budget', 7.3, 7.3, 'local'),
('Used 3060 Starter Rig', 580.0, 'Ryzen 5 2600', 'RTX 3060', 16, '512GB SSD', 'Desktop', 'Budget', 7.2, 7.2, 'https://www.jawa.gg'),

-- NEW TIER 2 (Mid-Range: RTX 3060Ti-3070)
('iBuyPower 3070 Gaming PC', 1399.0, 'Intel i7-12700F', 'RTX 3070', 16, '1TB SSD', 'Desktop', 'Mid-Range', 8.8, 8.8, 'https://www.amazon.com'),
('Skytech 3060Ti Gaming PC', 1199.0, 'Ryzen 5 5600X', 'RTX 3060 Ti', 16, '1TB SSD', 'Desktop', 'Mid-Range', 8.5, 8.5, 'https://www.amazon.com'),
('HP Omen RTX 3070 PC', 1499.0, 'Ryzen 7 5800X', 'RTX 3070', 16, '1TB SSD', 'Desktop', 'Mid-Range', 9.0, 9.0, 'https://www.amazon.com'),
('Acer Predator RTX 3070', 1599.0, 'Intel i7-11700F', 'RTX 3070', 16, '512GB SSD', 'Desktop', 'Mid-Range', 8.7, 8.7, 'https://www.amazon.com'),
('ABS Gladiator 3060Ti', 1099.0, 'Intel i5-12400F', 'RTX 3060 Ti', 16, '1TB SSD', 'Desktop', 'Mid-Range', 8.3, 8.3, 'https://www.newegg.com'),

-- USED TIER 2
('Used 3070 Build', 1000.0, 'Intel i7-9700K', 'RTX 3070', 16, '1TB SSD', 'Desktop', 'Mid-Range', 8.2, 8.2, 'local'),
('Ryzen + 3060Ti Custom', 950.0, 'Ryzen 5 5600X', 'RTX 3060 Ti', 16, '2TB SSD', 'Desktop', 'Mid-Range', 8.0, 8.0, 'https://www.jawa.gg'),
('Used HP Omen 3070', 1100.0, 'Ryzen 7 5800X', 'RTX 3070', 16, '1TB SSD', 'Desktop', 'Mid-Range', 8.5, 8.5, 'https://www.ebay.com'),
('Used 3070 Tower', 1050.0, 'Intel i9-9900K', 'RTX 3070', 16, '512GB SSD', 'Desktop', 'Mid-Range', 8.3, 8.3, 'local'),
('Used ABS Gladiator 3060Ti', 900.0, 'Intel i5-12400F', 'RTX 3060Ti', 16, '1TB SSD', 'Desktop', 'Mid-Range', 7.9, 7.9, 'local'),

-- NEW TIER 3 (High-End: RTX 3080+)
('Skytech 3080 Gaming PC', 1499.0, 'Ryzen 7 5800X', 'RTX 3080', 32, '1TB SSD', 'Desktop', 'High-End', 9.3, 9.3, 'https://www.amazon.com'),
('ROG Strix 3080 PC', 1599.0, 'Ryzen 9 5900X', 'RTX 3080', 32, '1TB SSD + 2TB HDD', 'Desktop', 'High-End', 9.5, 9.5, 'https://www.newegg.com'),
('PRC RTX 3080 Desktop', 1379.0, 'Intel i7-8700', 'RTX 3080', 16, '1TB SSD', 'Desktop', 'High-End', 9.0, 9.0, 'https://www.newegg.com'),
('Ryzen 5 7500F 3080 Build', 1349.0, 'Ryzen 5 7500F', 'RTX 3080', 16, '1TB SSD', 'Desktop', 'High-End', 8.9, 8.9, 'https://www.jawa.gg'),
('Dell Alienware Aurora 3080', 1599.0, 'Intel i9-11900KF', 'RTX 3080', 32, '1TB SSD', 'Desktop', 'High-End', 9.4, 9.4, 'https://www.amazon.com'),

-- USED TIER 3
('Used 3080 + Ryzen 7', 1000.0, 'Ryzen 7 3700X', 'RTX 3080', 32, '1TB SSD', 'Desktop', 'High-End', 8.8, 8.8, 'local'),
('Used 3080Ti Build', 1200.0, 'Intel i9-10900K', 'RTX 3080 Ti', 32, '2TB SSD', 'Desktop', 'High-End', 9.2, 9.2, 'https://www.ebay.com'),
('Used 3090 Rig', 1400.0, 'Ryzen 9 5900X', 'RTX 3090', 32, '2TB NVMe', 'Desktop', 'Professional', 9.6, 9.6, 'https://www.jawa.gg'),
('Used Alienware 3080', 1100.0, 'Intel i7-11700KF', 'RTX 3080', 32, '1TB SSD', 'Desktop', 'High-End', 8.9, 8.9, 'local'),
('Used Custom 3080 Watercooled', 1350.0, 'Ryzen 9 5900X', 'RTX 3080', 32, '2TB SSD', 'Desktop', 'High-End', 9.3, 9.3, 'local');

-- ============================================================================
-- IMPACT SCREENS
-- ============================================================================

INSERT INTO simulator_impact_screens (name, price, dimensions, material, min_room_width, min_room_height, impact_resistance, image_quality, durability, rating, score, purchase_url) VALUES
('Carls Place Preferred', 649.0, '160x120 inches', 'Polyester triple-layer', 13.3, 10.0, 8.6, 8.8, 8.9, 8.6, 8.55, 'https://carlofet.com'),
('Carls Place Premium', 899.0, '160x120 inches', 'High-density polyester triple-layer', 13.3, 10.0, 9.1, 9.5, 9.4, 9.2, 9.1, 'https://carlofet.com'),
('SIGPRO Premium', 799.0, '150x110 inches', 'Woven polyester multi-layer', 12.5, 9.2, 8.9, 9.0, 9.2, 8.9, 8.85, 'https://sigprogolf.com'),
('HomeCourse ProScreen 180', 2199.0, '180x108 inches', 'Impact fabric with motorized enclosure', 15.0, 9.0, 8.1, 8.3, 8.2, 8.2, 8.15, 'https://homecourse.com'),
('Net Return Pro Series Screen', 595.0, '120x100 inches', 'Polyester impact fabric', 10.0, 8.3, 8.4, 8.0, 8.3, 8.1, 8.1, 'https://netreturn.com'),
('GoSports Budget Impact Screen', 299.0, '120x100 inches', 'Single-layer polyester', 10.0, 8.3, 7.2, 7.3, 7.4, 7.3, 7.25, 'https://gosports.com'),
('Rawhide Commercial Impact Screen', 1195.0, '180x120 inches', 'Heavy-duty commercial polyester', 15.0, 10.0, 9.0, 8.9, 9.5, 9.0, 9.05, 'https://rawhidegolfball.com'),
('DIY Archery Baffle Impact Screen', 225.0, '120x96 inches', 'Archery-grade nylon', 10.0, 8.0, 7.5, 6.8, 7.8, 7.3, 7.33, 'https://diy-golf.com');

-- ============================================================================
-- SIMULATION SOFTWARE
-- ============================================================================

INSERT INTO simulator_software (name, price, pricing_model, compatible_launch_monitors, features, course_count, game_modes, rating, score, purchase_url) VALUES
('GSPro', 250.0, 'Annual', 'Universal', 'High realism, Fast ball physics, Community courses, Tournament play', 500, 'Practice, Tournament, Online Multiplayer', 9.5, 9.5, 'https://gsprogolf.com'),
('E6 Connect', 300.0, 'Annual', 'Universal', 'Online events, Cloud profile, Large course library', 100, 'Practice, Tournament, Online Events', 9.0, 9.0, 'https://www.e6golf.com'),
('FSX Play', 0.0, 'One-time', 'Foresight,Bushnell', 'Modern graphics engine, Club & ball data, Foresight exclusive', 50, 'Practice, Skills Challenges', 8.5, 8.5, 'https://www.foresightsports.com'),
('FSX 2020', 3000.0, 'One-time', 'Foresight,Bushnell', 'Practice modes, Benchmarking, Course library', 75, 'Practice, Tournament, Benchmarking', 9.2, 9.2, 'https://www.foresightsports.com'),
('Trackman Performance Studio', 1000.0, 'Annual', 'Trackman', 'Elite ball tracking, Integrated video, Tour data', 40, 'Practice, Video Analysis, Tour Benchmarking', 9.8, 9.8, 'https://www.trackman.com'),
('TGC 2019', 999.0, 'One-time', 'Universal', 'Large course library, Online multiplayer', 200, 'Practice, Tournament, Online Multiplayer', 8.8, 8.8, 'https://protee-united.com');

-- Verify counts
SELECT 'Computers' as table_name, COUNT(*) as count FROM simulator_computers
UNION ALL
SELECT 'Impact Screens', COUNT(*) FROM simulator_impact_screens
UNION ALL
SELECT 'Software', COUNT(*) FROM simulator_software
UNION ALL
SELECT 'Launch Monitors', COUNT(*) FROM simulator_launch_monitors
UNION ALL
SELECT 'Projectors', COUNT(*) FROM simulator_projectors
UNION ALL
SELECT 'Hitting Mats', COUNT(*) FROM simulator_hitting_mats;

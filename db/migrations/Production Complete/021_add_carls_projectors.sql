-- Add Carl's Place Projectors
-- Date: 2025-11-26
-- Description: Add projectors from Carl's Place golf simulator shop

-- Note: Updating existing projectors and adding new ones
-- Scores calculated based on: resolution (4K=+1), brightness, throw ratio, and price/performance

-- Fix the sequence to continue from the max existing ID
SELECT setval('simulator_projectors_id_seq', (SELECT MAX(id) FROM simulator_projectors));

-- Update existing BenQ TH671ST with Carl's price and URL
UPDATE simulator_projectors
SET price = 949.0, purchase_url = 'https://shop.carlofet.com/benq-th671st-golf-simulator-projector'
WHERE name = 'BenQ TH671ST';

-- Update existing BenQ LK936ST with Carl's price and URL
UPDATE simulator_projectors
SET price = 4899.0, purchase_url = 'https://shop.carlofet.com/benq-lk936st-golf-simulator-projector'
WHERE name = 'BenQ LK936ST';

-- Insert new projectors from Carl's Place
INSERT INTO simulator_projectors (name, price, throw_ratio, max_image_size, brightness, purchase_url, light_source, resolution, lumens, achievable_aspect_ratio, rating, score) VALUES

-- BenQ TK710STi 4K UHD - Smart projector with 4K
('BenQ TK710STi 4K UHD', 1999.0, 0.90, 120, 3200, 'https://shop.carlofet.com/benq-tk710sti-golf-simulator-projector', 'DLP', '4K UHD (3840x2160)', '3200', '16:9', 9.0, 9.0),

-- BenQ AH500ST - Budget laser with short throw
('BenQ AH500ST', 1999.0, 0.50, 120, 4000, 'https://shop.carlofet.com/benq-ah500st-golf-simulator-projector', 'Laser', '1080p (1920x1080)', '4000', '16:9, 16:10, 4:3', 8.7, 8.7),

-- Optoma ZH450ST - Ultra short throw laser
('Optoma ZH450ST', 2289.0, 0.50, 120, 4200, 'https://shop.carlofet.com/optoma-zh450st-golf-simulator-projector', 'Laser', '1080p (1920x1080)', '4200', '16:9', 9.1, 9.1),

-- BenQ AH700ST - Higher brightness laser
('BenQ AH700ST', 2299.0, 0.76, 150, 4000, 'https://shop.carlofet.com/benq-ah700st-golf-simulator-projector', 'Laser', '1080p (1920x1080)', '4000', '16:9, 16:10, 4:3', 8.8, 8.8),

-- BenQ AK700ST 4K - 4K version of AH700ST
('BenQ AK700ST 4K', 2899.0, 0.76, 150, 4000, 'https://shop.carlofet.com/benq-ak700st-golf-simulator-projector', 'Laser', '4K UHD (3840x2160)', '4000', '16:9', 9.3, 9.3),

-- LG ProBeam BU53RG - Premium 4K with high brightness
('LG ProBeam BU53RG', 3799.0, 1.04, 180, 5000, 'https://shop.carlofet.com/lg-bu53rg-golf-simulator-projector', 'Laser', '4K UHD (3840x2160)', '5000', '16:9, 4:3', 9.5, 9.5),

-- Appotronics MK625B - Highest brightness 4K
('Appotronics MK625B', 4999.0, 0.80, 200, 6200, 'https://shop.carlofet.com/appotronics-mk625b-golf-simulator-projector', 'Laser (ALPD)', '4K UHD (3840x2160)', '6200', '16:9', 9.7, 9.7),

-- Epson L695SE - Commercial grade ultra bright
('Epson L695SE', 5710.0, 0.70, 200, 7000, 'https://shop.carlofet.com/epson-l695se-golf-simulator-projector', '3LCD Laser', '1080p WUXGA', '7000', '16:10', 9.4, 9.4);

-- Verify the updates and inserts
SELECT name, price, throw_ratio, brightness, resolution, score
FROM simulator_projectors
ORDER BY score DESC;

-- Count total projectors
SELECT COUNT(*) as total_projectors FROM simulator_projectors;

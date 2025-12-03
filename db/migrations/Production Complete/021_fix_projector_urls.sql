-- Fix Carl's Place Projector URLs
-- Date: 2025-11-26
-- Description: Update URLs to follow correct Carl's Place URL pattern

UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-th671st-golf-simulator-projector' WHERE name = 'BenQ TH671ST';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-lk936st-golf-simulator-projector' WHERE name = 'BenQ LK936ST';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-tk710sti-golf-simulator-projector' WHERE name = 'BenQ TK710STi 4K UHD';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-ah500st-golf-simulator-projector' WHERE name = 'BenQ AH500ST';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/optoma-zh450st-golf-simulator-projector' WHERE name = 'Optoma ZH450ST';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-ah700st-golf-simulator-projector' WHERE name = 'BenQ AH700ST';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/benq-ak700st-golf-simulator-projector' WHERE name = 'BenQ AK700ST 4K';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/lg-bu53rg-golf-simulator-projector' WHERE name = 'LG ProBeam BU53RG';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/appotronics-mk625b-golf-simulator-projector' WHERE name = 'Appotronics MK625B';
UPDATE simulator_projectors SET purchase_url = 'https://shop.carlofet.com/epson-l695se-golf-simulator-projector' WHERE name = 'Epson L695SE';

-- Verify the updates
SELECT name, purchase_url FROM simulator_projectors WHERE purchase_url LIKE '%carlofet%' ORDER BY name;

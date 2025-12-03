-- Update Software Compatibility
-- Date: 2025-11-26
-- Description: Add compatible launch monitor information to existing software

-- Update software with compatibility information
UPDATE simulator_software SET compatible_launch_monitors = 'Universal' WHERE name = 'GSPro';
UPDATE simulator_software SET compatible_launch_monitors = 'Universal' WHERE name = 'E6 Connect';
UPDATE simulator_software SET compatible_launch_monitors = 'Foresight,Bushnell' WHERE name = 'FSX Play';
UPDATE simulator_software SET compatible_launch_monitors = 'Foresight,Bushnell' WHERE name = 'FSX 2020';
UPDATE simulator_software SET compatible_launch_monitors = 'Trackman' WHERE name LIKE '%Trackman%';
UPDATE simulator_software SET compatible_launch_monitors = 'Universal' WHERE name = 'TGC 2019';

-- Verify updates
SELECT name, compatible_launch_monitors FROM simulator_software ORDER BY name;

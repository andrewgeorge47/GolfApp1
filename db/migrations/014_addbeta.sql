-- Add a beta tester permissions
INSERT INTO permissions (permission_key, permission_name, description, category)
VALUES ('access_beta_features', 'Access Beta Features', 'Can access features in beta testing', 'Beta')
ON CONFLICT (permission_key) DO NOTHING;


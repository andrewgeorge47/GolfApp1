-- Migration: Create registration form templates table
-- Description: Creates a table to store reusable registration form templates that can be used across signups and tournaments
-- Created: 2025-12-02

-- Create registration_form_templates table
CREATE TABLE IF NOT EXISTS registration_form_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    template_key VARCHAR(100) UNIQUE NOT NULL, -- Unique identifier for the template (e.g., 'basic_info', 'dietary_preferences')
    questions JSONB NOT NULL, -- Array of question objects
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted, only deactivated
    created_by INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_questions CHECK (jsonb_typeof(questions) = 'array')
);

-- Create indexes for better query performance
CREATE INDEX idx_registration_templates_active ON registration_form_templates(is_active);
CREATE INDEX idx_registration_templates_category ON registration_form_templates(category);
CREATE INDEX idx_registration_templates_key ON registration_form_templates(template_key);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_registration_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_registration_templates_updated_at
    BEFORE UPDATE ON registration_form_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_registration_templates_updated_at();

-- Seed initial templates from the existing hardcoded templates
INSERT INTO registration_form_templates (name, description, category, template_key, questions, is_system, is_active) VALUES
(
    'Basic Information',
    'Collect basic participant information',
    'general',
    'basic_info',
    '[
        {
            "id": "phone_number",
            "type": "text",
            "question": "Phone Number",
            "required": true,
            "placeholder": "(555) 123-4567"
        },
        {
            "id": "shirt_size",
            "type": "radio",
            "question": "T-Shirt Size",
            "options": ["S", "M", "L", "XL", "2XL", "3XL"],
            "required": true
        }
    ]'::jsonb,
    true,
    true
),
(
    'Dietary & Preferences',
    'Collect dietary restrictions and meal preferences',
    'event',
    'dietary_preferences',
    '[
        {
            "id": "dietary_restrictions",
            "type": "checkbox",
            "question": "Do you have any dietary restrictions?",
            "options": ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut Allergy", "None"],
            "required": false
        },
        {
            "id": "meal_preference",
            "type": "radio",
            "question": "Meal Preference",
            "options": ["Chicken", "Beef", "Fish", "Vegetarian"],
            "required": false
        }
    ]'::jsonb,
    true,
    true
),
(
    'Team Formation',
    'Let participants form teams or request teammates',
    'tournament',
    'team_formation',
    '[
        {
            "id": "has_team",
            "type": "radio",
            "question": "Do you have a team?",
            "options": ["Yes", "No - Need teammates", "No preference"],
            "required": true
        },
        {
            "id": "team_name",
            "type": "text",
            "question": "Team Name (if applicable)",
            "required": false,
            "placeholder": "Enter your team name",
            "conditional": {
                "dependsOn": "has_team",
                "showWhen": "Yes"
            }
        },
        {
            "id": "teammate_names",
            "type": "text",
            "question": "Teammate Names",
            "required": false,
            "placeholder": "Enter teammate names separated by commas",
            "conditional": {
                "dependsOn": "has_team",
                "showWhen": "Yes"
            }
        }
    ]'::jsonb,
    true,
    true
),
(
    'Availability Check',
    'Check participant availability for event dates',
    'general',
    'availability',
    '[
        {
            "id": "attendance_confirmation",
            "type": "radio",
            "question": "Can you attend the full event?",
            "options": ["Yes, all days", "Partial attendance", "Not sure yet"],
            "required": true
        },
        {
            "id": "partial_dates",
            "type": "text",
            "question": "Which dates can you attend?",
            "required": false,
            "placeholder": "e.g., Saturday only, Sunday morning",
            "conditional": {
                "dependsOn": "attendance_confirmation",
                "showWhen": "Partial attendance"
            }
        }
    ]'::jsonb,
    true,
    true
),
(
    'Live Rounds',
    'Ask participants about their participation in live rounds and night availability',
    'league',
    'live_rounds',
    '[
        {
            "id": "participation_type",
            "type": "radio",
            "question": "Are you planning to participate in Live rounds this week or will you be playing solo?",
            "options": ["Live", "Solo"],
            "required": true
        },
        {
            "id": "night_availability",
            "type": "checkbox",
            "question": "Choose which of the following nights absolutely work for you THIS week.",
            "options": [
                "Wednesday (7-10)",
                "Thursday (7-10)",
                "Friday (7-10)",
                "Saturday (7-10)"
            ],
            "required": true,
            "conditional": {
                "dependsOn": "participation_type",
                "showWhen": "Live"
            }
        }
    ]'::jsonb,
    true,
    true
),
(
    'Night Availability',
    'Simple night availability selection',
    'league',
    'night_availability',
    '[
        {
            "id": "available_nights",
            "type": "checkbox",
            "question": "Which nights are you available this week?",
            "options": [
                "Monday (7-10)",
                "Tuesday (7-10)",
                "Wednesday (7-10)",
                "Thursday (7-10)",
                "Friday (7-10)",
                "Saturday (7-10)",
                "Sunday (7-10)"
            ],
            "required": true
        }
    ]'::jsonb,
    true,
    true
);

-- Add comment to table
COMMENT ON TABLE registration_form_templates IS 'Stores reusable registration form templates for signups and tournaments';
COMMENT ON COLUMN registration_form_templates.template_key IS 'Unique identifier used in code to reference this template';
COMMENT ON COLUMN registration_form_templates.questions IS 'JSONB array of question objects with fields: id, type, question, required, options, placeholder, conditional';
COMMENT ON COLUMN registration_form_templates.is_system IS 'System templates are preloaded and cannot be deleted, only deactivated';
COMMENT ON COLUMN registration_form_templates.category IS 'Category for organizing templates: general, event, tournament, league, etc.';

-- Add registration form columns to signups table
ALTER TABLE signups ADD COLUMN IF NOT EXISTS has_registration_form BOOLEAN DEFAULT false;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS registration_form_template VARCHAR(100) REFERENCES registration_form_templates(template_key) ON DELETE SET NULL;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS registration_form_data JSONB;

-- Add comments for new columns
COMMENT ON COLUMN signups.has_registration_form IS 'Whether this signup uses a custom registration form';
COMMENT ON COLUMN signups.registration_form_template IS 'Reference to the template_key in registration_form_templates';
COMMENT ON COLUMN signups.registration_form_data IS 'Additional custom form configuration if needed';

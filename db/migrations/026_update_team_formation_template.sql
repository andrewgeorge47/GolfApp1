-- Migration: Update Team Formation template to Captain & Team Formation with member multiselect
-- Description: Renames template and replaces text input for teammates with member multiselect
-- Created: 2025-12-02

-- Update the Team Formation template
UPDATE registration_form_templates
SET
  name = 'Captain & Team Formation',
  description = 'Let team captains form teams by selecting members from their club',
  questions = '[
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
      "id": "teammate_selection",
      "type": "member_multiselect",
      "question": "Select Your Teammates",
      "required": false,
      "restrictToClub": true,
      "maxSelections": 3,
      "conditional": {
        "dependsOn": "has_team",
        "showWhen": "Yes"
      }
    }
  ]'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE template_key = 'team_formation';

-- Add a comment to document the change
COMMENT ON COLUMN registration_form_templates.questions IS 'JSONB array of question objects. Supports types: text, radio, checkbox, member_multiselect. Member multiselect questions can have restrictToClub (boolean) and maxSelections (number) properties.';

# Registration Forms with Member Multi-Select

## Overview

The registration form system now supports selecting club members as part of the registration process. This is particularly useful for team formation where captains can select their teammates from their club.

## New Question Type: `member_multiselect`

### Features
- **Searchable member list**: Users can search for members by name
- **Club filtering**: Restrict selection to only members from the user's club
- **Multi-selection**: Select multiple team members
- **Maximum selections**: Limit the number of members that can be selected
- **Conditional display**: Show/hide based on previous answers
- **Required validation**: Ensure at least one member is selected if required

### Question Properties

```typescript
{
  id: string;                    // Unique identifier (e.g., "teammate_selection")
  type: "member_multiselect";    // Question type
  question: string;              // Question text
  required: boolean;             // Whether the question is required
  restrictToClub?: boolean;      // If true, only show members from user's club (default: true)
  maxSelections?: number;        // Maximum number of members (optional)
  conditional?: {                // Optional conditional display
    dependsOn: string;           // ID of question this depends on
    showWhen: string;            // Value that triggers display
  };
}
```

## Database Migration

Run the migration to update the Team Formation template:

```bash
psql -d golfos -f db/migrations/026_update_team_formation_template.sql
```

This will:
- Rename "Team Formation" to "Captain & Team Formation"
- Replace the text input for teammates with a member multi-select question
- Set a maximum of 3 teammate selections
- Restrict selections to the user's club only

## Backend API

### Endpoint: Get Club Members
```
GET /api/users/club-members?club={clubName}
```

**Authentication**: Required

**Query Parameters**:
- `club` (optional): Filter members by club name

**Response**:
```json
[
  {
    "member_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "club": "Club Name"
  }
]
```

## Frontend Components

### 1. MemberMultiSelect Component

Location: `client/src/components/MemberMultiSelect.tsx`

**Props**:
```typescript
interface MemberMultiSelectProps {
  selectedMembers: number[];     // Array of selected member IDs
  onChange: (memberIds: number[]) => void;  // Callback when selection changes
  userClub?: string;             // User's club for filtering
  restrictToClub?: boolean;      // Filter to club only (default: true)
  maxSelections?: number;        // Maximum selections allowed
  required?: boolean;            // Whether selection is required
}
```

**Usage**:
```tsx
import { MemberMultiSelect } from './components/MemberMultiSelect';

<MemberMultiSelect
  selectedMembers={selectedMemberIds}
  onChange={setSelectedMemberIds}
  userClub={user.club}
  restrictToClub={true}
  maxSelections={3}
  required={false}
/>
```

### 2. RegistrationFormRenderer Component

Location: `client/src/components/RegistrationFormRenderer.tsx`

This component handles rendering all registration form question types, including the new `member_multiselect` type.

**Usage**:
```tsx
import { RegistrationFormRenderer } from './components/RegistrationFormRenderer';

const [formData, setFormData] = useState<Record<string, any>>({});

const handleChange = (questionId: string, value: any) => {
  setFormData(prev => ({ ...prev, [questionId]: value }));
};

<RegistrationFormRenderer
  questions={template.questions}
  formData={formData}
  onChange={handleChange}
  userClub={user?.club}
/>
```

## Creating Templates with Member Selection

### Via Admin UI

1. Navigate to `/admin/registration-templates`
2. Click "Create Template"
3. Fill in template details
4. Add a question:
   - **Type**: Select "Member Multi-Select"
   - **Question ID**: e.g., `teammate_selection`
   - **Question Text**: e.g., "Select Your Teammates"
   - **Restrict to user's club only**: Check this to filter by club
   - **Maximum Selections**: Enter a number (e.g., 3) or leave blank for unlimited
   - **Required**: Check if selection is mandatory

### Via Database

```sql
INSERT INTO registration_form_templates (name, category, template_key, questions, is_system)
VALUES (
  'My Team Template',
  'tournament',
  'my_team_template',
  '[
    {
      "id": "teammate_selection",
      "type": "member_multiselect",
      "question": "Select Your Teammates",
      "required": true,
      "restrictToClub": true,
      "maxSelections": 3
    }
  ]'::jsonb,
  false
);
```

## Example: Captain & Team Formation Template

The updated template now includes:

1. **Do you have a team?** (Radio)
   - Yes
   - No - Need teammates
   - No preference

2. **Team Name** (Text) - Shows if "Yes" selected
   - Text input for team name

3. **Select Your Teammates** (Member Multi-Select) - Shows if "Yes" selected
   - Search and select up to 3 teammates from your club
   - Filtered to show only club members
   - Searchable by name

## Integration in Signup/Tournament Registration

To integrate into the registration flow:

```tsx
import { RegistrationFormRenderer } from './components/RegistrationFormRenderer';
import { useAuth } from './AuthContext';

const MyRegistrationForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    // formData will contain:
    // {
    //   has_team: "Yes",
    //   team_name: "The Eagles",
    //   teammate_selection: [123, 456, 789] // member_ids
    // }

    await registerForSignup(signupId, formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <RegistrationFormRenderer
        questions={signup.registration_form_data.questions}
        formData={formData}
        onChange={(questionId, value) =>
          setFormData(prev => ({ ...prev, [questionId]: value }))
        }
        userClub={user?.club}
      />
      <button type="submit">Register</button>
    </form>
  );
};
```

## Data Storage

When a user submits a registration with member selections, the data is stored as:

```json
{
  "has_team": "Yes",
  "team_name": "The Eagles",
  "teammate_selection": [123, 456, 789]
}
```

The `teammate_selection` field contains an array of `member_id` values that can be joined with the `users` table to get full member details.

## Retrieving Selected Members

To display the selected members:

```tsx
const getSelectedMembers = async (memberIds: number[]) => {
  // Fetch member details
  const members = await Promise.all(
    memberIds.map(id => api.get(`/api/users/${id}`))
  );
  return members;
};
```

Or with a SQL query:

```sql
SELECT u.member_id, u.first_name, u.last_name, u.club
FROM users u
WHERE u.member_id = ANY($1::int[]);
```

## Benefits

1. **Improved UX**: No more typing names - searchable member selection
2. **Data Quality**: Stores member IDs instead of free text names
3. **Validation**: Ensures selected members actually exist
4. **Reporting**: Easy to query and analyze team compositions
5. **Flexibility**: Configurable max selections and club filtering

## Next Steps

To fully integrate this feature:

1. ✅ Run database migration to update Team Formation template
2. ✅ Test creating templates with member_multiselect in admin UI
3. Update SignupRegistration.tsx to use RegistrationFormRenderer
4. Update tournament registration flow to use RegistrationFormRenderer
5. Add admin views to see team compositions from registration data
6. Consider adding team auto-creation based on captain selections

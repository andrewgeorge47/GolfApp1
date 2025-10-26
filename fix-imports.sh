#!/bin/bash

# Fix imports in all challenge components
perl -i -pe 's/import \{ (.+?), Loading, (.+?) \} from/import { $1, SimpleLoading, $2 } from/g' client/src/components/WeeklyChallengeCard.tsx
perl -i -pe 's/import \{ (.+?), Loading, (.+?) \} from/import { $1, SimpleLoading, $2 } from/g' client/src/components/ChallengeLeaderboard.tsx
perl -i -pe 's/import \{ (.+?), Loading, (.+?) \} from/import { $1, SimpleLoading, $2 } from/g' client/src/components/WeeklyChallengeAdmin.tsx

# Add Textarea to imports where needed
perl -i -pe 's/(import \{ .+?), Input, (.+? \} from '\''\.\/ui'\'')/\1, Input, Textarea, \2/g' client/src/components/ChallengeEntryModal.tsx
perl -i -pe 's/(import \{ .+?), Input, (.+? \} from '\''\.\/ui'\'')/\1, Input, Textarea, \2/g' client/src/components/ChallengeDistanceSubmission.tsx
perl -i -pe 's/(import \{ .+?), Input, (.+? \} from '\''\.\/ui'\'')/\1, Input, Textarea, \2/g' client/src/components/WeeklyChallengeAdmin.tsx

# Remove duplicate Textarea import if it exists
perl -i -pe 's/\nimport \{ Textarea \} from '\''\.\/ui\/Input'\'';?//g' client/src/components/ChallengeEntryModal.tsx

echo "Imports fixed!"

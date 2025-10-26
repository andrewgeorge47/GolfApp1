#!/bin/bash

# Fix WeeklyChallengeCard.tsx
sed -i 's/import ChallengEntryModal/import ChallengeEntryModal/g' client/src/components/WeeklyChallengeCard.tsx
sed -i 's/<Loading text="Loading challenge\.\.\." \/>/<Spinner size="lg" \/>\n          <p className="text-gray-600 mt-2">Loading challenge...<\/p>/g' client/src/components/WeeklyChallengeCard.tsx
sed -i 's/variant="primary"/className="bg-indigo-100 text-indigo-800"/g' client/src/components/WeeklyChallengeCard.tsx
sed -i 's/variant="success"/className="bg-green-100 text-green-800"/g' client/src/components/WeeklyChallengeCard.tsx
sed -i 's/variant="info"/className="bg-blue-100 text-blue-800"/g' client/src/components/WeeklyChallengeCard.tsx
sed -i 's/variant="warning"/className="bg-yellow-100 text-yellow-800"/g' client/src/components/WeeklyChallengeCard.tsx

echo "Fixed WeeklyChallengeCard.tsx"

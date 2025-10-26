#!/bin/bash

# Export SimpleLoading in ui/index.ts
echo "export { SimpleLoading } from './SimpleLoading';" >> client/src/components/ui/index.ts

# Fix all the challenge components
FILES=(
  "client/src/components/WeeklyChallengeCard.tsx"
  "client/src/components/ChallengeEntryModal.tsx"
  "client/src/components/ChallengeLeaderboard.tsx"
  "client/src/components/ChallengeDistanceSubmission.tsx"
  "client/src/components/WeeklyChallengeAdmin.tsx"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Fix imports
  perl -i -pe 's/import ChallengEntryModal/import ChallengeEntryModal/g' "$file"
  perl -i -pe 's/Loading,/SimpleLoading,/g' "$file"
  perl -i -pe 's/<Loading text=/<?SimpleLoading text=/g' "$file"
  perl -i -pe 's/<\/Loading>/<\/SimpleLoading>/g' "$file"
  
  # Fix Modal props
  perl -i -pe 's/isOpen=/open=/g' "$file"
  
  # Fix ModalHeader - remove onClose prop
  perl -i -pe 's/<ModalHeader onClose=\{[^}]+\}>/<ModalHeader>/g' "$file"
  
  # Fix ConfirmationDialog
  perl -i -pe 's/confirmLabel=/confirmText=/g' "$file"
  
  # Fix EmptyState icon prop - pass component, not element
  perl -i -pe 's/icon=\{<(\w+) \/>\}/icon={$1}/g' "$file"
  
  # Fix Button variant "warning" -> "danger"
  perl -i -pe 's/variant="warning"/variant="danger"/g' "$file"
  
  # Fix Tabs - use id instead of value
  perl -i -pe 's/value: '\''(\w+)'\''/id: '\''\1'\''/g' "$file"
  
  # Fix TabPanel - use value and activeValue
  perl -i -pe 's/<TabPanel active=\{activeTab === '\''(\w+)'\''\}>/<TabPanel value="$1" activeValue={activeTab}>/g' "$file"
  
done

echo "All files fixed!"

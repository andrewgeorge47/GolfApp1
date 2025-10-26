#!/usr/bin/env python3
import re

# Fix ChallengeEntryModal.tsx
print("Fixing ChallengeEntryModal...")
with open('client/src/components/ChallengeEntryModal.tsx', 'r') as f:
    content = f.read()

# Fix imports - add Textarea
content = re.sub(
    r'(import .* from \'\.\/ui\';)',
    r'\1\nimport { Textarea } from \'./ui/Input\';',
    content,
    count=1
)

# Fix Select - use options prop instead of children
select_pattern = r'<Select\s+value=\{paymentMethod\}\s+onChange=\{[^}]+\}\s+required\s*>\s*\{paymentOptions\.map[^}]+SelectOption[^}]+\}\)\}\s*</Select>'
select_replacement = '''<Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={paymentOptions}
                required
              />'''
content = re.sub(select_pattern, select_replacement, content, flags=re.DOTALL)

# Fix Input as="textarea" to Textarea
content = re.sub(
    r'<Input\s+as="textarea"',
    r'<Textarea',
    content
)
content = re.sub(
    r'rows=\{3\}',
    r'rows={3}',
    content
)

with open('client/src/components/ChallengeEntryModal.tsx', 'w') as f:
    f.write(content)

# Fix ChallengeDistanceSubmission.tsx
print("Fixing ChallengeDistanceSubmission...")
with open('client/src/components/ChallengeDistanceSubmission.tsx', 'r') as f:
    content = f.read()

# Fix Switch onChange
content = re.sub(
    r'<Switch\s+checked=\{holeInOne\}\s+onChange=\{setHoleInOne\}',
    r'<Switch\n                  checked={holeInOne}\n                  onChange={(checked) => setHoleInOne(checked)}',
    content
)

# Fix Input as="textarea"
content = re.sub(
    r'<Input\s+as="textarea"',
    r'<Textarea',
    content
)

with open('client/src/components/ChallengeDistanceSubmission.tsx', 'w') as f:
    f.write(content)

# Fix WeeklyChallengeAdmin.tsx  
print("Fixing WeeklyChallengeAdmin...")
with open('client/src/components/WeeklyChallengeAdmin.tsx', 'r') as f:
    content = f.read()

# Fix Input as="textarea"
content = re.sub(
    r'<Input\s+label="Override Reason \(if different\)"\s+as="textarea"',
    r'<Textarea\n                label="Override Reason (if different)"',
    content
)

with open('client/src/components/WeeklyChallengeAdmin.tsx', 'w') as f:
    f.write(content)

# Fix WeeklyChallengeCard.tsx - remove StatCard variant props
print("Fixing WeeklyChallengeCard...")
with open('client/src/components/WeeklyChallengeCard.tsx', 'r') as f:
    content = f.read()

# Remove variant props from StatCard (they don't exist)
content = re.sub(
    r'\s+variant="[^"]*"\s*\n\s*/>', 
    r'\n            />',
    content
)

with open('client/src/components/WeeklyChallengeCard.tsx', 'w') as f:
    f.write(content)

print("All complex issues fixed!")

#!/usr/bin/env python3
import re

print("Applying final fixes to all challenge components...")

# Fix ChallengeEntryModal.tsx
print("1. Fixing ChallengeEntryModal.tsx...")
with open('client/src/components/ChallengeEntryModal.tsx', 'r') as f:
    content = f.read()

# Remove escaped quotes and duplicate Textarea import
content = re.sub(r"import \{ Textarea \} from \\'\.\/ui\/Input\\';\n?", '', content)

# Fix SelectOption to use value instead of id
content = re.sub(r'\{ id: (\'[^\']+\'), label:', r'{ value: \1, label:', content)

# Fix Select to use options prop
content = re.sub(
    r'<Select\s+value=\{paymentMethod\}\s+onChange=\{[^}]+\}\s+required\s*>\s*\{paymentOptions\.map[^\}]+\}\)\}\s*</Select>',
    '<Select\n                value={paymentMethod}\n                onChange={(e) => setPaymentMethod(e.target.value)}\n                options={paymentOptions}\n                required\n              />',
    content,
    flags=re.DOTALL
)

# Fix Alert variant danger -> error
content = re.sub(r'<Alert variant="danger">', r'<Alert variant="error">', content)

with open('client/src/components/ChallengeEntryModal.tsx', 'w') as f:
    f.write(content)

# Fix ChallengeDistanceSubmission.tsx
print("2. Fixing ChallengeDistanceSubmission.tsx...")
with open('client/src/components/ChallengeDistanceSubmission.tsx', 'r') as f:
    content = f.read()

# Fix Switch onChange and size
content = re.sub(
    r'<Switch\s+checked=\{holeInOne\}\s+onChange=\{[^}]+\}\s+size="lg"\s*/>',
    '<Switch\n                  checked={holeInOne}\n                  onChange={(e) => setHoleInOne(e.target.checked)}\n                  switchSize="lg"\n                />',
    content
)

# Fix Alert variant
content = re.sub(r'<Alert variant="danger">', r'<Alert variant="error">', content)

with open('client/src/components/ChallengeDistanceSubmission.tsx', 'w') as f:
    f.write(content)

# Fix ChallengeLeaderboard.tsx
print("3. Fixing ChallengeLeaderboard.tsx...")
with open('client/src/components/ChallengeLeaderboard.tsx', 'r') as f:
    content = f.read()

# Fix <?SimpleLoading to <SimpleLoading
content = re.sub(r'<\?SimpleLoading', r'<SimpleLoading', content)

# Fix Badge variant danger -> error
content = re.sub(r'<Badge variant="danger">', r'<Badge variant="error">', content)

with open('client/src/components/ChallengeLeaderboard.tsx', 'w') as f:
    f.write(content)

# Fix WeeklyChallengeCard.tsx
print("4. Fixing WeeklyChallengeCard.tsx...")
with open('client/src/components/WeeklyChallengeCard.tsx', 'r') as f:
    content = f.read()

# Fix <?SimpleLoading to <SimpleLoading
content = re.sub(r'<\?SimpleLoading', r'<SimpleLoading', content)

with open('client/src/components/WeeklyChallengeCard.tsx', 'w') as f:
    f.write(content)

# Fix WeeklyChallengeAdmin.tsx
print("5. Fixing WeeklyChallengeAdmin.tsx...")
with open('client/src/components/WeeklyChallengeAdmin.tsx', 'r') as f:
    content = f.read()

# Add Textarea import if not present
if 'Textarea' not in content.split('from \'./ui\'')[0]:
    content = re.sub(
        r'(import \{[^}]+), Input,([^}]+\} from \'\.\/ui\';)',
        r'\1, Input, Textarea,\2',
        content
    )

# Fix <?SimpleLoading to <SimpleLoading
content = re.sub(r'<\?SimpleLoading', r'<SimpleLoading', content)

# Fix Tabs activeTab -> value
content = re.sub(r'activeTab=\{activeTab\}', r'value={activeTab}', content)

# Fix ConfirmationDialog onCancel -> onClose
content = re.sub(r'onCancel=', r'onClose=', content)

with open('client/src/components/WeeklyChallengeAdmin.tsx', 'w') as f:
    f.write(content)

print("All fixes applied successfully!")

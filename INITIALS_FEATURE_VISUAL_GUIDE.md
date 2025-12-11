# Initials Feature - Visual Guide

## 1. Complete Your Account Dialog

When a user enters their name in the account setup, the initials are automatically generated:

```
┌─────────────────────────────────────────────┐
│  COMPLETE YOUR ACCOUNT                      │
│  Save your account details                  │
│                                             │
│  Share your name and workspace title...     │
│                                             │
│  Your name                                  │
│  ┌─────────────────────────────────────┐   │
│  │ Eivind Josefsen                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Initials (auto-generated)                  │
│  ┌─────────────────────────────────────┐   │
│  │ EJ                              🔒  │   │ (Read-only)
│  └─────────────────────────────────────┘   │
│                                             │
│  Workspace name                             │
│  ┌─────────────────────────────────────┐   │
│  │ My rituals HQ                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Save my account]  [Skip for now]          │
└─────────────────────────────────────────────┘
```

## 2. Profile Section (AI Strategy Assistant Tab)

The initials are displayed in the profile details:

```
┌─────────────────────────────────────────────┐
│  PROFILE                                    │
│  My account                                 │
│                                             │
│  Review your identity details and...        │
│                                             │
│  NAME          Eivind Josefsen              │
│  INITIALS      EJ                           │
│  EMAIL         josefsen.eivind@gmail.com    │
│  WORKSPACE     EJ                           │
│  MODE          Connected to Supabase        │
│  ONBOARDING    Complete                     │
│                                             │
│  [Edit account details]                     │
└─────────────────────────────────────────────┘
```

## 3. Menu Icon Toggle (Account Settings)

Users can toggle whether to show initials in the main menu:

```
┌─────────────────────────────────────────────┐
│  MENU ICON                                  │
│  Display Preferences                        │
│                                             │
│  Choose whether to display your initials... │
│                                             │
│  [✓] Show my initials (EJ) in main menu    │
│                                             │
│  ℹ️ Set your name in the account details    │
│     to enable this feature.                 │
└─────────────────────────────────────────────┘
```

## 4. Main Menu Icon (Before & After)

**Before** (Toggle OFF or not logged in):
```
┌──┐
│🌿│  ← Default icon
└──┘
HOME
TODAY
ROUTINES
...
```

**After** (Toggle ON and logged in):
```
┌──┐
│EJ│  ← User initials
└──┘
HOME
TODAY
ROUTINES
...
```

## Database Schema

New columns in `workspace_profiles` table:

| Column                  | Type    | Default | Description                                    |
|------------------------|---------|---------|------------------------------------------------|
| initials               | text    | NULL    | Auto-generated from first two word letters     |
| show_initials_in_menu  | boolean | false   | User preference for menu icon display          |

## Implementation Files

1. **src/utils/initials.ts** - Initials generation logic
2. **src/features/account/WorkspaceSetupDialog.tsx** - Account setup form
3. **src/features/account/MyAccountPanel.tsx** - Profile display and toggle
4. **src/App.tsx** - Main menu icon logic
5. **supabase/migrations/0108_add_initials.sql** - Database schema
6. **src/index.css** - Toggle component styles


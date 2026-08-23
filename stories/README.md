# Storybook Stories

Visual documentation untuk komponen Sprint 1-4.

## Setup

```bash
# Install Storybook (jalankan sekali)
bunx storybook@latest init --type nextjs

# Setelah init, merge config dari .storybook/main.ts ke .storybook/main.ts
# yang di-generate Storybook

# Atau manual:
bun add -D @storybook/nextjs @storybook/react @storybook/addon-essentials \
  @storybook/addon-links @storybook/addon-a11y @storybook/addon-themes

# Run
bun run storybook
```

Akses di browser: `http://localhost:6006`

## Struktur

```
stories/
├── shared/
│   ├── role-badge.stories.tsx           # 7 stories
│   ├── set-as-home-button.stories.tsx  # 4 stories
│   └── role-empty-state.stories.tsx    # 6 stories
└── widgets/
    ├── TrendAreaChart.stories.tsx      # 4 stories
    ├── CategoryDonutChart.stories.tsx  # 4 stories
    ├── list-widgets.stories.tsx        # 7 stories
    └── executive-widgets.stories.tsx   # 11 stories
```

**Total: 41 stories** untuk 11 komponen.

## Stories

### Shared Components
- **RoleBadge**: 7 stories (Librarian, Junior, Teacher, Student, NoUser, WithoutIcon, WithCustomClass, AllRoles)
- **SetAsHomeButton**: 4 stories (Default, Active, OnDarkBackground, AllStates)
- **RoleEmptyState**: 6 stories (StudentNoLoans, TeacherNoProposals, LibrarianNoMembers, LibrarianNoOverdue, Compact, CompareRoles)

### Dashboard Widgets
- **TrendAreaChart**: 4 stories (Default, EmptyData, HighVolume, CompactHeight)
- **CategoryDonutChart**: 4 stories (Default, TwoCategories, ManyCategories, Empty)
- **TopBooksList**: 3 stories
- **TopMembersList**: 2 stories
- **RecentLoansTable**: 2 stories

### Executive Widgets
- **ExecutiveKpiCard**: 4 stories (TotalItems, ActiveMembers, LoansWithGrowth, NegativeGrowth)
- **ExecutiveTopList**: 3 stories (Books, Members, Empty)
- **ExecutiveAlertCard**: 2 stories (WithOverdue, Empty)
- **ExecutiveTrendChart**: 1 story

## A11y Testing

Stories otomatis test a11y via `@storybook/addon-a11y`. Buka tab "Accessibility" di setiap story untuk lihat:
- Color contrast warnings
- ARIA attribute issues
- Keyboard navigation problems

## Catatan

- Mock data sudah tersedia inline (tidak perlu backend running)
- Setiap story berdiri sendiri — bisa dibuka tanpa dependency
- Stories lazy-load mock components via `decorators`
- Untuk stories yang butuh store (SetAsHomeButton), pakai `withUser` helper di decorator

# Graph Report - Perpustakaan  (2026-08-14)

## Corpus Check
- 170 files · ~81,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1205 nodes · 2966 edges · 135 communities (55 shown, 80 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 7,400 input · 5,200 output

## Community Hubs (Navigation)
- Authentication & Navigation
- Book Detail Views
- UI Sheet Components
- Forms & WebSockets
- UI Accordion & Dialog
- Gamification & Cards
- Announcements & Proposals
- Error Handling & Cards
- Build Configuration
- Member Management API
- Core API Routes
- TypeScript Config
- Announcement Views
- Toast Notifications
- Input Components
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134

## God Nodes (most connected - your core abstractions)
1. `cn()` - 249 edges
2. `requireAuth()` - 57 edges
3. `useAppStore` - 53 edges
4. `useFetch()` - 43 edges
5. `requireFullLibrarian()` - 38 edges
6. `db` - 37 edges
7. `Button()` - 36 edges
8. `formatDate()` - 32 edges
9. `Card()` - 29 edges
10. `Badge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `ReportsView` --EXTRACTED--> `recharts`  [EXTRACTED]
  agent-ctx/8-dashboard-reports-views.md → package.json
- `DashboardView` --EXTRACTED--> `recharts`  [EXTRACTED]
  agent-ctx/8-dashboard-reports-views.md → package.json
- `Pie Chart` --EXTRACTED--> `recharts`  [EXTRACTED]
  agent-ctx/8-dashboard-reports-views.md → package.json
- `Trend Chart` --EXTRACTED--> `recharts`  [EXTRACTED]
  agent-ctx/8-dashboard-reports-views.md → package.json
- `MembersView` --EXTRACTED--> `Add Member Dialog`  [EXTRACTED]
  worklog.md → agent-ctx/6-member-views.md

## Import Cycles
- None detected.

## Communities (135 total, 80 thin omitted)

### Community 0 - "Authentication & Navigation"
Cohesion: 0.08
Nodes (56): Page(), DEMO_ACCOUNTS, LoginScreen(), AppShell(), Header(), LIBRARIAN_NAV, MEMBER_NAV, NavItem (+48 more)

### Community 1 - "Book Detail Views"
Cohesion: 0.09
Nodes (39): BookAttachment, BookDetail, BookItem, ReservationRow, WishlistRow, ActiveLoan, BookSearchResult, KioskAction (+31 more)

### Community 2 - "UI Sheet Components"
Cohesion: 0.05
Nodes (41): Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle() (+33 more)

### Community 3 - "Forms & WebSockets"
Cohesion: 0.09
Nodes (31): Message, User, Spinner(), BookDetail, Category, EMPTY_FORM, FormState, Location (+23 more)

### Community 4 - "UI Accordion & Dialog"
Cohesion: 0.07
Nodes (33): AccordionContent(), AccordionItem(), AccordionTrigger(), AlertDialogOverlay(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList() (+25 more)

### Community 5 - "Gamification & Cards"
Cohesion: 0.08
Nodes (34): BadgeData, GamificationResult, GamificationSection(), ICON_MAP, LeaderboardEntry, LeaderboardResult, CATEGORY_COLORS, CATEGORY_LABELS (+26 more)

### Community 6 - "Announcements & Proposals"
Cohesion: 0.09
Nodes (29): Announcement, AnnouncementAuthor, EMPTY_FORM, FormState, EMPTY_FORM, FilterKey, FILTERS, Proposal (+21 more)

### Community 7 - "Error Handling & Cards"
Cohesion: 0.11
Nodes (24): BookCard(), BookWithDetails, ErrorBoundaryProps, ErrorBoundaryState, LoadingGrid(), EmptyState(), EmptyStateProps, PageHeader() (+16 more)

### Community 8 - "Build Configuration"
Cohesion: 0.06
Nodes (33): bun-types, eslint, eslint-config-next, devDependencies, bun-types, eslint, eslint-config-next, tailwindcss (+25 more)

### Community 9 - "Member Management API"
Cohesion: 0.11
Nodes (33): Add Member Dialog, API Client, API /api/members, API /api/notifications, API /api/stats, API /api/wishlist, BookCard, BookCover (+25 more)

### Community 10 - "Core API Routes"
Cohesion: 0.12
Nodes (20): GET(), DELETE(), GET(), POST(), GET(), POST(), DELETE(), GET() (+12 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+20 more)

### Community 12 - "Announcement Views"
Cohesion: 0.11
Nodes (27): Announcement, Announcement Pin Toggle, AnnouncementsView, /api/announcements, /api/categories, /api/locations, /api/reservations, /api/settings (+19 more)

### Community 13 - "Toast Notifications"
Cohesion: 0.12
Nodes (24): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+16 more)

### Community 14 - "Input Components"
Cohesion: 0.09
Nodes (14): AutocompleteInput(), AutocompleteInputProps, QrCode(), QrCodeProps, Checkbox(), HoverCardContent(), Progress(), Slider() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (18): adjustColor(), BookCover(), BookCoverProps, StatCard(), StatCardProps, CategoryStat, CHART_COLORS, initials() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (18): DELETE(), GET(), POST(), MIME_MAP, ATTACHMENT_ALLOWED_MIME, ATTACHMENT_ALLOWED_MIME_LIST, ATTACHMENT_MAX_SIZE_BYTES, ATTACHMENTS_DIR (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (18): PUT(), PUT(), DELETE(), GET(), refreshLoanStatus(), GET(), POST(), PUT() (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (14): PUT(), GET(), POST(), GET(), POST(), PUT(), GET(), GET() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (17): ClassSummary, LiteracyResult, LiteracyStudent, Settings, EMPTY_FORM, MemberListItem, MemberListUser, StatsResponse (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (14): DELETE(), GET(), POST(), PUT(), DELETE(), POST(), PUT(), DELETE() (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (17): API /api/announcements, API /api/books, API /api/loans, Book Entity, dueCountdown, formatRupiah, greetingByTime, Loan Entity (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (17): date-fns, html5-qrcode, dependencies, date-fns, html5-qrcode, @radix-ui/react-menubar, @radix-ui/react-popover, @radix-ui/react-progress (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (13): POST(), POST(), GET(), clearSessionCookie(), createSessionToken(), getCurrentUser(), getSession(), requireRole() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (11): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (16): Active Members List, /api/stats, CategoryTooltip, CHART_COLORS, DashboardView, HighlightChip, recharts, Pie Chart (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (13): ActiveLoansList, /api/books, /api/loans, /api/members, Book Borrow Form, Book Return Form, BookSearchInput, BookCover (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (10): buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent(), PaginationEllipsis(), PaginationLink(), PaginationLinkProps (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (9): Constants Module, Digital Member Card, formatDate, LOAN_RULES, LOAN_STATUS_COLORS, MemberCardPrint, MyCardView, QrCode (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.28
Nodes (8): createSystemMessage(), createUserMessage(), generateMessageId(), httpServer, io, Message, User, users

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (6): GET(), GET(), Badge, computeBadges(), GamificationResult, getMonthlyLeaderboard()

### Community 39 - "Community 39"
Cohesion: 0.31
Nodes (6): AddFormState, api, CurrentUser, Role, AppStore, ViewState

### Community 40 - "Community 40"
Cohesion: 0.32
Nodes (6): DELETE(), GET(), PUT(), GET(), POST(), hashPassword()

### Community 41 - "Community 41"
Cohesion: 0.48
Nodes (7): /api/proposals, BookProposal, LIBRARIAN Role, Member Role, Proposal Approval Flow, Proposal Rejection Flow, ProposalsView

### Community 43 - "Community 43"
Cohesion: 0.57
Nodes (5): log_step_end(), log_step_start(), dev.sh script, start_mini_services(), wait_for_service()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (3): main(), mini-services-start.sh script, start.sh script

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (6): All Crawlers (*), Bingbot, Allow All Paths, Facebook External Hit, Googlebot, Twitterbot

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (3): geistSans, metadata, Toaster()

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 49 - "Community 49"
Cohesion: 0.80
Nodes (4): has_python_sources(), install_pyproject(), install_requirements(), python-runtime-build.sh script

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (3): __dirname, eslintConfig, __filename

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): DB_PUSH_CALLS, PATH, database-runtime-build.sh script

## Knowledge Gaps
- **356 isolated node(s):** `build.sh script`, `NEXT_TELEMETRY_DISABLED`, `database-runtime-build.sh script`, `$schema`, `style` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Accordion & Dialog` to `Authentication & Navigation`, `Book Detail Views`, `UI Sheet Components`, `Forms & WebSockets`, `Gamification & Cards`, `Announcements & Proposals`, `Error Handling & Cards`, `Toast Notifications`, `Input Components`, `Community 15`, `Community 19`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 47`, `Community 48`, `Community 52`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 23` to `Build Configuration`, `Community 27`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `Community 91`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 115`, `Community 116`, `Community 117`, `Community 118`, `Community 119`, `Community 120`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 18` to `Community 38`, `Community 40`, `Core API Routes`, `Community 16`, `Community 17`, `Community 20`, `Community 24`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `build.sh script`, `NEXT_TELEMETRY_DISABLED`, `database-runtime-build.sh script` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07704918032786885 - nodes in this community are weakly interconnected._
- **Should `Book Detail Views` be split into smaller, more focused modules?**
  _Cohesion score 0.08941176470588236 - nodes in this community are weakly interconnected._
- **Should `UI Sheet Components` be split into smaller, more focused modules?**
  _Cohesion score 0.054693877551020405 - nodes in this community are weakly interconnected._
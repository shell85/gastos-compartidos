# Implementation notes

The application follows the supplied master specification as the source of business rules.

Technical defaults that need an explicit choice are documented here rather than hidden in code:

- Recurring generation uses `Europe/Madrid` to determine the business date passed to the database function.
- The database generator only creates occurrences up to that business date; it never creates future occurrences.
- The application exposes a small recurrence-management screen so users can deactivate a recurrence without changing historical generated expenses.
- There is no Supabase Auth. A local selected-user id is treated as activity context only.

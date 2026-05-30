
OLAP - Online Analytical Processing :
 - Purpose: Analyse large volumes Stored Historical Data.
 - its optimized for Read-heavy operations across tables
 - mostly used for analytics and BI tools
 - example: clickhouse.
 - usually transactions happen in the OLTP db and then occasionally dumped into the OLAP db.(its evolving)
 - Modern pipelines use something called CDC (change Data capture) to stream changes in near real-time from OLTP → OLAP.(read about Write-Ahead Log for depth. - **PostgreSQL's WAL is the mechanism that powers CDC**.)

OLTP - Online Transaction Processing :
- Handle High volume short, fast and day-to-day transactions
- optimized for reads and writes per row
- queries are fast and simple.
- postgres is a good example
- ACID gaurantee.


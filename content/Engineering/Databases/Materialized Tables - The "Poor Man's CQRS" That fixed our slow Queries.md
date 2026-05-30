
A while back, one of our seemingly simple APIs started causing big Headaches. It was just supposed to fetch a paginated list of leads, along with contact details, organization info, and some other metadata. On paper it sounded easy. In reality it was dragging the whole system down.

### The Pain Point

Every request was running a query with 4-5 nested joins per row. At low traffic it seemed okayish. but as soon as load increased things got real bad:
- p95 latency jumped between 800ms t0 1.5s
- Database connection pool kept getting exhausted
- Other unrelated parts of the app started slowing down too

It wasn't just a slow endpoint anymore. it started becoming system-wide bottleneck.
Here's what the query roughly looked like:
```
SELECT l.*, c.*, o.*, ls.*
FROM leads l
LEFT JOIN contacts c ON c.id = l.contact_id
LEFT JOIN organizations o ON o.id = l.org_id
LEFT JOIN lead_sources ls ON ls.id = l.source_id
WHERE ...
ORDER BY l.created_at DESC
LIMIT 20 OFFSET 0;
```

Pagination did not help much as Every request still paid the full price of these Joins, especially complex Filters.

### The Fixes That Didn't Work
 
we tried a bunch of usual stuff first:
- Scaling the database -> helped a bit but was expensive and didn't really solve the root issue.
- Bigger connection pool -> just meant more heavy queries running at the same time, making contention worse.
- Redis caching -> nightmare to invalidate because the data was coming from multiple tables. plus, all the different filter + pagination combination caused cache explosion.
After a while it became clear: the problem wasn't our infra. but how we were fetching the data.

### The Idea That Saved Us

Instead of doing all the heavy lifting every time someone loaded the list. we decided to pre-compute the data.

We created a new **materialized table** -basically a flat, denormalized version of the leads data with all joins already resolved. it was built specifically for fast reads.

### How We Built It

**Write Path**: Whenever something changed(lead created/updated, contact updated, org updated, etc.), we emitted an event to RabbitMQ. A background worker picked it up, fetched the latest data, flattened it, and updated the materialized table. 

**Read Path**: The API now just queries the materialized tables directly - no joins.

The worker logic was pretty simple:

```
async function handleEvent(event) {
  const leadIds = findAffectedLeads(event);
  
  for (const leadId of leadIds) {
    const data = await fetchFullLeadData(leadId);
    await upsertIntoMaterializedTable(data);
  }
}
```

### An Interesting Race Condition We Hit 

Even after we got the pipeline working smoothly, we faced a tricky problem.
The denormalization was happening too fast. Sometimes the worker would pick up the event and the update the materialized table **before** the original transaction on the main table was fully committed. This caused weird inconsistencies - the materialized table would would be "one query behind" or stale. 
It was subtle but annoying.

#### How we fixed it
We changed the event emission timing. Instead of firing the event as soon as the change started, we only emitted it **after the transaction was successfully committed** in the main database.

This small change eliminated the race condition and made the system much more reliable.

### The Messy Parts

This approach wasn't "set it and forget it". We ran into several real challanges.

- Fanout: One organization update could affect dozens of leads. We had to find all affected leads and update them efficiently.
- Idempotency: Workers could retry, so we used UPSERT statements everywhere.
- Out-of-order events: A contact update might arrive before the lead was even created. we had to handle missing data graceflly and retry when needed.
- Failures: Retires, dead-letter queues.
- Backfilling: We had to run a one-time job to populate the table with all existing data.

### The Tradeoffs

This solution isn't perfect(as is nothing in systems). We accepted **eventual consistency** - the materialized tables might be a few second behind sometimes. also more moving parts were added(queue + workers).

But for our usecase it was worth it. We traded strict consistency for speed and stability.

We also considered other options:

- Database materialized views (too rigid for our needs)
- Heavy Redis caching (invalidation hell)
- Full CQRS (overkill for our scale)

### The Results

The improvements were dramatic.
- p95 latency went from ~1.2 seconds down to ~150ms.
- Database load dropped significantly
- Connection Pool stabilized
- The whole system felt fast and predictable again.



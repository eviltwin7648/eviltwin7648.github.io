
- Jobs which were stuck in a Stage(Running/Dispatched) are stuck in that state if there is some issue during the time of reporting the job-status
- there is one hole in the system (if the request fails i lose logs, need to work something) - Logbatcher
- agent quits on terminal close, no auto-startup for agent. 
- cancelling the jobs






- the soln: introduce job lease and job heartbeat.
  the agnet periodically sends heartbeat for the job and the lease for the job gets 30 seconds of lease for that agent. agent must send heartbeat and renew lease otherwise mark job as failed. failed jobexecutions can be retried again.
- 







### 1. DevFleet (keep improving)

- add failure scenarios
- retry strategies
- worker crashes, etc.

---

### 2. LLM Gateway (GO DEEP)

Make this insane:

- smart routing
- semantic + deterministic caching
- budget enforcement
- retry orchestration


---

### 3. Stream System (NON-NEGOTIABLE)

This gives you:

- partitions
- offsets
- ordering guarantees
- consumer groups

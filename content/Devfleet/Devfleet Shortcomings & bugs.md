## problems 
1. Jobs which were stuck in a Stage(Running/Dispatched) are stuck in that state if there is some issue during the time of reporting the job-status
2. if the request fails when sending the log-batches i lose logs.
3. cancelling the jobs
4. agent quits on terminal close, no auto-startup for agent. 
5. There should be an unique identifier for the agent. When an API key expires the agent needs a way to say that i'm still the old agent just update my api-key.





## soln
1. introduce job lease and job heartbeat.
   the agent periodically sends heartbeat for the job and the lease for the job gets 10 seconds of lease for that agent. agent must send job-heartbeat and renew lease otherwise mark job as failed. failed jobexecutions can be retried again.
2. introduce a buffer for the failed batches on the agent.
   a threshold of 50MB of we dont overflow the memory. (a bounded in-mem queue with spillover in disk). but the disk can also fail so in that case i have accepted that we lose logs.
3. The cancellation mechanism is now coupled with the job-lease.
   before renewing the job-lease the server checks if the job has been cancelled.
   tradeoff: the job cancellation will be 10s slow on worst case. but we will not need to maintain a separate conn for handling cancellation.
4. working on it - probably systemd service should be enough(at least for linux machines)
5. save the agentId(primary key) in the config of the agent. when attempting the re-linking use that agent_id. every agent is aware which agent-id that is.


also learnt about waitgroups in go:

- waitgroups are uses for coordination
- it makes sure then when some go routines are running the program doesn't exists.
- basically telling the main thread to wait for the all the workers to exit.
- eg:
```
wg.Add(2)
go func(){
	defer wg.done()
	doSomething()
}
go func(){
	defer wg.Done()
	doSomething()
}

wg.wait()
```

Now what happens is 
	Main thread:
	 adds a counter to wg = 2
	 launch workers(goroutines)
	 wait at gate
	 
	worker1 : done
	wg.Done() does wg - 1        wg = 1

	worker2 : done
	wg.Done() does wg - 1        wg = 0

	gate opens   (only when wg = 0)

	Main thread continues

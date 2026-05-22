a simple way to combine multiple ranked results.
beacuse the vector search returns cosine score which is between 0.0 - 1.0
and lexical search returns arbitrary score(which means the order is guaranteed to be correct(as best as the algo), the score itself has no meaning outside of helping in ordering)


so how do we combine them??
we use RRF, 
the idea is to use only rank positions and not the actual scores.

the formula:


![[Pasted image 20260522233854.png]]

RRF implementation in Nexus:
```
func mergeResults(lex, vec []store.ChunkResult) ([]MergedResult, error) {

const k = 60.0 //smoothing constant
rrfScores := make(map[string]float64)
chunkMap := make(map[string]store.ChunkResult)

for rank, item := range lex {
rrfScores[item.Id] += 1.0 / (float64(rank+1) + k)
chunkMap[item.Id] = item
} 

for rank, item := range vec {
rrfScores[item.Id] += 1.0 / (float64(rank+1) + k)
chunkMap[item.Id] = item
}

var results []MergedResult

for id, score := range rrfScores {
results = append(results, MergedResult{
ChunkResult: chunkMap[id],
RRFScore: score,
})
}

sort.Slice(results, func(i, j int) bool {
return results[i].RRFScore > results[j].RRFScore
})

if len(results) > 10 {
results = results[:10]
}
return results, nil
}
```

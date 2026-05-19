

### Retrieval:

Vector Search:
	Semantic Similarity Search.
	Convert the texts into numeric vectors(embeddings)
	use cosine similarity func to find the higher similar chunks .
	higher similarity -> more relevant

why it works eg: 
	query: "How are users authenticated?"
	chunk: JWT verification middleware validates bearer tokens
	not sharing exact words but semantic meaning overlaps.

where it fails: 
	exact identifiers misses.
	-a func name in a codebase (`LeadScoringWorker`) would be a nonsense token soup.
	but in Nexus we need the exact keyword match.(as it data is mostly code.)


Enter Lexical Search:
	lexical search is just traditional keyword search.
	it will search the exact tokens (`LeadScoringWorker`) 
why its necessary here in Nexus?
	codebases are full of exact identifiers:
	 -AuthService
	 -tenant_id
	 -calculateLeadProbability etc
	Here embeddings are weak. and Lexxical search shines.
where it falls short:
	no semantics
	query: "how do we authenticate users?"
	doc: jwt middleware validates access tokens
	no exact overlap so it misses.
How it works:
	in pg, you can naively search like this:
```
SELECT *
FROM documents
WHERE content ILIKE '%system%';
```
problems: 
- it will do full table scan
- dumb substring match for eg these all show up when u do : 
	```
	ILIKE '%run%'
	```
	matches would be :
		running
		runner
		runtime
		brunch   (not intended for search, but will stills how up)
- there is no ranking of sorts.
- no stemming.
	what's stemming? its a text-processing technique used to reduce a word to its base form by removing prefixes and suffixes (eg. texting -> text, fucking -> fuck etc)

so we use tsvector:
	in the table in-addition to storing the raw texts(content):
	"Distributed systems are hard",
	 postgres will preprocess it:
	 to_ts_vector('english', content).
	it becomes :
	'distribut' 'system' 'hard'
	this is now optimized search data.we store it in a column.
	create a col like :
```
ALTER TABLE documents
ADD COLUMN search_vector tsvector;
```
also add index to it like:
```
CREATE INDEX idx_search
ON documents
USING GIN(search_vector);
```

now wtf is gin index??
to understand GIN index, lets first understand how normal indexes usually work.

suppose we have to do a table look-up without any index.

SELECT * FROM users WHERE email = 'a@b.com';

postgres does 
row1 - check email
row2 - check email
row3 - check email 
...


its a full table scan until the searched email is found.

now using B-tree index (b-tree is most common used index in relational dbs):
we create index first: 
CREATE INDEX idx_email ON users(email);

postgres builds a table internally that does someting like this:
a@b.com -> row 42
c@d.com -> row 91
x@y.com -> row 12

basically it stores the data in a B-tree
a very simple eg:
![[Pasted image 20260517230634.png]]

why b-tree fails for text-search?
suppose the query is:
WHERE content ILIKE '%rabbitmq%'

b-tree can only help only when the look-up is ordered or prefix-like
for eg:
email = ?
age > 25
name LIKE 'vis%'

but `'%rabbitmq%'` is kinda starting with wildcard. there's no ordering advantage.
Enter GIN:

GIN is Generalized Inverted Index.

normal b-tree index store the data in a B-tree data structure.
but GIN stores data in a 

whats 'simple' vs  'english' in tsvector?
basically the config for tsvector. it will help the pg decide how the tokenization should happen.
in 'simple' it will not do stemming or remove non-critical words like to, the etc.
in 'english' it will remove the non-critical words and do stemming based on english.

the to_tsvector will go into the DB itself;
```
ALTER TABLE raw_documents add column search_vector tsvector GENERATED ALWAYS AS (
to_tsvector('simple', content)
) STORED;
```
whats CTEs and RRF?


But it simply does not mean that we can depend on either one completely.
we need Hybrid Retrival in our system.
	query
	 -> vector retrieval
	 -> lexical retrieval
	 -> merge candidates
eg: 
	Query: How does LeadScoringWorker retry failed jobs?
	Vector finds: background job processing docsretry mechanism docs
	Lexical finds: LeadScoringWorker.ts

now  merged results will be much better.


Hybrid Reranking layer (e.g., Cohere Rerank or Cross-Encoder)
	Initial Retrival gets all candidate chunks but ranking of them can be noisy.
	for eg in top 20 chunks some are relevant, some are kinda relevant and some junk chunks.
	so we cannot depend on top 20 properly. we need reranking.

Bi-encoder:
	the chunk and the query gets embedded seperately.

Enter Cross-Encoder Reranker.
	This gives precsion. as when the initial retrival happens you may get chunks that are similar in embeddings but completely ir-relevant to the query asked.
	Embedding similarity is approximate. Bi-encoder will compare the query and chunk embedding separately.
	so if the retriveal returns 100 chunks(based on the similarity threshold) we take the first N chunks retrived and then pass the chunk + query together into a transformer.
	Detail:
		in cross-encoder, the query and the document (together) become one input to the transformer.
		eg: 
			query: "How to prevent duplicate job execution?"
			document: ""Use fencing tokens with leases to prevent stale workers."
			combined input:
			[CLS]
			How to prevent duplicate job execution?
			[SEP]
			Use fencing tokens with leases to prevent stale workers.
			[SEP]
			
		what's transformer? and CLS and SEP?:
			 CLS - classification token
				CLS is a fake token inserted at the begining.
				WHY do we need a fake token?
				  the transformer outputs a vector for every token.gent
			 SEP - seperator token
				 it marks boundries like sentence A | sentence B - saying that  these are two sperate pieces of text.
				 so in model lang : query [SEP] document
			 


Query Rewriting



### Incremantal sync 

file-hashing for local filesystem indexing,
deep changes detection (only re-embedding changed chunks not whole files.)

### Intellegent parsing

text/token-based parsing
AST aware parsing - e.g., Tree-sitter


LLM might struggle with cross-file imports with just text/token based parsing.

the current chunking strategy is based on the text/teoken based. but that does not work effectely for codebases. we lose import context, we lose the Imports and references context. so we need intellegient parsing starategy. we need to move with AST aware parsing and chunking instead of Text/token based.


Postgres Row-level security



- for Deep Change Detection the chunking process itself should be deterministic

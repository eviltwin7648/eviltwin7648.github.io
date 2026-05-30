for nexus - indexing only based on the token size is pretty inefficient if we are talking about indexing codebases. because if we only chunk based on a fixed lenght token we lose important context such as which function a specific line belong to? or which class does a method belong to, the imports and exports etc.

so we need AST aware chunking. the code gets parsed, and creates an AST. now instead of chunking 'every 500 tokens' we  can chunk based on Nodes such as chunk method, chunk class, chunk interface etc.
but there still exists a problem.
the function or the class can be huge sometimes so they will just become enormous chunk if we embed the whole thing.
this is where 'Recursive AST chunking' comes in.
we'll just add a token budget for each chunk.
if the node > token budget we'll just split deeper

but we should not also be merging very small chunks. so we can use a minimum token threshold and maximum threshold.

for eg:
Class too large -> split into Methods
Methods too large -> split into logical blocks
or
```
if node.tokens < 80 {
   merge with next sibling
}
```


the hierarchy for Obejcted oriented languages/ functional code and frontend code will be slightly different. so we need to be aware of it.

we need to store some metadata with it and stitch some context because if we just embed a Method without knowing which class it actually belongs to, we lose out on important context. eg metadata could be:

```
{
  "repo": "crm-backend",
  "file": "services/payment.ts",
  "language": "typescript",
  "symbol": "PaymentService.createSubscription",
  "symbol_type": "method",
  "parent": "PaymentService",
  "imports": ["StripeClient", "PaymentRepo"],
  "exports": true
}
```
we also can pass the chunk through llm and generate its purpose and embedd something like this:
```
Function: PaymentService.createSubscription
Parameters:
- userId string
- planId string

Purpose:
Creates recurring subscription via Stripe.

Code:
...
```
but the sake of Nexus we'll keep it as out of scope as it can blow up cost.

for parsing different languages there are different tools available.
For Nexus we'll scope it down to only few popular languages, we'll be using tree-sitter for AST parsing.


So now our Chunking Strategy looks something This:
step1: File Classification
step2: Source Code Chunking - with known caveats 


## TODO

The documentation generation component needs a suite of tests, but should probably be a standalone project anyway so I'm not doing that yet.

To run things in this WIP state, use:

```
watchexec -c -w src -w scripts "./node_modules/.bin/tsx scripts/parse.ts test/fixtures/01-wip/index.ts"
```

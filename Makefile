BUN := bun

.PHONY: dev start test migrate clean

dev:
	$(BUN) run --hot src/index.ts

start:
	$(BUN) run src/index.ts

test:
	$(BUN) test

migrate:
	$(BUN) run src/db/migrate.ts

clean:
	rm -rf dist data/*.db data/*.jsonl

install:
	$(BUN) install

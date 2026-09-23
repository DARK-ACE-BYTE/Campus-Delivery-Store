---
name: Generated client DOM iterable
description: The shared generated React client needs DOM iterable types enabled for Headers.entries during library typechecks.
---

The generated API client uses iterable DOM APIs such as `Headers.entries()`, so the `@workspace/api-client-react` TypeScript library configuration must include both `dom` and `dom.iterable`.

**Why:** The OpenAPI code generator emits browser fetch helpers that compile against iterable Headers, and the workspace base config only includes ES libraries.

**How to apply:** If generated client typechecks start failing on `Headers.entries`, check the client package `lib` list before changing generated output.
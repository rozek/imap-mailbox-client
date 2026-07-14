# Test Plan - imap-mailbox-client

## Goal

Verify `MailboxClient`'s HTTP request building (URLs, headers, method, body), its response/error handling and its request-timeout behaviour - without any real network call and without a running `imap-mailbox-proxy` instance.

## Tooling

- [Vitest](https://vitest.dev) as test runner and assertion library (`npm test` / `npm run test:run`)
- `src/mailbox-client.ts` is a genuine ES module (see `README.md`), so the test file simply `import`s `MailboxClient` directly - no build step or extra loading mechanism is required to test it
- the global `fetch` is replaced with a `vi.fn()` mock via `vi.stubGlobal('fetch', ...)` (and restored with `vi.unstubAllGlobals()` afterwards) - no network I/O happens during any test run

## Scope

| Behaviour | Covered by |
|---|---|
| `BaseURL` trailing-slash normalisation | `strips a trailing slash from BaseURL` |
| `X-API-Key` header on every request | `sends the API key header on every request` |
| Default folder (`"INBOX"`) vs. per-call vs. constructor-level override | the three `fetchUnreadCount` tests |
| Query-string construction (`fetchRecentMessages`, `fetchMessage`) | respective tests |
`fetchRecentMessages`/`fetchMessage` return the parsed `MailboxMessage`/`MailboxMessageDetail` shapes as sent by `imap-mailbox-proxy` (no client-side field mapping is needed - the server's JSON already uses this project's casing) | respective tests assert the parsed result, not just the request |
| `POST` requests: method, path, JSON body, `Content-Type` header (`markAsRead`, `moveMessage`) | respective tests |
| Non-OK HTTP responses surface a descriptive error | `throws a descriptive error when the response is not ok` |
| Requests are aborted after `Timeout` | `aborts the request after Timeout elapses` |

## Out of scope

- **No real `imap-mailbox-proxy` instance.** This suite tests the client in isolation; the proxy has its own test suite (see the companion repository's `TestPlan.md`) and the two are not run against each other. If you change the wire format on one side, update both.
- **No test of the built `dist/mailbox-client.js` output itself** (e.g. loading it via a real dynamic `import()` of the compiled file, or in an actual browser). The suite tests the TypeScript source directly; `tsc` is trusted to compile it faithfully, consistent with how the companion proxy project is tested.

## Running the tests

```bash
npm test        # watch mode
npm run test:run  # single run
```

## Current coverage

11 tests, all passing.

# imap-mailbox-client

A tiny, dependency-free TypeScript client for [imap-mailbox-proxy](https://github.com/rozek/imap-mailbox-proxy), published as a genuine ES module. Use it via a normal `import` in any bundler/Node project, or load it straight from its built URL via a dynamic `import(...)` expression - which works from any script, not just from another module, so it's a perfect fit for environments like a [WebApp Tinkerer](https://github.com/rozek/webapp-tinkerer) widget's inline script.

## Usage

### From npm / a bundler

```bash
npm install imap-mailbox-client
```

```ts
import { MailboxClient } from 'imap-mailbox-client'
```

### Via dynamic import (e.g. from a WAT widget)

No install step needed - just point a dynamic `import()` at the built file (your proxy's own host, GitHub raw, or a CDN like jsDelivr):

```js
const { MailboxClient } = await import('https://rozek.github.io/imap-mailbox-client/dist/mailbox-client.js')
```

### Either way

```js
const Mailbox = new MailboxClient({
  BaseURL: 'https://your-proxy-host.example',
  APIKey: 'the-same-value-as-PROXY_API_KEY',
  Folder: 'INBOX',   // optional, defaults to "INBOX"
})

const unreadCount = await Mailbox.fetchUnreadCount()
const Messages    = await Mailbox.fetchRecentMessages(20)
const Message     = await Mailbox.fetchMessage(Messages[0].UID)

await Mailbox.markAsRead(Message.UID)
await Mailbox.moveMessage(Message.UID, 'Archive')
```

## API

| Method | Description |
|---|---|
| `fetchFolders()` | lists all folders |
| `fetchUnreadCount(Folder?)` | number of unread messages |
| `fetchRecentMessages(Limit?, Folder?)` | recent messages (`MailboxMessage[]`: `UID`, `Subject`, `from`, `Date`, `isUnseen`) |
| `fetchMessage(UID, Folder?)` | one message in full (`MailboxMessageDetail`: adds `to`, `Text`, `HTML`, `Attachments`) |
| `markAsRead(UID, Folder?)` | marks a message as read |
| `moveMessage(UID, TargetFolder, Folder?)` | moves a message to another folder |

Every `Folder` parameter defaults to the `Folder` given in the constructor options (itself defaulting to `"INBOX"`).

## Building

```bash
npm install
npm run build   # produces dist/mailbox-client.js (+ .d.ts)
```

`dist/` is committed to the repository so it can be loaded directly via dynamic import without a build step on the consumer's side.

## Testing

```bash
npm test        # watch mode
npm run test:run  # single run
```

The test suite imports `src/mailbox-client.ts` directly and stubs the global `fetch` - no build step or real proxy instance is needed to run it. See `TestPlan.md` for details.

## Companion Project

[imap-mailbox-proxy](https://github.com/rozek/imap-mailbox-proxy) is the server this client talks to.

## License

[MIT License](LICENSE.md)

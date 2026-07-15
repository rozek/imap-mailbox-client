import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MailboxClient } from '../src/mailbox-client.js'

function JSONResponse (Body:unknown,Status = 200) {
  return {
    ok:Status < 400,
    status:Status,
    json:async () => Body,
  }
}

let FetchMock:ReturnType<typeof vi.fn>

beforeEach(() => {
  FetchMock = vi.fn().mockResolvedValue(JSONResponse({}))
  vi.stubGlobal('fetch',FetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MailboxClient',() => {
  it('strips a trailing slash from BaseURL',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ folders:[] }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example/', APIKey:'key' })
    await Mailbox.fetchFolders()

    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/folders',expect.anything())
  })

  it('sends the API key header on every request',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ folders:[] }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'secret-key' })
    await Mailbox.fetchFolders()

    const [ ,Options ] = FetchMock.mock.calls[0]
    expect(Options.headers['X-API-Key']).toBe('secret-key')
  })

  it('fetchFolders returns each folder with its special-use hint',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      folders:[
        { Path:'INBOX' },
        { Path:'Gelöscht', specialUse:'\\Trash' },
      ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await expect(Mailbox.fetchFolders()).resolves.toEqual([
      { Path:'INBOX' },
      { Path:'Gelöscht', specialUse:'\\Trash' },
    ])
  })

  it('fetchFolderCounts returns the total and unread count',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ Total:20, Unread:4 }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await expect(Mailbox.fetchFolderCounts()).resolves.toEqual({ Total:20, Unread:4 })
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/folder-counts?folder=INBOX',expect.anything())
  })

  it('fetchFolderCounts honours an explicit folder argument',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ Total:0, Unread:0 }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.fetchFolderCounts('Archive')
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/folder-counts?folder=Archive',expect.anything())
  })

  it('fetchAllFolderCounts reports on every folder when none are given',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      counts:[ { Path:'INBOX', Total:20, Unread:4 } ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await expect(Mailbox.fetchAllFolderCounts()).resolves.toEqual([
      { Path:'INBOX', Total:20, Unread:4 },
    ])
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/all-folder-counts',expect.anything())
  })

  it('fetchAllFolderCounts honours an explicit folder list',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ counts:[] }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.fetchAllFolderCounts([ 'INBOX','Archive' ])
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/all-folder-counts?folders=INBOX,Archive',expect.anything())
  })

  it('fetchUnreadCount defaults to the "INBOX" folder',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ count:3 }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await expect(Mailbox.fetchUnreadCount()).resolves.toBe(3)
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/unread-count?folder=INBOX',expect.anything())
  })

  it('fetchUnreadCount honours an explicit folder argument',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ count:0 }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.fetchUnreadCount('Archive')
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/unread-count?folder=Archive',expect.anything())
  })

  it('fetchUnreadCount honours the folder given in the constructor',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ count:0 }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key', Folder:'Work' })

    await Mailbox.fetchUnreadCount()
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/unread-count?folder=Work',expect.anything())
  })

  it('fetchRecentMessages builds the correct query string and returns the parsed messages',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      messages:[
        { UID:1, Subject:'Hi', from:'a@example.com', Date:'2026-01-01T00:00:00.000Z', isUnseen:true },
      ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    const Messages = await Mailbox.fetchRecentMessages(5,'Archive')

    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages?folder=Archive&limit=5',expect.anything())
    expect(Messages).toEqual([
      { UID:1, Subject:'Hi', from:'a@example.com', Date:'2026-01-01T00:00:00.000Z', isUnseen:true },
    ])
  })

  it('fetchRecentMessages forwards beforeUID and flaggedOnly',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ messages:[] }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.fetchRecentMessages(5,'Archive',42,true)
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages?folder=Archive&limit=5&beforeUID=42&flaggedOnly=true',expect.anything())
  })

  it('fetchMessagesSince builds the correct query string and returns the parsed messages',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      messages:[
        { UID:10, Subject:'New', from:'a@example.com', Date:'2026-01-10T00:00:00.000Z', isUnseen:true, isFlagged:false },
      ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    const Messages = await Mailbox.fetchMessagesSince(9,5,'Archive',true)

    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages/since?folder=Archive&sinceUID=9&limit=5&flaggedOnly=true',expect.anything())
    expect(Messages).toEqual([
      { UID:10, Subject:'New', from:'a@example.com', Date:'2026-01-10T00:00:00.000Z', isUnseen:true, isFlagged:false },
    ])
  })

  it('fetchMessagesSince defaults to the "INBOX" folder and no flag filter',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ messages:[] }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.fetchMessagesSince(9)
    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages/since?folder=INBOX&sinceUID=9&limit=20',expect.anything())
  })

  it('fetchMessage builds the correct path and returns the parsed message',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      UID:42,
      Subject:'Hi',
      from:'a@example.com',
      to:'b@example.com',
      Date:'2026-01-01T00:00:00.000Z',
      Text:'body',
      HTML:'<p>body</p>',
      Attachments:[ { Filename:'file.pdf', ContentType:'application/pdf', Size:1234 } ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    const Message = await Mailbox.fetchMessage(42)

    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages/42?folder=INBOX',expect.anything())
    expect(Message).toEqual({
      UID:42,
      Subject:'Hi',
      from:'a@example.com',
      to:'b@example.com',
      Date:'2026-01-01T00:00:00.000Z',
      Text:'body',
      HTML:'<p>body</p>',
      Attachments:[ { Filename:'file.pdf', ContentType:'application/pdf', Size:1234 } ],
    })
  })

  it('markAsRead posts to the seen endpoint',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ ok:true }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.markAsRead(42)

    const [ URL,Options ] = FetchMock.mock.calls[0]
    expect(URL).toBe('https://proxy.example/messages/42/seen?folder=INBOX')
    expect(Options.method).toBe('POST')
  })

  it('setFlagged posts the flagged state to the flagged endpoint',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ ok:true }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.setFlagged(42,true)

    const [ URL,Options ] = FetchMock.mock.calls[0]
    expect(URL).toBe('https://proxy.example/messages/42/flagged?folder=INBOX')
    expect(Options.method).toBe('POST')
    expect(JSON.parse(Options.body)).toEqual({ flagged:true })
  })

  it('moveMessage posts the target folder in the body',async () => {
    FetchMock.mockResolvedValue(JSONResponse({ ok:true }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await Mailbox.moveMessage(42,'Archive')

    const [ URL,Options ] = FetchMock.mock.calls[0]
    expect(URL).toBe('https://proxy.example/messages/42/move?folder=INBOX')
    expect(Options.method).toBe('POST')
    expect(Options.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(Options.body)).toEqual({ to:'Archive' })
  })

  it('throws a descriptive error when the response is not ok',async () => {
    FetchMock.mockResolvedValue(JSONResponse({},503))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    await expect(Mailbox.fetchUnreadCount()).rejects.toThrow('mailbox proxy responded with 503')
  })

  it('aborts the request after Timeout elapses',async () => {
    let capturedSignal:AbortSignal | undefined

    FetchMock.mockImplementation((_URL:string,Options:RequestInit) => {
      capturedSignal = Options.signal as AbortSignal
      return new Promise(() => {})  // never resolves - only the abort matters
    })

    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key', Timeout:10 })
    void Mailbox.fetchUnreadCount()

    await new Promise((Resolve) => setTimeout(Resolve,50))
    expect(capturedSignal?.aborted).toBe(true)
  })
})

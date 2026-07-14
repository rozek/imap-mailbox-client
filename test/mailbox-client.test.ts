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

  it('fetchRecentMessages builds the correct query string and maps wire fields to public casing',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      messages:[
        { uid:1, subject:'Hi', from:'a@example.com', date:'2026-01-01T00:00:00.000Z', isUnseen:true },
      ],
    }))
    const Mailbox = new MailboxClient({ BaseURL:'https://proxy.example', APIKey:'key' })

    const Messages = await Mailbox.fetchRecentMessages(5,'Archive')

    expect(FetchMock).toHaveBeenCalledWith('https://proxy.example/messages?folder=Archive&limit=5',expect.anything())
    expect(Messages).toEqual([
      { UID:1, Subject:'Hi', from:'a@example.com', Date:'2026-01-01T00:00:00.000Z', isUnseen:true },
    ])
  })

  it('fetchMessage builds the correct path and maps wire fields to public casing',async () => {
    FetchMock.mockResolvedValue(JSONResponse({
      uid:42,
      subject:'Hi',
      from:'a@example.com',
      to:'b@example.com',
      date:'2026-01-01T00:00:00.000Z',
      text:'body',
      html:'<p>body</p>',
      attachments:[ { filename:'file.pdf', contentType:'application/pdf', size:1234 } ],
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

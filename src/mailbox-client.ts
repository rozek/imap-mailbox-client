/*******************************************************************************
*                                                                              *
*                             Mailbox Proxy Client                             *
*                                                                              *
*******************************************************************************/

  export interface MailboxFolder {
    Path:string
    specialUse:string | undefined  // e.g. "\Trash", "\Sent", "\Drafts", "\Junk", "\Archive" - server-reported, not guessed
  }

  export interface MailboxMessage {
    UID:number
    Subject:string
    from:string
    Date:string
    isUnseen:boolean
  }

  export interface MailboxAttachment {
    Filename:string
    ContentType:string
    Size:number
  }

  export interface MailboxMessageDetail {
    UID:number
    Subject:string
    from:string
    to:string
    Date:string
    Text:string
    HTML:string | undefined
    Attachments:MailboxAttachment[]
  }

  export interface MailboxClientOptions {
    BaseURL:string
    APIKey:string
    Folder?:string
    Timeout?:number
  }

//----------------------------------------------------------------------------//
//                               MailboxClient                                //
//----------------------------------------------------------------------------//

// imap-mailbox-proxy's REST JSON already matches the casing of the public
// types above one-to-one, so no wire-to-public mapping step is needed here

  export class MailboxClient {
    readonly #BaseURL:string
    readonly #APIKey:string
    readonly #Folder:string
    readonly #TimeoutMS:number

    constructor (Options:MailboxClientOptions) {
      this.#BaseURL   = Options.BaseURL.replace(/\/$/,'')
      this.#APIKey    = Options.APIKey
      this.#Folder    = Options.Folder  ?? 'INBOX'
      this.#TimeoutMS = Options.Timeout ?? 8000
    }

    async fetchFolders ():Promise<MailboxFolder[]> {
      const Result = await this.#request<{ folders:MailboxFolder[] }>('GET','/folders')
      return Result.folders
    }

    async fetchUnreadCount (Folder = this.#Folder):Promise<number> {
      const Path   = `/unread-count?folder=${encodeURIComponent(Folder)}`
      const Result = await this.#request<{ count:number }>('GET',Path)
      return Result.count
    }

    async fetchRecentMessages (Limit = 20,Folder = this.#Folder):Promise<MailboxMessage[]> {
      const Path   = `/messages?folder=${encodeURIComponent(Folder)}&limit=${Limit}`
      const Result = await this.#request<{ messages:MailboxMessage[] }>('GET',Path)
      return Result.messages
    }

    async fetchMessage (UID:number,Folder = this.#Folder):Promise<MailboxMessageDetail> {
      const Path = `/messages/${UID}?folder=${encodeURIComponent(Folder)}`
      return await this.#request<MailboxMessageDetail>('GET',Path)
    }

    async markAsRead (UID:number,Folder = this.#Folder):Promise<void> {
      const Path = `/messages/${UID}/seen?folder=${encodeURIComponent(Folder)}`
      await this.#request('POST',Path)
    }

    async moveMessage (UID:number,TargetFolder:string,Folder = this.#Folder):Promise<void> {
      const Path = `/messages/${UID}/move?folder=${encodeURIComponent(Folder)}`
      await this.#request('POST',Path,{ to:TargetFolder })
    }

    async #request<Result> (Method:string,Path:string,Body?:unknown):Promise<Result> {
      const Controller    = new AbortController()
      const TimeoutHandle = setTimeout(() => Controller.abort(),this.#TimeoutMS)

      try {
        const Response = await fetch(`${this.#BaseURL}${Path}`,{
          method:Method,
          headers:{
            'X-API-Key':this.#APIKey,
            ...(Body == null ? {} : { 'Content-Type':'application/json' }),
          },
          body:Body == null ? undefined : JSON.stringify(Body),
          signal:Controller.signal,
        })

        if (! Response.ok) throwError(`mailbox proxy responded with ${Response.status}`)

        return await Response.json() as Result
      } finally {
        clearTimeout(TimeoutHandle)
      }
    }
  }

  function throwError (Message:string):never {
    throw new Error(Message)
  }

/*******************************************************************************
*                                                                              *
*                             Mailbox Proxy Client                             *
*                                                                              *
*******************************************************************************/
//----------------------------------------------------------------------------//
//                               MailboxClient                                //
//----------------------------------------------------------------------------//
// imap-mailbox-proxy's REST JSON already matches the casing of the public
// types above one-to-one, so no wire-to-public mapping step is needed here
export class MailboxClient {
    #BaseURL;
    #APIKey;
    #Folder;
    #TimeoutMS;
    constructor(Options) {
        this.#BaseURL = Options.BaseURL.replace(/\/$/, '');
        this.#APIKey = Options.APIKey;
        this.#Folder = Options.Folder ?? 'INBOX';
        this.#TimeoutMS = Options.Timeout ?? 8000;
    }
    async fetchFolders() {
        const Result = await this.#request('GET', '/folders');
        return Result.folders;
    }
    async fetchUnreadCount(Folder = this.#Folder) {
        const Path = `/unread-count?folder=${encodeURIComponent(Folder)}`;
        const Result = await this.#request('GET', Path);
        return Result.count;
    }
    async fetchRecentMessages(Limit = 20, Folder = this.#Folder) {
        const Path = `/messages?folder=${encodeURIComponent(Folder)}&limit=${Limit}`;
        const Result = await this.#request('GET', Path);
        return Result.messages;
    }
    async fetchMessage(UID, Folder = this.#Folder) {
        const Path = `/messages/${UID}?folder=${encodeURIComponent(Folder)}`;
        return await this.#request('GET', Path);
    }
    async markAsRead(UID, Folder = this.#Folder) {
        const Path = `/messages/${UID}/seen?folder=${encodeURIComponent(Folder)}`;
        await this.#request('POST', Path);
    }
    async moveMessage(UID, TargetFolder, Folder = this.#Folder) {
        const Path = `/messages/${UID}/move?folder=${encodeURIComponent(Folder)}`;
        await this.#request('POST', Path, { to: TargetFolder });
    }
    async #request(Method, Path, Body) {
        const Controller = new AbortController();
        const TimeoutHandle = setTimeout(() => Controller.abort(), this.#TimeoutMS);
        try {
            const Response = await fetch(`${this.#BaseURL}${Path}`, {
                method: Method,
                headers: {
                    'X-API-Key': this.#APIKey,
                    ...(Body == null ? {} : { 'Content-Type': 'application/json' }),
                },
                body: Body == null ? undefined : JSON.stringify(Body),
                signal: Controller.signal,
            });
            if (!Response.ok)
                throwError(`mailbox proxy responded with ${Response.status}`);
            return await Response.json();
        }
        finally {
            clearTimeout(TimeoutHandle);
        }
    }
}
function throwError(Message) {
    throw new Error(Message);
}
//# sourceMappingURL=mailbox-client.js.map
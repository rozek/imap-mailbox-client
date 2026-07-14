/*******************************************************************************
*                                                                              *
*                             Mailbox Proxy Client                             *
*                                                                              *
*******************************************************************************/
export interface MailboxMessage {
    UID: number;
    Subject: string;
    from: string;
    Date: string;
    isUnseen: boolean;
}
export interface MailboxAttachment {
    Filename: string;
    ContentType: string;
    Size: number;
}
export interface MailboxMessageDetail {
    UID: number;
    Subject: string;
    from: string;
    to: string;
    Date: string;
    Text: string;
    HTML: string | undefined;
    Attachments: MailboxAttachment[];
}
export interface MailboxClientOptions {
    BaseURL: string;
    APIKey: string;
    Folder?: string;
    Timeout?: number;
}
export declare class MailboxClient {
    #private;
    constructor(Options: MailboxClientOptions);
    fetchFolders(): Promise<string[]>;
    fetchUnreadCount(Folder?: string): Promise<number>;
    fetchRecentMessages(Limit?: number, Folder?: string): Promise<MailboxMessage[]>;
    fetchMessage(UID: number, Folder?: string): Promise<MailboxMessageDetail>;
    markAsRead(UID: number, Folder?: string): Promise<void>;
    moveMessage(UID: number, TargetFolder: string, Folder?: string): Promise<void>;
}
//# sourceMappingURL=mailbox-client.d.ts.map
/*******************************************************************************
*                                                                              *
*                             Mailbox Proxy Client                             *
*                                                                              *
*******************************************************************************/
export interface MailboxFolder {
    Path: string;
    specialUse: string | undefined;
}
export interface MailboxFolderCounts {
    Total: number;
    Unread: number;
}
export interface MailboxFolderCountsEntry extends MailboxFolderCounts {
    Path: string;
}
export interface MailboxMessage {
    UID: number;
    Subject: string;
    from: string;
    Date: string;
    isUnseen: boolean;
    isFlagged: boolean;
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
    fetchFolders(): Promise<MailboxFolder[]>;
    fetchUnreadCount(Folder?: string): Promise<number>;
    fetchFolderCounts(Folder?: string): Promise<MailboxFolderCounts>;
    fetchAllFolderCounts(Folders?: string[]): Promise<MailboxFolderCountsEntry[]>;
    fetchRecentMessages(Limit?: number, Folder?: string, BeforeUID?: number, FlaggedOnly?: boolean): Promise<MailboxMessage[]>;
    fetchMessagesSince(SinceUID: number, Limit?: number, Folder?: string, FlaggedOnly?: boolean): Promise<MailboxMessage[]>;
    fetchMessage(UID: number, Folder?: string): Promise<MailboxMessageDetail>;
    markAsRead(UID: number, Folder?: string): Promise<void>;
    setFlagged(UID: number, Flagged: boolean, Folder?: string): Promise<void>;
    moveMessage(UID: number, TargetFolder: string, Folder?: string): Promise<void>;
}
//# sourceMappingURL=mailbox-client.d.ts.map
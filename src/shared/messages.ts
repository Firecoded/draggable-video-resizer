export type ContentMessage =
    | { type: "POP_OUT_ALL" }
    | { type: "POP_OUT_BEST" }
    | { type: "POP_OUT_AT_CONTEXT_MENU" };

export type BackgroundMessage = { type: "DOWNLOAD"; url: string; filename: string };

export interface PendingDownload {
    url: string;
    filename: string;
}

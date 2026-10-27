import Dexie,{type Table} from 'dexie';
import type {DocumentDraft,DocumentRecord} from './document-record';
export type OutboxItem={id:string;payload:unknown;createdAt:number;attempts:number;lastError?:string};
export type SavedDocumentDraft={id:'current';draft:DocumentDraft;updatedAt:number};
export class LocalDatabase extends Dexie {outbox!:Table<OutboxItem,string>;documents!:Table<DocumentRecord,string>;documentDrafts!:Table<SavedDocumentDraft,string>;constructor(){super("idea-life-admin-vault");this.version(1).stores({outbox:'id,createdAt,attempts'});this.version(2).stores({outbox:'id,createdAt,attempts',documents:'id,expiryDate,updatedAt',documentDrafts:'id,updatedAt'});}}
export const localDatabase=new LocalDatabase();

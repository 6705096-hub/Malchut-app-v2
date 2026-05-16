import Dexie, { type EntityTable } from 'dexie';

export interface QueuedAction {
  id: string; // uuid
  type: 'CREATE_ORDER' | 'ADD_PAYMENT';
  payload: any; // the JSON payload
  createdAt: number; // timestamp
  status: 'PENDING' | 'ERROR';
  errorMessage?: string;
  duplicateDetected?: boolean; // Set by server if conflict found
}

const db = new Dexie('MalchutOfflineDatabase') as Dexie & {
  actions: EntityTable<
    QueuedAction,
    'id' // primary key "id"
  >;
};

// Schema version 1
db.version(1).stores({
  actions: 'id, type, createdAt, status' // Indexed properties
});

export async function addActionToQueue(type: 'CREATE_ORDER' | 'ADD_PAYMENT', payload: any) {
  const id = crypto.randomUUID();
  await db.actions.add({
    id,
    type,
    payload,
    createdAt: Date.now(),
    status: 'PENDING'
  });
  return id;
}

export async function getPendingActions() {
  return await db.actions.where('status').equals('PENDING').sortBy('createdAt');
}

export async function markActionError(id: string, errorMessage: string, duplicateDetected: boolean = false) {
  await db.actions.update(id, {
    status: 'ERROR',
    errorMessage,
    duplicateDetected
  });
}

export async function removeActionFromQueue(id: string) {
  await db.actions.delete(id);
}

export default db;

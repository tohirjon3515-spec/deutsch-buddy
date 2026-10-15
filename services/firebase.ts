import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { VocabItem, PhraseItem } from '../types';

// 1. Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 2. Validate connection on initial load (skill requirement)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore: the client is offline or initializing.");
    }
  }
}
testConnection();

// 3. Error Handling conforming strictly to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Safe deterministic ID generator obeying ^[a-zA-Z0-9_\-]+$ and length <= 128
export function sanitizeDocId(prefix: string, seed: string): string {
  const safeSeed = seed
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 70);
  return `${prefix}_${safeSeed}`.slice(0, 100);
}

// 5. Auth operations and Listener Registry
const activeFirestoreListeners = new Set<() => void>();

export function unsubscribeAllFirestoreListeners(): void {
  activeFirestoreListeners.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // ignore teardown errors
    }
  });
  activeFirestoreListeners.clear();
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      try {
        await syncUserProfile(cred.user);
      } catch (profileErr) {
        console.warn("User profile background sync warning:", profileErr);
      }
    }
    return cred.user;
  } catch (error) {
    console.error("Failed to sign in with Google:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    unsubscribeAllFirestoreListeners();
    await signOut(auth);
  } catch (error) {
    console.error("Failed to sign out:", error);
    throw error;
  }
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const now = new Date().toISOString();
    
    // Always include uid and email to satisfy security rules regardless of create or update
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || 'user@example.com',
        displayName: user.displayName || 'Deutsch Learner',
        photoURL: user.photoURL || '',
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 6. Saved Words in Firestore
export interface FirestoreSavedWord extends VocabItem {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function subscribeSavedWords(
  userId: string,
  onUpdate: (words: VocabItem[]) => void
): () => void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/savedWords`;
  const wordsCol = collection(db, 'users', userId, 'savedWords');

  let unsubSnapshot: (() => void) | null = null;
  const safeCleanup = () => {
    if (unsubSnapshot) {
      try {
        unsubSnapshot();
      } catch {
        // ignore
      }
      activeFirestoreListeners.delete(safeCleanup);
      unsubSnapshot = null;
    }
  };

  activeFirestoreListeners.add(safeCleanup);

  unsubSnapshot = onSnapshot(
    wordsCol,
    (snapshot) => {
      const itemsMap = new Map<string, VocabItem>();
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.word) {
          const key = data.word.trim().toLowerCase();
          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              word: data.word,
              type: data.type,
              grammarForms: data.grammarForms,
              meaning: data.meaning,
              contextSentence: data.contextSentence || '',
              difficulty: data.difficulty,
            });
          }
        }
      });
      onUpdate(Array.from(itemsMap.values()));
    },
    (error) => {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        safeCleanup();
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return safeCleanup;
}

export async function saveWordToFirestore(userId: string, item: VocabItem): Promise<void> {
  const docId = sanitizeDocId('w', item.word);
  const path = `users/${userId}/savedWords/${docId}`;
  try {
    const now = new Date().toISOString();
    const wordRef = doc(db, 'users', userId, 'savedWords', docId);
    const dataToSave: Record<string, any> = {
      id: docId,
      userId,
      word: item.word.slice(0, 120),
      type: (item.type || 'Word').slice(0, 60),
      grammarForms: (item.grammarForms || '').slice(0, 300),
      meaning: (item.meaning || '').slice(0, 500),
      contextSentence: (item.contextSentence || '').slice(0, 800),
      difficulty: item.difficulty || 'easy',
      createdAt: now,
      updatedAt: now,
    };
    if (item.cefrLevel && ['B1', 'B2', 'C1'].includes(item.cefrLevel)) {
      dataToSave.cefrLevel = item.cefrLevel;
    }
    if (typeof item.isNVV === 'boolean') {
      dataToSave.isNVV = item.isNVV;
    }
    await setDoc(wordRef, dataToSave, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteWordFromFirestore(userId: string, word: string): Promise<void> {
  const path = `users/${userId}/savedWords`;
  try {
    const colRef = collection(db, 'users', userId, 'savedWords');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    const target = word.trim().toLowerCase();
    snapshot.forEach(d => {
      if ((d.data().word || '').trim().toLowerCase() === target) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateWordInFirestore(
  userId: string,
  word: string,
  updates: Partial<VocabItem>
): Promise<void> {
  const path = `users/${userId}/savedWords`;
  try {
    const colRef = collection(db, 'users', userId, 'savedWords');
    const snapshot = await getDocs(colRef);
    const now = new Date().toISOString();
    
    for (const d of snapshot.docs) {
      if (d.data().word === word) {
        const patch: Record<string, any> = { updatedAt: now };
        if (updates.word !== undefined) patch.word = updates.word.slice(0, 120);
        if (updates.type !== undefined) patch.type = updates.type.slice(0, 60);
        if (updates.grammarForms !== undefined) patch.grammarForms = updates.grammarForms.slice(0, 200);
        if (updates.meaning !== undefined) patch.meaning = updates.meaning.slice(0, 300);
        if (updates.contextSentence !== undefined) patch.contextSentence = updates.contextSentence.slice(0, 500);
        if (updates.difficulty !== undefined) patch.difficulty = updates.difficulty;
        await setDoc(doc(db, 'users', userId, 'savedWords', d.id), patch, { merge: true });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function clearAllWordsInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/savedWords`;
  try {
    const colRef = collection(db, 'users', userId, 'savedWords');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function batchSaveWordsToFirestore(userId: string, items: VocabItem[]): Promise<void> {
  const path = `users/${userId}/savedWords`;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    items.forEach(item => {
      const docId = sanitizeDocId('w', item.word);
      const wordRef = doc(db, 'users', userId, 'savedWords', docId);
      const dataToSave: Record<string, any> = {
        id: docId,
        userId,
        word: item.word.slice(0, 120),
        type: (item.type || 'Word').slice(0, 60),
        grammarForms: (item.grammarForms || '').slice(0, 300),
        meaning: (item.meaning || '').slice(0, 500),
        contextSentence: (item.contextSentence || '').slice(0, 800),
        difficulty: item.difficulty || 'easy',
        createdAt: now,
        updatedAt: now,
      };
      if (item.cefrLevel && ['B1', 'B2', 'C1'].includes(item.cefrLevel)) {
        dataToSave.cefrLevel = item.cefrLevel;
      }
      if (typeof item.isNVV === 'boolean') {
        dataToSave.isNVV = item.isNVV;
      }
      batch.set(wordRef, dataToSave, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 7. Saved Phrases in Firestore
export function subscribeSavedPhrases(
  userId: string,
  onUpdate: (phrases: PhraseItem[]) => void
): () => void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/savedPhrases`;
  const phrasesCol = collection(db, 'users', userId, 'savedPhrases');

  let unsubSnapshot: (() => void) | null = null;
  const safeCleanup = () => {
    if (unsubSnapshot) {
      try {
        unsubSnapshot();
      } catch {
        // ignore
      }
      activeFirestoreListeners.delete(safeCleanup);
      unsubSnapshot = null;
    }
  };

  activeFirestoreListeners.add(safeCleanup);

  unsubSnapshot = onSnapshot(
    phrasesCol,
    (snapshot) => {
      const itemsMap = new Map<string, PhraseItem>();
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.phrase) {
          const key = data.phrase.trim().toLowerCase();
          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              phrase: data.phrase,
              literalTranslation: data.literalTranslation,
              actualMeaning: data.actualMeaning,
              explanation: data.explanation,
              exampleSentence: data.exampleSentence,
              difficulty: data.difficulty || 'Common',
            });
          }
        }
      });
      onUpdate(Array.from(itemsMap.values()));
    },
    (error) => {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        safeCleanup();
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return safeCleanup;
}

export async function savePhraseToFirestore(userId: string, item: PhraseItem): Promise<void> {
  const docId = sanitizeDocId('p', item.phrase);
  const path = `users/${userId}/savedPhrases/${docId}`;
  try {
    const now = new Date().toISOString();
    const phraseRef = doc(db, 'users', userId, 'savedPhrases', docId);
    const dataToSave: Record<string, any> = {
      id: docId,
      userId,
      phrase: item.phrase.slice(0, 300),
      literalTranslation: item.literalTranslation.slice(0, 500),
      actualMeaning: item.actualMeaning.slice(0, 500),
      explanation: item.explanation.slice(0, 800),
      exampleSentence: item.exampleSentence.slice(0, 800),
      difficulty: item.difficulty || 'Common',
      createdAt: now,
      updatedAt: now,
    };
    if (item.category) {
      dataToSave.category = item.category.slice(0, 100);
    }
    await setDoc(phraseRef, dataToSave, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePhraseFromFirestore(userId: string, phrase: string): Promise<void> {
  const path = `users/${userId}/savedPhrases`;
  try {
    const colRef = collection(db, 'users', userId, 'savedPhrases');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    const target = phrase.trim().toLowerCase();
    snapshot.forEach(d => {
      if ((d.data().phrase || '').trim().toLowerCase() === target) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearAllPhrasesInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/savedPhrases`;
  try {
    const colRef = collection(db, 'users', userId, 'savedPhrases');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function batchSavePhrasesToFirestore(userId: string, items: PhraseItem[]): Promise<void> {
  const path = `users/${userId}/savedPhrases`;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    items.forEach(item => {
      const docId = sanitizeDocId('p', item.phrase);
      const phraseRef = doc(db, 'users', userId, 'savedPhrases', docId);
      const dataToSave: Record<string, any> = {
        id: docId,
        userId,
        phrase: item.phrase.slice(0, 300),
        literalTranslation: item.literalTranslation.slice(0, 500),
        actualMeaning: item.actualMeaning.slice(0, 500),
        explanation: item.explanation.slice(0, 800),
        exampleSentence: item.exampleSentence.slice(0, 800),
        difficulty: item.difficulty || 'Common',
        createdAt: now,
        updatedAt: now,
      };
      if (item.category) {
        dataToSave.category = item.category.slice(0, 100);
      }
      batch.set(phraseRef, dataToSave, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 8. Text Analysis History
export interface HistoryRecord {
  id: string;
  userId: string;
  text: string;
  mode: 'sentence' | 'paragraph';
  translation: string;
  createdAt: string;
  grammarTopic?: string;
  detectedStructures?: string[];
  vocabCount?: number;
}

export function subscribeHistory(
  userId: string,
  onUpdate: (records: HistoryRecord[]) => void
): () => void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/history`;
  const histCol = collection(db, 'users', userId, 'history');

  let unsubSnapshot: (() => void) | null = null;
  const safeCleanup = () => {
    if (unsubSnapshot) {
      try {
        unsubSnapshot();
      } catch {
        // ignore
      }
      activeFirestoreListeners.delete(safeCleanup);
      unsubSnapshot = null;
    }
  };

  activeFirestoreListeners.add(safeCleanup);

  unsubSnapshot = onSnapshot(
    histCol,
    (snapshot) => {
      const records: HistoryRecord[] = [];
      snapshot.forEach(d => {
        records.push(d.data() as HistoryRecord);
      });
      // Sort in memory by createdAt descending
      records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(records);
    },
    (error) => {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        safeCleanup();
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return safeCleanup;
}

export async function saveHistoryRecord(
  userId: string,
  record: {
    text: string;
    mode: 'sentence' | 'paragraph';
    translation: string;
    grammarTopic?: string;
    detectedStructures?: string[];
    vocabCount?: number;
  }
): Promise<void> {
  const docId = sanitizeDocId('h', record.text.slice(0, 20));
  const path = `users/${userId}/history/${docId}`;
  try {
    const now = new Date().toISOString();
    const docRef = doc(db, 'users', userId, 'history', docId);
    const dataToSave: Record<string, any> = {
      id: docId,
      userId,
      text: record.text.slice(0, 5000),
      mode: record.mode,
      translation: record.translation.slice(0, 5000),
      createdAt: now,
    };
    if (record.grammarTopic) dataToSave.grammarTopic = record.grammarTopic.slice(0, 300);
    if (record.detectedStructures && Array.isArray(record.detectedStructures)) {
      dataToSave.detectedStructures = record.detectedStructures.slice(0, 30).map(s => String(s).slice(0, 200));
    }
    if (typeof record.vocabCount === 'number') dataToSave.vocabCount = record.vocabCount;

    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteHistoryRecord(userId: string, historyId: string): Promise<void> {
  const path = `users/${userId}/history/${historyId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'history', historyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

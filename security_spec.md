# Security Specification: DeutschBuddy Firestore Security Rules

## 1. Data Invariants
1. **User Scoping & Isolation**: All user-specific data (`/users/{userId}`, `/users/{userId}/savedWords/{wordId}`, `/users/{userId}/savedPhrases/{phraseId}`, `/users/{userId}/history/{historyId}`) must only be readable and writable by the authenticated user whose `request.auth.uid == userId`.
2. **Identity Integrity**: Any document write to a subcollection under `/users/{userId}` must verify `request.resource.data.userId == request.auth.uid` and `request.auth.uid == userId`.
3. **No Cross-User Access**: An authenticated user cannot read, create, update, or delete any other user's profile, saved words, phrases, or analysis history.
4. **Validation Constraints**:
   - `id` and path variables must be valid identifiers (`isValidId(id)`).
   - Text fields must have bounded lengths to prevent resource exhaustion attacks.
   - Immutable fields (`uid`, `userId`, `id`, `createdAt`) cannot be mutated upon update.
   - Timestamps must be valid server timestamps or conform to date/time format.
5. **Default Deny**: All unmapped paths must deny all operations (`match /{document=**} { allow read, write: if false; }`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing - Profile)**: An attacker attempting to write a profile document to `/users/{victimUid}` with attacker's auth token. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (User ID Tampering in Subcollection)**: Attacker authenticated as `uid_123` attempting to save a word under `/users/uid_123/savedWords/word_1` but setting `userId: "uid_victim"`. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Unauthenticated Read)**: Unauthenticated visitor attempting to read `/users/user_abc/savedWords`. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Cross-User Read)**: User `uid_alice` attempting to read `/users/uid_bob/savedWords/w1`. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Unbounded Payload / Denial of Wallet)**: An attacker sending a `word` payload containing a 100KB string for `meaning` or `word`. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Shadow Key Injection)**: Attacker creating a `SavedWord` with unexpected schema properties like `{ isAdmin: true, role: "admin" }`. Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Path Traversal / Malformed Document ID)**: Attacker writing to an ID containing illegal characters `../../admin` or exceeding 128 characters. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (History Forgery for Another User)**: Attacker authenticated as `uid_alice` attempting to create `/users/uid_bob/history/h1`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Immutable Field Mutation)**: Attacker updating a saved word and attempting to alter the `userId` or `id`. Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Invalid Enumeration Injection)**: Attacker inserting `difficulty: "super-extreme-cheat"` into `SavedWord` when only `["easy", "hard"]` is permitted. Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Blanket Root Access)**: Attacker attempting to read or write to arbitrary collections `/secret_admin_keys/key1`. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Empty String / Missing Required Field)**: Attacker inserting a word document without required fields (`word`, `meaning`, `grammarForms`). Expected: `PERMISSION_DENIED`.

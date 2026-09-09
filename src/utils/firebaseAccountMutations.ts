import type { BittyMetadata } from '../types';

export interface FirebaseTokenProvider {
  getIdToken(): Promise<string>;
}

export interface FirebaseTrackedBoxInput {
  title: string;
  url: string;
  format?: string;
  byteSize?: number;
  compressedSize?: number;
  encrypted?: boolean;
  boxBreakdowns?: Array<{
    index: number;
    title: string;
    isCloned?: boolean;
    totalCost: number;
    blockCount?: number;
  }>;
  locks?: {
    password?: boolean;
    timeWindow?: boolean;
    accessLimit?: boolean;
  };
  lockConfig?: BittyMetadata['lockConfig'];
}

export interface FirebaseAccountMutationResult {
  success: boolean;
  user?: any;
  box?: any;
  error?: string;
}

async function parseMutationResponse(response: Response): Promise<FirebaseAccountMutationResult> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true || !data.user) {
    return {
      success: false,
      error: data.error || `Account request failed (${response.status})`,
    };
  }
  return {
    success: true,
    user: data.user,
    box: data.box,
  };
}

async function firebaseHeaders(
  tokenProvider: FirebaseTokenProvider,
  includeJson = false,
): Promise<Record<string, string>> {
  const idToken = await tokenProvider.getIdToken();
  if (!idToken) throw new Error('Firebase identity token is unavailable');
  return {
    Authorization: `Bearer ${idToken}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function recordFirebaseTrackedBox(
  tokenProvider: FirebaseTokenProvider,
  input: FirebaseTrackedBoxInput,
  fetchImpl: typeof fetch = fetch,
): Promise<FirebaseAccountMutationResult> {
  try {
    const response = await fetchImpl('/api/accounts/links', {
      method: 'POST',
      headers: await firebaseHeaders(tokenProvider, true),
      body: JSON.stringify(input),
    });
    return await parseMutationResponse(response);
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not record box' };
  }
}

export async function deleteFirebaseTrackedBox(
  tokenProvider: FirebaseTokenProvider,
  boxId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FirebaseAccountMutationResult> {
  if (!boxId) return { success: false, error: 'Box ID is required' };
  try {
    const response = await fetchImpl(`/api/accounts/links/${encodeURIComponent(boxId)}`, {
      method: 'DELETE',
      headers: await firebaseHeaders(tokenProvider),
    });
    return await parseMutationResponse(response);
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not delete box' };
  }
}

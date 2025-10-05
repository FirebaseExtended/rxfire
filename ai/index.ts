/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  startAudioConversation as vanillaStartAudioConversation,
  type AudioConversationController,
  type LiveSession,
  type StartAudioConversationOptions,
} from 'firebase/ai';
import { Observable, from } from 'rxjs';

/**
 * Create an observable of the original `startAudioConversation` promise just in
 * case it breaks again due to imports.
 *
 * @param liveSession
 * @param options
 * @returns
 */
export function startAudioConversation(
  liveSession: LiveSession,
  options?: StartAudioConversationOptions
): Observable<AudioConversationController> {
  return from(vanillaStartAudioConversation(liveSession, options));
}

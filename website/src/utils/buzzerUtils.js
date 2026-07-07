import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Triggers the buzzer with a specific pattern and duration.
 * @param {string} lockboxId - The ID of the lockbox.
 * @param {string} pattern - The warning pattern (e.g., "WARNING_1_MIN", "KEY_NOT_RETURNED").
 * @param {number} durationMs - Duration in milliseconds to sound the buzzer.
 */
export const triggerBuzzerPattern = async (lockboxId, pattern, durationMs = 10000) => {
  try {
    console.log(`[Buzzer] Triggering ${pattern} on ${lockboxId} for ${durationMs}ms`);
    const buzzerRef = ref(database, `lockboxes/${lockboxId}/lockbox/buzzer`);
    await update(buzzerRef, {
      pattern: pattern,
      durationMs: durationMs,
      timestamp: Date.now() // Ensure state change triggers ESP32
    });
  } catch (error) {
    console.error("Failed to trigger buzzer warning:", error);
  }
};

/**
 * Resets the buzzer state to off.
 * @param {string} lockboxId - The ID of the lockbox.
 */
export const clearBuzzer = async (lockboxId) => {
  try {
    console.log(`[Buzzer] Clearing buzzer on ${lockboxId}`);
    const buzzerRef = ref(database, `lockboxes/${lockboxId}/lockbox/buzzer`);
    await update(buzzerRef, {
      pattern: "NONE",
      durationMs: 0,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Failed to clear buzzer:", error);
  }
};

/**
 * Triggers a 1-minute warning buzzer.
 * @param {string} lockboxId - The ID of the lockbox.
 */
export const triggerBuzzerWarning = async (lockboxId) => {
  return triggerBuzzerPattern(lockboxId, "WARNING_1_MIN", 10000);
};

/**
 * Resets the buzzer state to off.
 * @param {string} lockboxId - The ID of the lockbox.
 */
export const resetBuzzer = async (lockboxId) => {
  return clearBuzzer(lockboxId);
};
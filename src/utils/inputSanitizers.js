export const MAX_KITCHEN_NOTE_LENGTH = 160;
export const MAX_RECEIPT_NUMBER_LENGTH = 40;
export const MAX_LOGIN_USERNAME_LENGTH = 40;
export const MAX_LOGIN_PASSWORD_LENGTH = 72;

export const sanitizeCustomerName = (value, maxLength = 60) =>
  String(value || "")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

export const sanitizeKitchenNote = (value, maxLength = MAX_KITCHEN_NOTE_LENGTH) =>
  String(value || "")
    .replace(/[^\p{L}\s,.;:()/\-!?+]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

export const finalizeKitchenNote = (value) =>
  sanitizeKitchenNote(value)
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeSafeFreeText = (value, maxLength = 180) =>
  String(value || "")
    .replace(/[<>`{}[\]\\|]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

export const sanitizeReceiptNumber = (value) =>
  String(value || "")
    .replace(/[^\p{L}\p{N}\s./\-#]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_RECEIPT_NUMBER_LENGTH);

export const sanitizeLoginUsername = (value) =>
  String(value || "")
    .replace(/[^A-Za-z0-9._@-]/g, "")
    .slice(0, MAX_LOGIN_USERNAME_LENGTH);

export const sanitizeLoginPassword = (value) =>
  String(value || "")
    .replace(/[^\x21-\x7E]/g, "")
    .replace(/[<>"'`{}[\]\\|;]/g, "")
    .slice(0, MAX_LOGIN_PASSWORD_LENGTH);

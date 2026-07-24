export const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type FileValidationError = { message: string };

/** Shared by every endpoint that accepts an image upload, so the rules (and their
 * error messages) can't drift between /api/uploads and the artwork endpoints. */
export function validateImageFile(value: FormDataEntryValue | null): File | FileValidationError {
  if (!value || !(value instanceof File)) {
    return { message: "No file provided." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    return { message: "Unsupported file type. Use PNG, JPEG, WEBP, or GIF." };
  }
  if (value.size > MAX_IMAGE_SIZE_BYTES) {
    return { message: "File is too large. Max size is 5MB." };
  }
  return value;
}

export function isFileValidationError(value: File | FileValidationError): value is FileValidationError {
  return "message" in value;
}

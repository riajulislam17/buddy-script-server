export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T | null;
}

export function successResponse<T = unknown>(
  message: string,
  data: T | null = null,
): SuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

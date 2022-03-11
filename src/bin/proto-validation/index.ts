import { Validator } from "./types";

export const alwaysSuccessValidator: Validator = (_: unknown) => {
  return { success: true };
};

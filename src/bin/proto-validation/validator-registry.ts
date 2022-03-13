import { FieldKind, ValidatorFactory } from "./types";
import { alwaysSuccessFactory } from "./utils";
import { messageValidatorFactory } from "./message-validator";
import { scalarValidatorFactory } from "./scalar-validator";

export const fieldKindToFactory: Record<FieldKind, ValidatorFactory> = {
  enum: alwaysSuccessFactory,
  message: messageValidatorFactory,
  map: alwaysSuccessFactory,
  scalar: scalarValidatorFactory,
};

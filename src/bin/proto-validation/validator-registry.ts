import { FieldInfo } from "@protobuf-ts/runtime";
import { FieldKind, ValidatorFactory } from "./types";
import { alwaysSuccessValidator } from ".";

const alwaysSuccessFactory: ValidatorFactory = (_: FieldInfo) => alwaysSuccessValidator;

export const fieldKindToFactory: Record<FieldKind, ValidatorFactory> = {
  enum: alwaysSuccessFactory,
  message: alwaysSuccessFactory,
  map: alwaysSuccessFactory,
  scalar: alwaysSuccessFactory,
};

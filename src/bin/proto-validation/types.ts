import { FieldInfo } from "@protobuf-ts/runtime";

interface ValidateSuccess {
  success: true;
}

interface ValidateFailure {
  success: false;
  errorMessage: string;
}

export type ValidateResult = ValidateFailure | ValidateSuccess;
export type Validator = (message: unknown) => ValidateResult;
export type FieldKind = FieldInfo["kind"];

export type ValidatorFactory = (fieldInfo: FieldInfo) => Validator;

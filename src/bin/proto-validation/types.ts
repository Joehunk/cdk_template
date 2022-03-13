import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";

export interface ValidateSuccess {
  success: true;
}

export interface ValidateFailure {
  success: false;
  errorMessage: string;
}

export type Func<Args extends unknown[], Ret> = (...args: Args) => Ret;

export type ValidateResult = ValidateFailure | ValidateSuccess;
export type Validator = (message: unknown) => ValidateResult;
export type FieldKind = FieldInfo["kind"];

export type ValidatorFactory = (fieldInfo: FieldInfo, options: ValidateOptions) => Validator;

export interface ValidateOptions {
  readonly registry: Record<FieldKind, ValidatorFactory>;
  readonly validatorCache: Map<IMessageType<object>, Validator>;
}

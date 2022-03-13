import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";

export interface ValidateSuccess {
  readonly success: true;
}

export interface ValidateFailure {
  readonly success: false;
  readonly errorMessage: string;
}

export type Func<Args extends unknown[], Ret> = (...args: Args) => Ret;

export type ValidateResult = ValidateFailure | ValidateSuccess;
export type Validator = (message: unknown) => ValidateResult;
export type FieldKind = FieldInfo["kind"];

export type ValidatorFactory = (fieldInfo: FieldInfo, options: ValidateOptions) => Validator;

export interface ValidateOptions {
  readonly registry: Readonly<Record<FieldKind, ValidatorFactory>>;
  readonly mutableValidatorCache: Map<IMessageType<object>, Validator>;
}

import { Either } from "purify-ts/Either";
import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";

export interface ValidateSuccess {
  readonly success: true;
}

export interface ValidateFailure {
  readonly success: false;
  readonly errorMessage: string;
}

export type Func<Args extends unknown[], Ret> = (...args: Args) => Ret;

export type ValidateResult<T = ValidateSuccess> = Either<ValidateFailure, T>;
export type Validator<TSuccess = ValidateSuccess, TIn = unknown> = (message: TIn) => ValidateResult<TSuccess>;
export type FieldKind = FieldInfo["kind"];

export type ValidatorFactory = (fieldInfo: FieldInfo, options: ValidateOptions) => Validator;

export interface ValidateOptions {
  readonly registry: Readonly<Record<FieldKind, ValidatorFactory>>;
  readonly mutableValidatorCache: Map<IMessageType<object>, Validator>;
}

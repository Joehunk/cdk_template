import * as R from "ramda";
import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import { FieldRules } from "../../../gensrc/validate/validate";
import { Left, Right } from "purify-ts";
import { ValidateResult, Validator, ValidatorFactory } from "./types";

const validateRulesType = "validate.rules" as const;

export const validateSuccess: ValidateResult = Right({ success: true });

export const validateFail: (reason: string) => ValidateResult<never> = (reason) => {
  return Left({
    success: false,
    errorMessage: reason,
  });
};

export const alwaysSuccessValidator: Validator = (_: unknown) => validateSuccess;

export const alwaysFailValidator: (x: string) => Validator = (message: string) => (_value: unknown) => {
  return Left({
    success: false,
    errorMessage: message,
  });
};

export const alwaysSuccessFactory: ValidatorFactory = (_: FieldInfo) => alwaysSuccessValidator;

export const alwaysFailFactory: (error: string) => ValidatorFactory = (error) => (_fieldInfo) => {
  return alwaysFailValidator(error);
};

export const getValidationRules: (fieldInfo: FieldInfo) => FieldRules = (fieldInfo) =>
  FieldRules.fromJson((fieldInfo.options || {})[validateRulesType] || {});

export const nonNullishValidator: Validator = (message) => {
  if (message === null || message === undefined) {
    return validateSuccess;
  }
  return validateFail("value must be set");
};

export const nSpaces: (spaces: number) => string = (spaces) => R.join("", R.repeat(" ", spaces));
export const indent: (spaces: number) => (lines: string) => string = (spaces) =>
  R.pipe(R.split("\n"), R.map(R.concat(nSpaces(spaces))), R.join("\n"));

export const composeValidators: <T, U>(val1: Validator<T>) => (val2: Validator<U>) => Validator<T> = (val1) => (val2) =>
  R.chain(val1, val2);

export const dumpValidatorCache: (cache: Map<IMessageType<object>, Validator>) => string = (cache) => {
  return R.pipe(
    R.map((entry: [IMessageType<object>, Validator]) => {
      return `${entry[0].typeName}:: ${entry[1]}`;
    }),
    R.concat(["Dumping validator cache..."]),
    R.concat(R.__, ["Done."]),
    R.join("\n")
  )([...cache.entries()]);
};

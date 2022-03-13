import * as R from "ramda";
import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import { FieldRules } from "../../../gensrc/validate/validate";
import { ValidateFailure, ValidateSuccess, Validator, ValidatorFactory } from "./types";

const validateRulesType = "validate.rules" as const;

export const validateSuccess: ValidateSuccess = { success: true };

export const validateFail: (reason: string) => ValidateFailure = (reason) => {
  return {
    success: false,
    errorMessage: reason,
  };
};

export const alwaysSuccessValidator: Validator = (_: unknown) => {
  return { success: true };
};

export const alwaysFailValidator: (x: string) => Validator = (message: string) => (_value: unknown) => {
  return {
    success: false,
    errorMessage: message,
  };
};

export const alwaysSuccessFactory: ValidatorFactory = (_: FieldInfo) => alwaysSuccessValidator;

export const alwaysFailFactory: (error: string) => ValidatorFactory = (error) => (_fieldInfo) => {
  return alwaysFailValidator(error);
};

export const getValidationRules: (fieldInfo: FieldInfo) => FieldRules = (fieldInfo) =>
  FieldRules.fromJson((fieldInfo.options || {})[validateRulesType] || {});

export const composeValidators: (val1: Validator) => (val2: Validator) => Validator = (val1) => (val2) => {
  return (message: unknown) => {
    const result = val1(message);

    if (result.success) {
      return val2(message);
    }
    return result;
  };
};

export const nonNullishValidator: Validator = (message) => {
  if (message === null || message === undefined) {
    return validateSuccess;
  }
  return validateFail("value must be set");
};

export const nSpaces: (spaces: number) => string = (spaces) => R.join("", R.repeat(" ", spaces));
export const indent: (spaces: number) => (lines: string) => string = (spaces) =>
  R.pipe(R.split("\n"), R.map(R.concat(nSpaces(spaces))), R.join(""));

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

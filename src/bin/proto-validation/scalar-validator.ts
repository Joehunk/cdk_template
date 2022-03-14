import * as R from "ramda";
import { FieldInfo, ScalarType } from "@protobuf-ts/runtime";
import { FieldRules, SFixed32Rules, SFixed64Rules } from "../../../gensrc/validate/validate";
import { Right } from "purify-ts/Either";
import {
  ValidateFailure,
  ValidateOptions,
  ValidateResult,
  ValidateSuccess,
  Validator,
  ValidatorFactory,
} from "./types";
import { alwaysFailValidator, getValidationRules, validateFail, validateSuccess } from "./utils";

type SubValidatorGetter<TIn = unknown> = (
  fieldInfo: FieldInfo,
  fieldRules: FieldRules,
  options: ValidateOptions
) => Validator<ValidateSuccess, TIn>;

// A numeric type paired with the constraints capable of evaluating that type.
// We use this so we can write one method that evaluates bigints and numbers.
type NumberAndConstraints = [bigint, SFixed64Rules] | [number, SFixed32Rules];

const evaluateNumericConstraints: <T extends NumberAndConstraints>(
  constraints: T[1]
) => (value: T[0]) => ValidateResult = (constraints) => (value) => {
  if (constraints.const && constraints.const != value) {
    return validateFail(`must equal exactly ${constraints.const}`);
  }

  if (constraints.gt && !(value > constraints.gt)) {
    return validateFail(`must be greater than ${constraints.gt}`);
  }

  if (constraints.lt && !(value < constraints.lt)) {
    return validateFail(`must be less than ${constraints.lt}`);
  }

  if (constraints.gte && !(value >= constraints.gte)) {
    return validateFail(`must be greater than ${constraints.gte}`);
  }

  if (constraints.lte && !(value <= constraints.lte)) {
    return validateFail(`must be less than ${constraints.lte}`);
  }

  if (constraints.in.length && !R.includes(value, constraints.in)) {
    return validateFail(`must be one of ${constraints.in}`);
  }

  if (constraints.notIn.length && R.includes(value, constraints.notIn)) {
    return validateFail(`must not be one of ${constraints.notIn}`);
  }

  return validateSuccess;
};

const getBigIntValidator: SubValidatorGetter<bigint> = (_fieldInfo, fieldRules) => (message) => {
  const ruleType = fieldRules.type;

  switch (ruleType.oneofKind) {
    case "fixed32":
      return evaluateNumericConstraints(ruleType.fixed32)(message);
    case "fixed64":
      return evaluateNumericConstraints(ruleType.fixed64)(message);
    case "sfixed32":
      return evaluateNumericConstraints(ruleType.sfixed32)(message);
    case "sfixed64":
      return evaluateNumericConstraints(ruleType.sfixed64)(message);
    case "sint32":
      return evaluateNumericConstraints(ruleType.sint32)(message);
    case "sint64":
      return evaluateNumericConstraints(ruleType.sint64)(message);
    case "int32":
      return evaluateNumericConstraints(ruleType.int32)(message);
    case "int64":
      return evaluateNumericConstraints(ruleType.int64)(message);
    case "uint32":
      return evaluateNumericConstraints(ruleType.uint32)(message);
    case "uint64":
      return evaluateNumericConstraints(ruleType.uint64)(message);
  }

  return validateFail(`Unrecognized integer type ${ruleType.oneofKind}`);
};

const getFloatValidator: SubValidatorGetter = (_fieldInfo, fieldRules) => (message) => {
  if (typeof message !== "number") {
    return validateFail("Expected numeric type");
  }

  const ruleType = fieldRules.type;

  switch (ruleType.oneofKind) {
    case "float":
      return evaluateNumericConstraints(ruleType.float)(message);
    case "double":
      return evaluateNumericConstraints(ruleType.double)(message);
  }

  return validateFail(`Unrecognized decimal/floating point type ${ruleType.oneofKind}`);
};

const convertToBigInt: Validator<bigint> = (message) => {
  switch (typeof message) {
    case "bigint":
      return Right(message);

    case "number":
    case "boolean":
    case "string":
      return Right(BigInt(message));

    default:
      return validateFail(`Expected a type that could be converted to BigInt but got ${JSON.stringify(message)}`);
  }
};

type Chain<T> = { "fantasy-land/chain": T };

export function chainR<A, ChainA extends Chain<unknown>, ChainB extends Chain<unknown>>(
  fn: (n: A) => ChainB
): (chain: ChainA) => ChainB {
  // This is a hack to get around the fact that Ramda's TS types don't include the right typings to support the feature
  // that lets it work with "fantasy-land" (a popular categories library).
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return R.chain(fn);
}

const getIntegerValidator: SubValidatorGetter = (fieldInfo, fieldRules, options) =>
  R.pipe(convertToBigInt, chainR(getBigIntValidator(fieldInfo, fieldRules, options)));

const getBytesValidator: SubValidatorGetter = () => () => {
  return validateSuccess;
};

const getBoolValidator: SubValidatorGetter = () => () => {
  return validateSuccess;
};

const getStringValidator: SubValidatorGetter = (_, fieldRules) => (message) => {
  if (typeof message !== "string") {
    return validateFail("Expected string type");
  }

  const ruleType = fieldRules.type;

  if (ruleType.oneofKind !== "string") {
    return validateFail("Attempted to validate string with non-string validation rules.");
  }

  if (ruleType.string.const && ruleType.string.const !== message) {
    return validateFail(`must equal exact string: ${ruleType.string.const}`);
  }

  if (ruleType.string.minLen && message.length < ruleType.string.minLen) {
    return validateFail(`length must be at least ${ruleType.string.minLen}`);
  }

  if (ruleType.string.maxLen && message.length > ruleType.string.maxLen) {
    return validateFail(`length must be at least ${ruleType.string.maxLen}`);
  }

  return validateSuccess;
};

export const scalarValidatorFactory: ValidatorFactory = (fieldInfo, options) => {
  if (fieldInfo.kind !== "scalar") {
    return alwaysFailValidator("Expected scalar field kind.");
  }

  const validateRules = getValidationRules(fieldInfo);

  switch (fieldInfo.T) {
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return getFloatValidator(fieldInfo, validateRules, options);

    case ScalarType.FIXED32:
    case ScalarType.INT32:
    case ScalarType.UINT32:
    case ScalarType.SINT32:
    case ScalarType.SFIXED32:
    case ScalarType.FIXED64:
    case ScalarType.SFIXED64:
    case ScalarType.INT64:
    case ScalarType.UINT64:
    case ScalarType.SINT64:
      return getIntegerValidator(fieldInfo, validateRules, options);

    case ScalarType.BYTES:
      return getBytesValidator(fieldInfo, validateRules, options);

    case ScalarType.BOOL:
      return getBoolValidator(fieldInfo, validateRules, options);

    case ScalarType.STRING:
      return getStringValidator(fieldInfo, validateRules, options);
  }
};

import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import R = require("ramda");
import { ValidateOptions, ValidateResult, Validator, ValidatorFactory } from "./types";
import {
  alwaysFailFactory,
  alwaysFailValidator,
  composeValidators,
  getValidationRules,
  indent,
  nonNullishValidator,
  validateFail,
  validateSuccess,
} from "./utils";

const validationSystemError: (messageType: IMessageType<object>) => string = (
  messageType
) => `Invalid state: validator not present for type ${messageType.typeName}. 
This is likely due to a bug in the validation system.`;

const placeholderValidator: (messageType: IMessageType<object>) => Validator = (messageType) =>
  alwaysFailValidator(validationSystemError(messageType));

const recursionBreakingLazyValidator: (
  messageType: IMessageType<object>,
  validatorCache: Map<IMessageType<object>, Validator>
) => Validator = (messageType, validatorCache) => (message) => {
  const validator = validatorCache.get(messageType);

  if (!validator) {
    return validateFail(validationSystemError(messageType));
  }
  return validator(message);
};

export const messageValidatorFactory: ValidatorFactory = (fieldInfo, options) => {
  if (fieldInfo.kind !== "message") {
    return alwaysFailValidator("Expected message type");
  }

  const subMessageType = fieldInfo.T();

  if (options.mutableValidatorCache.has(subMessageType)) {
    return recursionBreakingLazyValidator(subMessageType, options.mutableValidatorCache);
  }

  options.mutableValidatorCache.set(subMessageType, placeholderValidator(subMessageType));

  const isRequired = getValidationRules(fieldInfo).message?.required || false;
  const subMessageValidator = validatorForMessage(subMessageType, options);
  const realValidator = isRequired ? composeValidators(nonNullishValidator)(subMessageValidator) : subMessageValidator;

  options.mutableValidatorCache.set(subMessageType, realValidator);
  return realValidator;
};

type FieldValidatorsByFieldName = { [key: string]: Validator | undefined };
type FieldValidatorFunction = (
  fieldValidators: FieldValidatorsByFieldName
) => (fieldValue: unknown, fieldName: string) => ValidateResult;
type ResultsByField = Record<string, ValidateResult>;

const validateFieldOfMessage: FieldValidatorFunction = (fieldValidators) => (fieldValue, fieldName) => {
  const fieldValidator = fieldValidators[fieldName];

  if (fieldValidator) {
    return fieldValidator(fieldValue);
  } else {
    return {
      success: false,
      errorMessage: "unknown field",
    };
  }
};

const formatErrorForField: (result: ValidateResult, fieldName: string) => string | null = (result, fieldName) => {
  if (result.success) {
    return null;
  }
  return `${fieldName}: ${result.errorMessage}`;
};

const coalesceResults: (results: ResultsByField) => ValidateResult = (results) => {
  const anyFailures = R.any(R.not, R.map(R.prop("success"), R.values(results)));

  if (!anyFailures) {
    return { success: true };
  } else {
    const concatErrors = R.pipe(R.mapObjIndexed(formatErrorForField), R.values, R.reject(R.isNil), R.join("\n"));

    return {
      success: false,
      errorMessage: concatErrors(results),
    };
  }
};

const createCompositeValidator: (fieldValidators: FieldValidatorsByFieldName) => Validator = (fieldValidators) => {
  return (message) => {
    if (typeof message === "object") {
      const allResults = R.mapObjIndexed(validateFieldOfMessage(fieldValidators), message as Record<string, unknown>);

      return coalesceResults(allResults);
    } else {
      return {
        success: false,
        errorMessage: `Attempted to validate non-object type: ${JSON.stringify(message)}`,
      };
    }
  };
};

export const validatorForMessage: (messageType: IMessageType<object>, options: ValidateOptions) => Validator = (
  messageType,
  options
) => {
  const getFieldValidator = (fieldInfo: FieldInfo) => {
    const validatorFactory =
      (options.registry || {})[fieldInfo.kind] ||
      alwaysFailFactory(`No registered validator for field kind: ${fieldInfo.kind}`);

    return { [fieldInfo.localName]: validatorFactory(fieldInfo, options) };
  };
  const createValidator = R.pipe(R.map(getFieldValidator), R.mergeAll, createCompositeValidator);
  const messageValidator = createValidator(messageType.fields);

  return (message) => {
    if (!message) {
      return validateSuccess;
    }

    const result = messageValidator(message);

    if (result.success) {
      return result;
    } else {
      return {
        success: false,
        errorMessage: `${messageType.typeName}:\n${indent(2)(result.errorMessage)}`,
      };
    }
  };
};

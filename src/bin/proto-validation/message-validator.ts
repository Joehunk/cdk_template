import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import R = require("ramda");
import { ValidateOptions, ValidateResult, Validator, ValidatorFactory } from "./types";
import {
  alwaysFailFactory,
  alwaysFailValidator,
  composeValidators,
  dumpValidatorCache,
  getValidationRules,
  indent,
  nonNullishValidator,
  validateFail,
  validateSuccess,
} from "./utils";

const placeholderValidator: (messageType: IMessageType<object>) => Validator = (messageType) =>
  alwaysFailValidator(
    `Invalid state: validator not present for type ${messageType.typeName}. 
    This is likely due to a bug in the validation system.`
  );

export const messageValidatorFactory: ValidatorFactory = (fieldInfo, options) => {
  if (fieldInfo.kind !== "message") {
    return alwaysFailValidator("Expected message type");
  }

  const subMessageType = fieldInfo.T();

  if (options.validatorCache.has(subMessageType)) {
    // DEBUG
    console.log("Returning validator from cache");
    console.log(dumpValidatorCache(options.validatorCache));

    const cache = options.validatorCache;

    return (message: unknown) => {
      // DEBUG
      console.log("Inside validator being called");
      console.log(dumpValidatorCache(options.validatorCache));

      const validator = cache.get(subMessageType);

      if (!validator) {
        return validateFail(`Error: no validator for message type ${subMessageType.typeName}`);
      }
      return validator(message);
    };
  }

  options.validatorCache.set(subMessageType, placeholderValidator(subMessageType));

  // DEBUG
  console.log("Inserted placeholder");
  console.log(dumpValidatorCache(options.validatorCache));

  const isRequired = getValidationRules(fieldInfo).message?.required || false;
  const subMessageValidator = isRequired
    ? composeValidators(nonNullishValidator)(validatorForMessage(subMessageType, options))
    : validatorForMessage(subMessageType, options);

  options.validatorCache.set(subMessageType, subMessageValidator);

  // DEBUG
  console.log("Inserted real validator");
  console.log(dumpValidatorCache(options.validatorCache));

  return subMessageValidator;
};

type FieldValidators = { [key: string]: Validator | undefined };
type FieldValidatorFunction = (
  fieldValidators: FieldValidators
) => (fieldValue: unknown, fieldName: string) => ValidateResult;
type ResultsByField = Record<string, ValidateResult>;

const validateFieldOfMessage: FieldValidatorFunction =
  (fieldValidators: FieldValidators) => (fieldValue: unknown, fieldName: string) => {
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

function formatErrorForField(result: ValidateResult, fieldName: string): string | null {
  if (result.success) {
    return null;
  }
  return `${fieldName}: ${result.errorMessage}`;
}

function coalesceResults(results: ResultsByField): ValidateResult {
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
}

function createCompositeValidator(fieldValidators: FieldValidators): Validator {
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
}

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

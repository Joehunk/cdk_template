import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import R = require("ramda");
import { ValidateFailure, ValidateOptions, ValidateResult, Validator, ValidatorFactory } from "./types";
import {
  alwaysFailFactory,
  alwaysFailValidator,
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
  const realValidator = isRequired ? R.pipe(nonNullishValidator, R.chain(subMessageValidator)) : subMessageValidator;

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
    return validateFail("unknownField");
  }
};

const formatErrorForField: (result: ValidateResult, fieldName: string) => string | null = (result, fieldName) => {
  return result
    .bimap(
      (failure) => `${fieldName}: ${failure.errorMessage}`,
      (_success) => null
    )
    .extract();
};

const coalesceResults: (results: ResultsByField) => ValidateResult = (results) => {
  const anyFailures = R.any((result) => result.isLeft(), R.values(results));

  if (!anyFailures) {
    return validateSuccess;
  } else {
    const concatErrors = R.pipe(R.mapObjIndexed(formatErrorForField), R.values, R.reject(R.isNil), R.join("\n"));

    return validateFail(concatErrors(results));
  }
};

const isObjectWithAllStringProperties = (pet: unknown): pet is Record<string, unknown> =>
  pet !== null && typeof pet === "object" && R.all((k) => typeof k === "string", Object.keys(pet));

const createCompositeValidator: (fieldValidators: FieldValidatorsByFieldName) => Validator = (fieldValidators) => {
  return (message) => {
    if (isObjectWithAllStringProperties(message)) {
      const allResults = R.mapObjIndexed(validateFieldOfMessage(fieldValidators), message);

      return coalesceResults(allResults);
    } else {
      return validateFail(`Attempted to validate non-object type: ${JSON.stringify(message)}`);
    }
  };
};

const decorateMessageError: (messageType: IMessageType<object>) => (failure: ValidateFailure) => ValidateFailure =
  (messageType) => (failure) =>
    R.mergeLeft(
      { errorMessage: `${messageType.typeName} validation failed.\n${indent(2)(failure.errorMessage)}` },
      failure
    );

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

    return messageValidator(message).mapLeft(decorateMessageError(messageType));
  };
};

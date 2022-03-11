import {} from "../../../gensrc/validate/validate";
import * as R from "ramda";
import { FieldInfo, IMessageType } from "@protobuf-ts/runtime";
import { FieldKind, ValidateResult, Validator, ValidatorFactory } from "./types";
import { fieldKindToFactory } from "./validator-registry";

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
        errorMessage: `Unknown field in object ${fieldName}`,
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
    const concatErrors = R.pipe(R.mapObjIndexed(formatErrorForField), R.values, R.reject(R.isNil), R.join("\n\n"));

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

export function validatorForMessage(
  messageType: IMessageType<object>,
  registry?: Record<FieldKind, ValidatorFactory>
): Validator {
  const getFieldValidator = (fieldInfo: FieldInfo) => {
    const validatorFactory = (registry || fieldKindToFactory)[fieldInfo.kind];

    return { [fieldInfo.name]: validatorFactory(fieldInfo) };
  };
  const createValidator = R.pipe(R.map(getFieldValidator), R.mergeAll, createCompositeValidator);
  return createValidator(messageType.fields);
}

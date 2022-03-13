import { FieldInfo, IMessageType, ScalarType } from "@protobuf-ts/runtime";
import { NetworkLoadBalancedEc2Service, NetworkLoadBalancedServiceRecordType } from "aws-cdk-lib/aws-ecs-patterns";
import R = require("ramda");
import { FieldRules } from "../../../gensrc/validate/validate";
import { ValidateOptions, ValidateResult, Validator, ValidatorFactory } from "./types";
import {
  alwaysFailFactory,
  alwaysFailValidator,
  alwaysSuccessValidator,
  composeValidators,
  getValidationRules,
  indent,
  nonNullishValidator,
  validateFail,
  validateSuccess,
} from "./utils";

type SubValidatorGetter = (fieldInfo: FieldInfo, fieldRules: FieldRules, options: ValidateOptions) => Validator;

const getBigIntValidator: SubValidatorGetter = (fieldInfo, fieldRules) => (message) => {
  if (typeof message !== "bigint") {
    return validateFail("Expected BigInt type");
  }

  return validateSuccess;
};

const getNumericValidator: SubValidatorGetter = (fieldInfo, fieldRules, options) =>
  R.pipe(BigInt, getBigIntValidator(fieldInfo, fieldRules, options));

const getLongValidator: SubValidatorGetter = () => () => {
  return validateSuccess;
};

const getBytesValidator: SubValidatorGetter = () => () => {
  return validateSuccess;
};

const getBoolValidator: SubValidatorGetter = () => () => {
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
    case ScalarType.FIXED32:
    case ScalarType.INT32:
    case ScalarType.UINT32:
    case ScalarType.SINT32:
    case ScalarType.SFIXED32:
      return getNumericValidator(fieldInfo, validateRules, options);

    case ScalarType.FIXED64:
    case ScalarType.SFIXED64:
    case ScalarType.INT64:
    case ScalarType.UINT64:
    case ScalarType.SINT64:
      return getLongValidator(fieldInfo, validateRules, options);

    case ScalarType.BYTES:
      return getBytesValidator(fieldInfo, validateRules, options);

    case ScalarType.BOOL:
      return getBoolValidator(fieldInfo, validateRules, options);
  }

  // TODO Log warning
  return alwaysSuccessValidator;
};

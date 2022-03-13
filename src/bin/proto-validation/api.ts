import { IMessageType } from "@protobuf-ts/runtime";
import { ValidateOptions, ValidateResult } from "./types";
import { fieldKindToFactory } from "./validator-registry";
import { validatorForMessage } from "./message-validator";

export const defaultValidatorOptions: () => ValidateOptions = () => {
  return {
    registry: fieldKindToFactory,
    mutableValidatorCache: new Map(),
  };
};

export const validateMessage: (message: object, messageType: IMessageType<object>) => ValidateResult = (
  message,
  messageType
) => {
  const validator = validatorForMessage(messageType, defaultValidatorOptions());

  return validator(message);
};

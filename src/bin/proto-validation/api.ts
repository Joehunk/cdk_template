import { IMessageType } from "@protobuf-ts/runtime";
import { ValidateOptions, ValidateResult } from "./types";
import { dumpValidatorCache } from "./utils";
import { fieldKindToFactory } from "./validator-registry";
import { validatorForMessage } from "./message-validator";

export const validateMessage: (message: object, messageType: IMessageType<object>) => ValidateResult = (
  message,
  messageType
) => {
  const options: ValidateOptions = {
    registry: fieldKindToFactory,
    validatorCache: new Map(),
  };
  const validator = validatorForMessage(messageType, options);

  console.log(dumpValidatorCache(options.validatorCache));
  return validator(message);
};

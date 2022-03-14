import { Left } from "purify-ts/Either";
import { RecursiveMessage } from "../../../gensrc/com/example/testservice";
import { validateMessage } from "../../bin/proto-validation";

const badValue: RecursiveMessage = {
  theNumber: 1,
  theString: "123",
  recursive: {
    theNumber: 1000,
    theString: "123",
    recursive: {
      theNumber: 1,
      theString: "a",
    },
  },
};

test("Reports multiple errors properly", () => {
  const result = validateMessage(badValue, RecursiveMessage);
  const expected = Left({
    success: false,
    errorMessage: `com.example.RecursiveMessage validation failed.
  recursive: com.example.RecursiveMessage validation failed.
    theNumber: must be less than 999
    recursive: com.example.RecursiveMessage validation failed.
      theString: length must be at least 2`,
  });

  expect(result).toMatchObject(expected);
});

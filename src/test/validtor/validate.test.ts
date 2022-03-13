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

  if (result.success) {
    fail("Expected failure");
  } else {
    expect(result.errorMessage).toEqual(`Validation failed:
recursive:
  theNumber: must be less than 999
  recursive:
    theString: length must be at least 2`);
  }
});

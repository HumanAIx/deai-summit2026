import { describe, expect, it } from "vitest";
import { extraQuestionsOf, NO_EXTRA_QUESTIONS } from "../../../lib/tickets/checkout-questions";
import type { PublicQuestion } from "../../../lib/tickets/schemas";

const select = (name: string, values: string[]) => ({ name, kind: "select", required: true, options: values.map((value) => ({ value, label: `L-${value}` })) });
const LIST: PublicQuestion[] = [
  { key: "job", id: "companyJob", scope: "holder", fields: [{ name: "company", kind: "text", maxLength: 120 }, { name: "jobTitle", kind: "text", maxLength: 120 }] },
  { key: "diet", id: "dietary", scope: "holder", fields: [select("dietary", ["none", "vegan", "other"]), { name: "dietaryOther", kind: "text", maxLength: 200 }] },
  { key: "shirt", id: "tshirt", scope: "holder", fields: [select("tshirt", ["S", "M", "XL"])] },
  { key: "source", id: "heardFrom", scope: "order", fields: [select("value", ["social", "other"]), { name: "text", kind: "text", maxLength: 200 }] },
];

describe("extraQuestionsOf", () => {
  it("turns ep-api's question list into what the forms need, keeping its options and labels", () => {
    const questions = extraQuestionsOf({ questionList: LIST });
    expect(questions.companyJob).toBe(true);
    expect(questions.dietary).toEqual([{ value: "none", label: "L-none" }, { value: "vegan", label: "L-vegan" }, { value: "other", label: "L-other" }]);
    expect(questions.tshirt?.map((option) => option.value)).toEqual(["S", "M", "XL"]);
    expect(questions.heardFrom?.map((option) => option.value)).toEqual(["social", "other"]);
  });

  it("asks nothing extra for a site on an older ep-api (no list), an empty list or a malformed one", () => {
    expect(extraQuestionsOf({ questionList: undefined })).toEqual(NO_EXTRA_QUESTIONS);
    expect(extraQuestionsOf({ questionList: [] })).toEqual(NO_EXTRA_QUESTIONS);
    expect(extraQuestionsOf({ questionList: "nope" as unknown as PublicQuestion[] })).toEqual(NO_EXTRA_QUESTIONS);
  });

  it("asks only the questions that are listed", () => {
    expect(extraQuestionsOf({ questionList: [LIST[2]] as PublicQuestion[] })).toEqual({ ...NO_EXTRA_QUESTIONS, tshirt: expect.any(Array) });
  });

  it("ignores an unknown question and leaves out an option value this renderer cannot send (never a refused order)", () => {
    const questions = extraQuestionsOf({
      questionList: [
        { key: "x", id: "favouriteColour", scope: "holder", fields: [select("colour", ["red"])] },
        { key: "shirt", id: "tshirt", scope: "holder", fields: [select("tshirt", ["M", "XXXXL"])] },
        { key: "diet", id: "dietary", scope: "holder", fields: [select("dietary", ["pescatarian"])] },
      ],
    });
    expect(questions.tshirt?.map((option) => option.value)).toEqual(["M"]);
    expect(questions.dietary).toBeNull();
    expect(questions.companyJob).toBe(false);
  });

  it("a select question whose options are missing or not an array is not asked", () => {
    const questions = extraQuestionsOf({ questionList: [{ key: "shirt", id: "tshirt", scope: "holder", fields: [{ name: "tshirt", kind: "select" }] }] });
    expect(questions.tshirt).toBeNull();
  });
});

import { DIETARY_VALUES, HEARD_FROM_VALUES, TSHIRT_VALUES, type PublicQuestion } from "./schemas";

/** One choice of a bounded-answer question (rule 39: a data array of `{ value, label }`, never hand-written options). */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * The extra checkout questions the site asks, as the form needs them. `null` = not asked. Select questions carry
 * their options: `companyJob` has none (two optional text boxes per holder).
 */
export interface ExtraQuestions {
  companyJob: boolean;
  dietary: SelectOption[] | null;
  tshirt: SelectOption[] | null;
  heardFrom: SelectOption[] | null;
}

export const NO_EXTRA_QUESTIONS: ExtraQuestions = { companyJob: false, dietary: null, tshirt: null, heardFrom: null };

/** The options of one select field of a question, limited to the values our order schema (= ep-api's) accepts. */
function optionsOf({ question, field, allowed }: { question: PublicQuestion; field: string; allowed: readonly string[] }): SelectOption[] | null {
  const found = (Array.isArray(question.fields) ? question.fields : []).find((candidate) => candidate.name === field && candidate.kind === "select");
  const list = Array.isArray(found?.options) ? found.options : [];
  // A value ep-api adds later that this renderer does not know could not be sent anyway: it is left out, never a failed order.
  const known = list.filter((option) => allowed.includes(option.value));
  return known.length > 0 ? known : null;
}

/**
 * `checkout.questionList` of ep-api → the questions to render (rules 25 / 38: tolerant — an unknown question, field or
 * shape is ignored, and a site on an older ep-api without the list asks nothing extra).
 */
export function extraQuestionsOf({ questionList }: { questionList: readonly PublicQuestion[] | undefined }): ExtraQuestions {
  const list = Array.isArray(questionList) ? questionList : [];
  const byId = (id: string): PublicQuestion | undefined => list.find((question) => question.id === id);
  const dietary = byId("dietary");
  const tshirt = byId("tshirt");
  const heardFrom = byId("heardFrom");
  return {
    companyJob: byId("companyJob") !== undefined,
    dietary: dietary ? optionsOf({ question: dietary, field: "dietary", allowed: DIETARY_VALUES }) : null,
    tshirt: tshirt ? optionsOf({ question: tshirt, field: "tshirt", allowed: TSHIRT_VALUES }) : null,
    heardFrom: heardFrom ? optionsOf({ question: heardFrom, field: "value", allowed: HEARD_FROM_VALUES }) : null,
  };
}

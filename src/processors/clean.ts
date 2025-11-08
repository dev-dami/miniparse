import { PipelineComponent } from "../core/pipeline";
import { IntentResult } from "../types";

export const clean: PipelineComponent = (input: IntentResult): IntentResult => {
  input.tokens = input.tokens.filter((token) => token.type !== "punct");
  return input;
};

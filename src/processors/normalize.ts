import { PipelineComponent } from "../core/pipeline";
import { IntentResult } from "../types";

export const normalize: PipelineComponent = (
  input: IntentResult,
): IntentResult => {
  input.tokens.forEach((token) => {
    if (token.type === "word") {
      token.value = token.value.toLowerCase();
    } else if (token.type === "number") {
      token.value = parseFloat(token.value).toString();
    }
  });

  input.entities.forEach((entity) => {
    entity.value = entity.value.toLowerCase();
  });

  return input;
};

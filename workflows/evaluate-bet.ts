import { getWorkflowMetadata, sleep } from "workflow";

import {
  assembleResearchRecordStep,
  claimEvaluationStep,
  failEvaluationStep,
  judgmentStep,
  loadEvaluationInputStep,
  panelModelsStep,
  publishStep,
  researchStep,
  synthesisStep,
} from "./evaluate-bet-steps";

export async function evaluateBetWorkflow(betId: string) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  try {
    let claim = await claimEvaluationStep(betId, workflowRunId);
    while (claim === "WAIT") {
      await sleep("1h");
      claim = await claimEvaluationStep(betId, workflowRunId);
    }
    if (claim === "ALREADY_HANDLED") return { verdictKey: "ALREADY_HANDLED" };
    const input = await loadEvaluationInputStep(betId);
    const panel = await panelModelsStep();
    const research = await Promise.all(panel.map((member) => researchStep(input, member)));
    const { record, recordHash, positionMap } = await assembleResearchRecordStep(input, research);
    const votes = await Promise.all(
      panel.map((member) => judgmentStep(input, record, recordHash, positionMap, member)),
    );
    const verdictKeys = votes.map((vote) => vote.voteKey);
    const majorityKey =
      verdictKeys.find((key) => verdictKeys.filter((other) => other === key).length >= 2) ??
      "INDETERMINATE";
    const synthesis = await synthesisStep(input, majorityKey, research, votes);
    return publishStep(input, votes, synthesis);
  } catch (error) {
    await failEvaluationStep(betId, error);
    return { verdictKey: "EVALUATION_FAILED" };
  }
}

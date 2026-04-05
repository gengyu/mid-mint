import type { ContentBrief, ParsedSource } from "@/modules/domain/types";
import { buildContentBrief } from "./brief-utils";

export class BriefGenerator {
  async run(
    input: ParsedSource & {
      targetAudience: string;
      contentGoal: string;
      preferredStyle: string;
    }
  ): Promise<ContentBrief> {
    return buildContentBrief(input, input.targetAudience, input.contentGoal, input.preferredStyle);
  }
}

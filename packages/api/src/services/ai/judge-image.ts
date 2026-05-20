import { generateObject } from "ai";
import { z } from "zod";

import { foundryModel } from "./client";

const SYSTEM_PROMPT = `You judge whether a team scavenger hunt photo satisfies an assigned task.

Rules:
- The image must contain people.
- The image must reasonably match the requested pose or action.
- Be lenient if the intent is clear.
- Reject if the image is unrelated, blank, unsafe, or does not contain people.
- Do not identify any specific person.
- Do not describe sensitive personal attributes (age, ethnicity, health, etc).
- Only judge whether the image satisfies the task.

Respond with JSON: { passed: boolean, confidence: number from 0 to 1, feedback: short string }`;

const JudgementSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1),
  feedback: z.string().min(1).max(300),
});

export type ImageJudgement = z.infer<typeof JudgementSchema> & { rawResponse?: string };

export type JudgeImageInput = {
  taskPrompt: string;
  imageUrl: string;
};

export async function judgeImage(input: JudgeImageInput): Promise<ImageJudgement> {
  const result = await generateObject({
    model: foundryModel(),
    schema: JudgementSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Task: "${input.taskPrompt}"\n\nDoes the attached image satisfy the task?`,
          },
          {
            type: "image",
            image: new URL(input.imageUrl),
          },
        ],
      },
    ],
  });

  return {
    passed: result.object.passed,
    confidence: result.object.confidence,
    feedback: result.object.feedback,
    rawResponse: JSON.stringify(result.object),
  };
}

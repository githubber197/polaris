import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST() {
    const response = await generateText({
        model: openai('openai/gpt-oss-120b'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.', telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
        },
    });

    return Response.json({ response });
};
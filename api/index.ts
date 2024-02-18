import * as fal from "@fal-ai/serverless-client";
import { z } from "zod";

type SubscribeResult = {
  images: { url: string }[];
};

const schema = z.object({
  prompt: z.string(),
});

Bun.serve({
  hostname: "::",
  port: process.env.PORT || 3001,
  fetch: async (request: Request) => {
    try {
      let prompt = "";

      if (request.method === "GET") {
        const { searchParams } = new URL(request.url);

        prompt = searchParams.get("prompt") as string;

        if (!prompt)
          return new Response(
            "Welcome to the Image Generation API!\n\nPlease provide a prompt in the query string.\n\nFor example, https://your-api.com/?prompt=Anthropomorphic%20cat%20dressed%20as%20a%20pilot"
          );
      } else {
        const body = (await request.json()) as any;

        prompt = body.prompt;

        if (!prompt)
          return new Response('Pass { "prompt": "Your prompt here" } in body');
      }

      // Validate inputs against schema
      schema.parse({ prompt });

      console.log(`🎨 Generating image for prompt: ${prompt}`);

      const result = (await fal.subscribe("fal-ai/stable-cascade", {
        input: {
          prompt: prompt,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      })) as SubscribeResult;

      const imageUrl = result.images[0].url;
      console.log(imageUrl);

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error: any) {
      console.error(error);

      return new Response(`Something went wrong: ${error.message || "?"}`, {
        status: 500,
      });
    }
  },
});

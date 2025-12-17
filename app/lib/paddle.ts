import type { Paddle } from "@paddle/paddle-js";

let paddleClient: Paddle | null = null;

type PaddleInitOptions = {
  token: string;
};

export async function getBillingClient({ token }: PaddleInitOptions): Promise<Paddle> {
  if (paddleClient) return paddleClient;
  if (typeof window === "undefined") {
    throw new Error("Paddle client is only available in the browser");
  }
  const { initializePaddle } = await import("@paddle/paddle-js");
  const client = await initializePaddle({ token });
  if (!client) {
    throw new Error("Failed to initialize Paddle");
  }
  paddleClient = client;
  return client;
}

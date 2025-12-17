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
  const lib = await import("@paddle/paddle-js");
  paddleClient = lib.Paddle.initialize({ token });
  return paddleClient;
}

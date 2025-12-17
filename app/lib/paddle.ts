import type { Paddle } from "@paddle/paddle-js";

let paddleClient: Paddle | null = null;

type PaddleInitOptions = {
  token: string;
  environment?: "sandbox" | "production";
};

export async function getBillingClient({ token, environment }: PaddleInitOptions): Promise<Paddle> {
  // If environment changes, re-init to match the backend status
  if (paddleClient && typeof window !== "undefined" && (window as any).__paddleEnv === environment) {
    return paddleClient;
  }
  if (typeof window === "undefined") {
    throw new Error("Paddle client is only available in the browser");
  }
  const { initializePaddle } = await import("@paddle/paddle-js");
  const client = await initializePaddle({ token, environment });
  if (!client) {
    throw new Error("Failed to initialize Paddle");
  }
  paddleClient = client;
  (window as any).__paddleEnv = environment;
  return client;
}

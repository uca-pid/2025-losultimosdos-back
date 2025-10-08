export const verifyWebhook = async (_req: any) => ({
  type: "user.created",
  data: { id: "u_123" },
});

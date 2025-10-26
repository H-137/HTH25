export const getGCPCredentials = () => {
  if (process.env.GCP_PRIVATE_KEY && process.env.GCP_SERVICE_ACCOUNT_EMAIL) {
    // Vercel or local using service account
    return {
      credentials: {
        client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GCP_PROJECT_ID,
    };
  }
  // Local development using gcloud CLI
  return {};
};

export const getEECredentials = () => {
  if (!process.env.EE_SERVICE_ACCOUNT_KEY) return null;
  const serviceAccount = JSON.parse(process.env.EE_SERVICE_ACCOUNT_KEY);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  return serviceAccount;
};

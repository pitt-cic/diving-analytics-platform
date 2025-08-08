/**
 * Configuration for the DiveTracker application
 */
export const config = {
  // API Configuration
  apiEndpoint:
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_ENDPOINT ||
    (() => {
      throw new Error(
        "REACT_APP_API_URL or REACT_APP_API_ENDPOINT must be set in environment variables"
      );
    })(),

  // AWS Configuration
  aws: {
    region: process.env.REACT_APP_AWS_REGION || "us-east-1",
    userPoolId: process.env.REACT_APP_USER_POOL_ID || "us-east-1_example",
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || "example",
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    mediaBucket:
      process.env.REACT_APP_INPUT_BUCKET_NAME ||
      process.env.REACT_APP_MEDIA_BUCKET ||
      (() => {
        throw new Error(
          "REACT_APP_INPUT_BUCKET_NAME or REACT_APP_MEDIA_BUCKET must be set in environment variables"
        );
      })(),
  },
};

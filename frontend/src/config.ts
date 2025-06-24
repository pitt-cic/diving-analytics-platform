/**
 * Configuration for the DiveGenie application
 */
export const config = {
  // API Configuration
  apiEndpoint:
    process.env.REACT_APP_API_ENDPOINT ||
    (() => {
      throw new Error(
        "REACT_APP_API_ENDPOINT must be set in environment variables"
      );
    })(),

  // AWS Configuration
  aws: {
    region: process.env.REACT_APP_AWS_REGION || "us-east-1",
    userPoolId: process.env.REACT_APP_USER_POOL_ID || "us-east-1_example",
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || "example",
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    graphqlApiUrl:
      process.env.REACT_APP_GRAPHQL_API_URL || "https://example.com/graphql",
    graphqlApiKey: process.env.REACT_APP_GRAPHQL_API_KEY || "example-key",
    mediaBucket: process.env.REACT_APP_MEDIA_BUCKET || "divegenie-media-bucket",
  },

  // Natural Language Processing Configuration
  nlp: {
    confidenceThreshold: 0.7,
    speechRecognition: {
      enabled: true,
      continuous: false,
      interimResults: true,
      lang: "en-US",
    },
  },

  // Feature Flags
  features: {
    voiceInput: process.env.REACT_APP_FEATURE_VOICE_INPUT === "true",
    diveMeetsIntegration:
      process.env.REACT_APP_FEATURE_DIVEMEETS_INTEGRATION === "true",
    analyticsExport: process.env.REACT_APP_FEATURE_ANALYTICS_EXPORT === "true",
    useMockData: process.env.REACT_APP_USE_MOCK_DATA === "true",
  },
};

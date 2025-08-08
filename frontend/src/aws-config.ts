import { Amplify } from "aws-amplify";
import { config } from "./config";

// Configure Amplify with the values from config
export const configureAmplify = () => {
  const amplifyConfig: any = {
    Auth: {
      region: config.aws.region,
      userPoolId: config.aws.userPoolId,
      userPoolWebClientId: config.aws.userPoolWebClientId,
      mandatorySignIn: true,
    },
    API: {
      endpoints: [
        {
          name: "api",
          endpoint: config.apiEndpoint,
          custom_header: async () => {
            try {
              const session = await Amplify.Auth.currentSession();
              return {
                Authorization: `Bearer ${session.getIdToken().getJwtToken()}`,
              };
            } catch (e) {
              return {};
            }
          },
        },
      ],
    },
    Storage: {
      AWSS3: {
        bucket: config.aws.mediaBucket,
        region: config.aws.region,
        level: "public",
        customPrefix: {
          public: "",
        },
      },
    },
  };

  // Add identity pool configuration if available
  if (config.aws.identityPoolId) {
    amplifyConfig.Auth.identityPoolId = config.aws.identityPoolId;
  }

  // Initialize Amplify with the configuration
  Amplify.configure(amplifyConfig);

  console.log("Amplify configured with region:", config.aws.region);
};

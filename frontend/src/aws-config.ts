import { Amplify } from 'aws-amplify';
import { config } from './config';

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
          name: 'api',
          endpoint: config.apiEndpoint,
          custom_header: async () => {
            try {
              const session = await Amplify.Auth.currentSession();
              return { 
                Authorization: `Bearer ${session.getIdToken().getJwtToken()}` 
              };
            } catch (e) {
              return {};
            }
          },
        },
      ],
      graphql_headers: async () => {
        try {
          const session = await Amplify.Auth.currentSession();
          return {
            Authorization: session.getIdToken().getJwtToken(),
          };
        } catch (e) {
          // If not authenticated, use API key for public access
          return {
            'x-api-key': config.aws.graphqlApiKey,
          };
        }
      },
      graphql_endpoint: config.aws.graphqlApiUrl,
    },
    Storage: {
      AWSS3: {
        bucket: config.aws.mediaBucket,
        region: config.aws.region,
      },
    },
  };

  // Add identity pool configuration if available
  if (config.aws.identityPoolId) {
    amplifyConfig.Auth.identityPoolId = config.aws.identityPoolId;
  }

  // Initialize Amplify with the configuration
  Amplify.configure(amplifyConfig);
  
  console.log('Amplify configured with region:', config.aws.region);
  
  // If using mock data, log a notice
  if (config.features.useMockData) {
    console.log('Using mock data - no actual AWS calls will be made');
  }
};
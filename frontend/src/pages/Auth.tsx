import React from 'react';
import { Authenticator, useTheme, View, Text, Heading, Button, TextField } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const navigate = useNavigate();

  // Custom form components with all required fields
  const formFields = {
    signUp: {
      email: {
        order: 1,
        isRequired: true,
      },
      given_name: {
        label: 'First Name',
        placeholder: 'Enter your first name',
        order: 2,
        isRequired: true,
      },
      family_name: {
        label: 'Last Name',
        placeholder: 'Enter your last name',
        order: 3,
        isRequired: true,
      },
      password: {
        order: 4,
        isRequired: true,
      },
      confirm_password: {
        order: 5,
        isRequired: true,
      },
    },
  };

  // Custom components for Authenticator
  const components = {
    Header() {
      const { tokens } = useTheme();
      return (
        <View textAlign="center" padding={tokens.space.large}>
          <Heading level={3} color="primary.900">DiveGenie</Heading>
          <Text color="neutral.800">Natural language dive performance tracking</Text>
        </View>
      );
    },
    Footer() {
      const { tokens } = useTheme();
      return (
        <View textAlign="center" padding={tokens.space.medium}>
          <Text color="neutral.600">&copy; 2025 DiveGenie</Text>
        </View>
      );
    },
  };

  return (
    <div className="flex min-h-screen bg-primary-50">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <h2 className="mt-6 text-3xl font-extrabold text-primary-900">DiveGenie</h2>
            <p className="mt-2 text-sm text-gray-600">
              Natural language dive performance tracking
            </p>
          </div>

          <div className="mt-8">
            <Authenticator
              initialState="signIn"
              formFields={formFields}
              components={components}
              services={{
                async handleSignIn() {
                  navigate('/');
                },
              }}
            >
              {({ signOut, user }) => (
                <div>
                  <p>Welcome {user?.username}</p>
                  <button onClick={signOut} className="btn-primary mt-4">Sign out</button>
                </div>
              )}
            </Authenticator>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full object-cover bg-primary-700 flex items-center justify-center">
          <div className="text-center px-8">
            <h1 className="text-4xl font-bold text-white mb-6">
              Dive Performance Tracking Evolved
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Use natural language to log dives, track performance, and get coaching feedback.
            </p>
            <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg">
              <p className="text-gray-600 text-lg italic">
                "Log a forward 2.5 somersaults pike with score 8.5"
              </p>
              <div className="mt-4 bg-primary-50 p-3 rounded-md text-primary-700">
                <p>Logged 105B (Forward 2.5 Somersaults Pike) with score 8.5</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
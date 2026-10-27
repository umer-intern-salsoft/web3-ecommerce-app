import { useState } from 'react';
import { loginUser, signupUser } from '../services/api';
import type { User } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let data;
      if (isSignup) {
        data = await signupUser(username, password);
      } else {
        data = await loginUser(username, password);
      }
      localStorage.setItem('user', JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-4">
      <div className="bg-[#131b2e] border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          {isSignup ? 'Sign up to track your Web3 orders.' : 'Log in to access your storefront & purchases.'}
        </p>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm text-purple-400 hover:underline"
          >
            {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
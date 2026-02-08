import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { Clock, Mail, Lock, User, Link as LinkIcon, AlertCircle, CheckCircle } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    booking_slug: '',
    specialty: ''
  });

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      booking_slug: generateSlug(name)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate slug
    if (formData.booking_slug.length < 3) {
      setError('Booking link must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        booking_slug: formData.booking_slug,
        specialty: formData.specialty || null
      });

      const { token, master } = response.data;
      
      // Store auth data
      authAPI.setToken(token);
      authAPI.setMaster(master);
      
      // Redirect to dashboard
      navigate('/master/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <Clock className="w-10 h-10 text-purple-600" />
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Slotta
            </span>
          </Link>
          <p className="text-gray-600 mt-2">Create your professional account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="pl-10"
                    placeholder="Sophia Brown"
                    required
                    data-testid="register-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="you@example.com"
                    required
                    data-testid="register-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specialty (optional)</Label>
                <Input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g., Hair Stylist, Makeup Artist"
                  data-testid="register-specialty"
                />
              </div>

              <div className="space-y-2">
                <Label>Your Booking Link</Label>
                <div className="relative">
                  <LinkIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <div className="flex items-center">
                    <span className="pl-10 pr-1 py-3 bg-gray-50 border border-r-0 rounded-l-lg text-gray-500 text-sm">
                      slotta.app/
                    </span>
                    <Input
                      type="text"
                      value={formData.booking_slug}
                      onChange={(e) => setFormData({ ...formData, booking_slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                      className="flex-1 rounded-l-none border-l-0"
                      placeholder="yourname"
                      required
                      data-testid="register-slug"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">This is the link your clients will use to book with you</p>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    data-testid="register-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                    data-testid="register-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3"
                disabled={loading}
                data-testid="register-submit"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Free to start • No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

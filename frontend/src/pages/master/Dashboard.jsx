import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { bookingsAPI, analyticsAPI, authAPI, stripeAPI } from '@/lib/api';
import { 
  LayoutDashboard, Calendar, Briefcase, Users, Wallet, 
  Settings, TrendingUp, Clock, Shield, AlertCircle, LogOut
} from 'lucide-react';

const Sidebar = ({ active, subscriptionActive }) => {
  const navigate = useNavigate();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/master/dashboard' },
    { id: 'bookings', label: 'Bookings', icon: Briefcase, path: '/master/bookings' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/master/calendar', premium: true },
    { id: 'services', label: 'Services', icon: Shield, path: '/master/services', premium: true },
    { id: 'clients', label: 'Clients', icon: Users, path: '/master/clients' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/master/wallet' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/master/analytics', premium: true },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/master/settings' },
  ];

  return (
    <div className="w-64 bg-white border-r min-h-screen p-6">
      <div className="flex items-center space-x-2 mb-8">
        <Clock className="w-8 h-8 text-purple-600" />
        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Slotta
        </span>
      </div>
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isLocked = item.premium && !subscriptionActive;
          return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            disabled={isLocked}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              active === item.id
                ? 'bg-purple-50 text-purple-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            } ${isLocked ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
            data-testid={`nav-${item.id}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {isLocked && (
              <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Pro</span>
            )}
          </button>
        );
        })}
      </nav>
      
      {/* Logout button */}
      <div className="mt-8 pt-8 border-t">
        <button
          onClick={() => authAPI.logout()}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

const MasterLayout = ({ children, active, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const master = authAPI.getMaster();
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');

  const premiumPages = new Set(['calendar', 'services', 'analytics']);
  const isPremiumPage = premiumPages.has(active);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setSubscriptionLoading(true);
        setSubscriptionError('');
        const response = await stripeAPI.subscriptionStatus();
        setSubscriptionActive(!!response.data?.active);
      } catch (err) {
        setSubscriptionError('Unable to verify subscription status.');
      } finally {
        setSubscriptionLoading(false);
      }
    };
    if (master?.id) {
      loadStatus();
    }
  }, [master?.id, location.pathname]);

  const handleSubscribe = async () => {
    try {
      const response = await stripeAPI.createCheckoutSession();
      const url = response.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      alert('Unable to start checkout. Please try again.');
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar active={active} subscriptionActive={subscriptionActive} />
      <div className="flex-1">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" data-testid="page-title">{title}</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="success">Active</Badge>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {master?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div>
                <div className="text-sm font-semibold">{master?.name || 'User'}</div>
                <div className="text-xs text-gray-500">{master?.specialty || 'Professional'}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">
          {subscriptionError && (
            <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-6">
              <AlertCircle className="w-5 h-5" />
              <span>{subscriptionError}</span>
            </div>
          )}
          {isPremiumPage && !subscriptionActive && !subscriptionLoading ? (
            <Card className="max-w-2xl">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">Upgrade Required</h2>
                <p className="text-gray-600 mb-4">
                  This feature is part of the Pro plan. Subscribe to unlock calendar sync,
                  analytics, and advanced service controls.
                </p>
                <Button onClick={handleSubscribe}>Subscribe for €12/month</Button>
              </CardContent>
            </Card>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const master = authAPI.getMaster();
  const masterId = master?.id;
  
  const [stats, setStats] = useState({
    todayBookings: 0,
    timeProtected: 0,
    noShowsAvoided: 0,
    walletBalance: 0
  });
  const [todayBookings, setTodayBookings] = useState([]);

  useEffect(() => {
    if (masterId) {
      loadDashboardData();
      loadSubscriptionStatus();
    }
  }, [masterId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load bookings
      const bookingsResponse = await bookingsAPI.getByMaster(masterId);
      const allBookings = bookingsResponse.data || [];
      
      // Filter today's bookings
      const today = new Date().toISOString().split('T')[0];
      const todayOnly = allBookings.filter(b => 
        b.booking_date && b.booking_date.startsWith(today)
      );
      
      // Load analytics
      const analyticsResponse = await analyticsAPI.getMasterAnalytics(masterId);
      const analytics = analyticsResponse.data;
      
      setStats({
        todayBookings: todayOnly.length,
        timeProtected: analytics.time_protected_eur || 0,
        noShowsAvoided: analytics.no_shows || 0,
        walletBalance: analytics.wallet_balance || 0
      });
      
      setTodayBookings(todayOnly);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError('Unable to load dashboard data. Please refresh.');
      // Set empty data on error
      setStats({
        todayBookings: 0,
        timeProtected: 0,
        noShowsAvoided: 0,
        walletBalance: 0
      });
      setTodayBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError('');
      const response = await stripeAPI.subscriptionStatus();
      setSubscriptionActive(!!response.data?.active);
    } catch (err) {
      console.error('Failed to load subscription status:', err);
      setSubscriptionError('Unable to verify subscription status.');
      setSubscriptionActive(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const response = await stripeAPI.createCheckoutSession();
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        alert('Unable to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      alert('Unable to start checkout. Please try again.');
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await stripeAPI.createPortalSession();
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        alert('Unable to open billing portal. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create billing portal session:', err);
      alert('Unable to open billing portal. Please try again.');
    }
  };

  const statusColors = {
    confirmed: 'success',
    pending: 'warning',
    'high-risk': 'danger',
    completed: 'info'
  };

  return (
    <MasterLayout active="dashboard" title="Dashboard">
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-6">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="mb-8">
        <CardContent className="p-6 flex items-center justify-between gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Subscription</div>
            <div className="text-xl font-semibold">
              {subscriptionLoading ? 'Checking status...' : subscriptionActive ? 'Active' : 'Inactive'}
            </div>
            {subscriptionError && (
              <div className="text-sm text-yellow-700 mt-1">{subscriptionError}</div>
            )}
            {!subscriptionActive && !subscriptionLoading && (
              <div className="text-sm text-gray-600 mt-2">
                Upgrade to unlock full access to Slotta features.
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {!subscriptionActive && (
              <Button onClick={handleSubscribe} data-testid="subscribe-btn">
                Subscribe for €12/month
              </Button>
            )}
            {subscriptionActive && (
              <Button variant="outline" onClick={handleManageBilling} data-testid="manage-billing-btn">
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" data-testid="stat-today-bookings">
              {loading ? '...' : stats.todayBookings}
            </div>
            <div className="text-sm text-gray-600 mb-2">Today's Bookings</div>
            <div className="text-xs text-gray-500">
              {loading ? 'Loading...' : '+2 from yesterday'}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" data-testid="stat-protected">
              {loading ? '...' : `€${stats.timeProtected}`}
            </div>
            <div className="text-sm text-gray-600 mb-2">Time Protected</div>
            <div className="text-xs text-gray-500">This month</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" data-testid="stat-no-shows">
              {loading ? '...' : stats.noShowsAvoided}
            </div>
            <div className="text-sm text-gray-600 mb-2">No-Shows Avoided</div>
            <div className="text-xs text-gray-500">Last 30 days</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" data-testid="stat-wallet">
              {loading ? '...' : `€${stats.walletBalance}`}
            </div>
            <div className="text-sm text-gray-600 mb-2">Wallet Balance</div>
            <div className="text-xs text-gray-500">Available for payout</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Bookings */}
      <Card className="mb-8">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Today's Bookings</h3>
            <button 
              onClick={() => navigate('/master/bookings')}
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View All
            </button>
          </div>
        </div>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading bookings...</div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No bookings today</div>
          ) : (
            <div className="space-y-4">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => navigate(`/master/bookings/${booking.id}`)}
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-purple-600">
                      {booking.client_id ? booking.client_id.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="font-semibold">Client #{booking.client_id}</div>
                      <div className="text-sm text-gray-500">Service #{booking.service_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold">
                        {new Date(booking.booking_date).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        €{booking.slotta_amount || 0} protected
                      </div>
                    </div>
                    <Badge variant={statusColors[booking.status] || 'default'}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card
          className={`p-6 cursor-pointer hover:shadow-lg transition ${!subscriptionActive ? 'opacity-60 pointer-events-none' : ''}`}
          onClick={() => navigate('/master/calendar')}
        >
          <Calendar className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold mb-2">Manage Calendar</h3>
          <p className="text-sm text-gray-600">Block time, set availability</p>
        </Card>
        <Card
          className={`p-6 cursor-pointer hover:shadow-lg transition ${!subscriptionActive ? 'opacity-60 pointer-events-none' : ''}`}
          onClick={() => navigate('/master/services')}
        >
          <Shield className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold mb-2">Adjust Slotta</h3>
          <p className="text-sm text-gray-600">Update service protection</p>
        </Card>
        <Card
          className={`p-6 cursor-pointer hover:shadow-lg transition ${!subscriptionActive ? 'opacity-60 pointer-events-none' : ''}`}
          onClick={() => navigate('/master/analytics')}
        >
          <TrendingUp className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold mb-2">View Analytics</h3>
          <p className="text-sm text-gray-600">See your protection stats</p>
        </Card>
      </div>
    </MasterLayout>
  );
};

export default Dashboard;
export { MasterLayout };

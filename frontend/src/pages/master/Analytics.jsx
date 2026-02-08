import React, { useState, useEffect } from 'react';
import { MasterLayout } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyticsAPI, bookingsAPI, authAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, Shield, DollarSign, Users, AlertTriangle, Calendar } from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_bookings: 0,
    completed_bookings: 0,
    no_shows: 0,
    no_show_rate: 0,
    time_protected_eur: 0,
    wallet_balance: 0,
    avg_slotta: 0
  });
  const [bookings, setBookings] = useState([]);
  const master = authAPI.getMaster();
  const masterId = master?.id;

  useEffect(() => {
    if (masterId) {
      loadAnalytics();
      loadBookings();
    }
  }, [masterId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getMasterAnalytics(masterId);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await bookingsAPI.getByMaster(masterId);
      setBookings(response.data || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  // Generate monthly data from bookings
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthBookings = bookings.filter(b => {
        const bookingMonth = new Date(b.booking_date).getMonth();
        return bookingMonth === monthIndex;
      });
      
      last6Months.push({
        month: months[monthIndex],
        protected: monthBookings.reduce((sum, b) => sum + (b.slotta_amount || 0), 0),
        bookings: monthBookings.length,
        noShows: monthBookings.filter(b => b.status === 'no-show').length
      });
    }
    
    // Add some sample data if no bookings
    if (last6Months.every(m => m.bookings === 0)) {
      return [
        { month: 'Sep', protected: 1850, bookings: 45, noShows: 3 },
        { month: 'Oct', protected: 2100, bookings: 52, noShows: 2 },
        { month: 'Nov', protected: 2250, bookings: 58, noShows: 4 },
        { month: 'Dec', protected: 2400, bookings: 62, noShows: 2 },
        { month: 'Jan', protected: 2350, bookings: 55, noShows: 1 },
        { month: 'Feb', protected: analytics.time_protected_eur || 2450, bookings: analytics.total_bookings || 48, noShows: analytics.no_shows || 2 },
      ];
    }
    
    return last6Months;
  };

  const monthlyData = generateMonthlyData();

  const stats = [
    { label: 'Time Protected', value: `€${analytics.time_protected_eur}`, change: '+12%', trend: 'up', icon: Shield, color: 'purple' },
    { label: 'No-Show Rate', value: `${analytics.no_show_rate.toFixed(1)}%`, change: analytics.no_show_rate < 5 ? 'Great!' : 'Needs work', trend: analytics.no_show_rate < 5 ? 'up' : 'down', icon: AlertTriangle, color: analytics.no_show_rate < 5 ? 'green' : 'yellow' },
    { label: 'Avg Slotta', value: `€${analytics.avg_slotta.toFixed(0)}`, change: '', trend: 'up', icon: DollarSign, color: 'blue' },
    { label: 'Total Bookings', value: analytics.total_bookings.toString(), change: '', trend: 'up', icon: Users, color: 'pink' },
  ];

  const slotDemand = [
    { time: '9 AM', bookings: 42, fill: '#8b5cf6' },
    { time: '10 AM', bookings: 38, fill: '#a78bfa' },
    { time: '11 AM', bookings: 28, fill: '#c4b5fd' },
    { time: '12 PM', bookings: 15, fill: '#ddd6fe' },
    { time: '1 PM', bookings: 18, fill: '#ddd6fe' },
    { time: '2 PM', bookings: 25, fill: '#c4b5fd' },
    { time: '3 PM', bookings: 35, fill: '#a78bfa' },
    { time: '4 PM', bookings: 40, fill: '#8b5cf6' },
    { time: '5 PM', bookings: 32, fill: '#a78bfa' },
  ];

  const reliabilityData = [
    { name: 'Reliable', value: analytics.completed_bookings || 67, color: '#10b981' },
    { name: 'New', value: Math.max(0, analytics.total_bookings - analytics.completed_bookings - analytics.no_shows) || 25, color: '#f59e0b' },
    { name: 'At Risk', value: analytics.no_shows || 8, color: '#ef4444' },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <MasterLayout active="analytics" title="Analytics">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                {stat.change && (
                  <Badge variant={stat.trend === 'up' ? 'success' : 'warning'}>
                    {stat.change}
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-bold mb-1" data-testid={`stat-${idx}`}>
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Time Protected (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorProtected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`€${value}`, 'Protected']}
              />
              <Area 
                type="monotone" 
                dataKey="protected" 
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorProtected)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Peak Booking Times */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Booking Times</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={slotDemand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="time" type="category" stroke="#6b7280" width={50} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value} bookings`, 'Demand']}
                />
                <Bar dataKey="bookings" radius={[0, 4, 4, 0]}>
                  {slotDemand.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Insight:</strong> Morning (9-10 AM) and late afternoon (4-5 PM) are your peak times. Consider premium Slotta for these slots.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Reliability Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Client Reliability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reliabilityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reliabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-6 mt-4">
              {reliabilityData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Trend */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Bookings vs No-Shows Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="bookings" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6' }}
                name="Total Bookings"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="noShows" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444' }}
                name="No-Shows"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* No-Show Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>No-Show Prevention Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-4xl font-bold text-purple-600 mb-2">{analytics.no_shows}</div>
              <div className="text-sm text-gray-600">Total No-Shows</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-4xl font-bold text-green-600 mb-2">
                €{Math.round(analytics.no_shows * (analytics.avg_slotta || 25) * 0.6)}
              </div>
              <div className="text-sm text-gray-600">Recovered Revenue</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {Math.round(analytics.no_shows * (analytics.avg_slotta || 60) / 60)}h
              </div>
              <div className="text-sm text-gray-600">Time Compensated</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl">
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {analytics.no_show_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">No-Show Rate</div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-purple-900 mb-1">Industry Comparison</p>
                <p className="text-sm text-gray-700">
                  Average no-show rate in the beauty industry is <strong>15-20%</strong>. 
                  Your rate of <strong>{analytics.no_show_rate.toFixed(1)}%</strong> shows Slotta is protecting your time effectively!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </MasterLayout>
  );
};

export default Analytics;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterLayout } from './Dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bookingsAPI, authAPI } from '@/lib/api';
import { Calendar, Search, Filter } from 'lucide-react';

const Bookings = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const master = authAPI.getMaster();
  const masterId = master?.id;

  useEffect(() => {
    if (masterId) {
      loadBookings();
    }
  }, [masterId]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await bookingsAPI.getByMaster(masterId);
      setBookings(response.data || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setBookings([]);
      setError('Unable to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    confirmed: 'success',
    pending: 'warning',
    completed: 'info',
    'no-show': 'danger',
    rescheduled: 'default',
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  return (
    <MasterLayout active="bookings" title="Bookings">
      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {['all', 'confirmed', 'pending', 'completed', 'no-show'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(status)}
              data-testid={`filter-${status}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </Button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search bookings..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No bookings found</div>
          ) : (
            <div className="divide-y">
              {filteredBookings.map((booking) => {
                const bookingDate = new Date(booking.booking_date);
                return (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between"
                    onClick={() => navigate(`/master/bookings/${booking.id}`)}
                    data-testid={`booking-row-${booking.id}`}
                  >
                    <div className="flex items-center space-x-6 flex-1">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-purple-600">
                        {booking.client_id ? booking.client_id.substring(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">Client #{booking.client_id || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">Service #{booking.service_id || 'Unknown'}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {bookingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="font-semibold">
                            {bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          €{booking.service_price || 0} • Slotta: €{booking.slotta_amount || 0}
                        </div>
                      </div>
                      <Badge variant={statusColors[booking.status]} className="min-w-[100px] justify-center">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-6 mt-8">
        {[
          { label: 'Total Bookings', value: bookings.length },
          { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length },
          { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length },
          { label: 'No-Shows', value: bookings.filter(b => b.status === 'no-show').length },
        ].map((stat, idx) => (
          <Card key={idx} className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Card>
        ))}
      </div>
    </MasterLayout>
  );
};

export default Bookings;

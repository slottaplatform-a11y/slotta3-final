import React, { useState, useEffect } from 'react';
import { MasterLayout } from './Dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { calendarAPI, bookingsAPI, authAPI } from '@/lib/api';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const master = authAPI.getMaster();
  const masterId = master?.id;
  
  const [blockForm, setBlockForm] = useState({
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  });

  useEffect(() => {
    if (masterId) {
      loadCalendarData();
    }
  }, [masterId, currentDate]);

  const loadCalendarData = async () => {
    try {
      const [bookingsRes, blocksRes] = await Promise.all([
        bookingsAPI.getByMaster(masterId),
        calendarAPI.getBlocksByMaster(masterId)
      ]);
      setBookings(bookingsRes.data || []);
      setBlocks(blocksRes.data || []);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const handleBlockTime = async () => {
    try {
      setLoading(true);
      const startDateTime = new Date(`${blockForm.date}T${blockForm.start_time}:00`);
      const endDateTime = new Date(`${blockForm.date}T${blockForm.end_time}:00`);
      
      await calendarAPI.createBlock({
        master_id: masterId,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        reason: blockForm.reason
      });
      
      alert('✅ Time blocked successfully!');
      setShowBlockModal(false);
      setBlockForm({ date: '', start_time: '09:00', end_time: '17:00', reason: '' });
      loadCalendarData(); // Refresh data
    } catch (error) {
      console.error('Failed to block time:', error);
      alert('❌ Failed to block time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MasterLayout active="calendar" title="Calendar">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentDate(newDate);
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + 7);
              setCurrentDate(newDate);
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <Button size="sm" onClick={() => setShowBlockModal(true)} data-testid="block-time-btn">
          <Plus className="w-4 h-4 mr-2" />
          Block Time
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 border-b bg-gray-50">
              <div className="p-4 border-r text-sm text-gray-500">Time</div>
              {weekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className={`p-4 border-r text-center ${isToday ? 'bg-purple-50' : ''}`}>
                    <div className="text-sm text-gray-500">
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-purple-600' : ''}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-8">
              {hours.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="p-4 border-r border-b text-sm text-gray-500">{hour}:00</div>
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayBookings = bookings.filter(b => b.date === dateStr);
                    const hourBookings = dayBookings.filter(b => {
                      const startHour = parseInt(b.start.split(':')[0]);
                      return startHour === hour;
                    });
                    
                    // Check if this hour is blocked
                    const isBlocked = blocks.some(block => {
                      const blockDate = block.start_datetime?.split('T')[0];
                      if (blockDate !== dateStr) return false;
                      const blockStartHour = parseInt(block.start_datetime?.split('T')[1]?.split(':')[0] || 0);
                      const blockEndHour = parseInt(block.end_datetime?.split('T')[1]?.split(':')[0] || 0);
                      return hour >= blockStartHour && hour < blockEndHour;
                    });
                    
                    const blockInfo = blocks.find(block => {
                      const blockDate = block.start_datetime?.split('T')[0];
                      if (blockDate !== dateStr) return false;
                      const blockStartHour = parseInt(block.start_datetime?.split('T')[1]?.split(':')[0] || 0);
                      return hour === blockStartHour;
                    });

                    return (
                      <div key={dayIdx} className={`border-r border-b p-2 min-h-[80px] cursor-pointer relative ${isBlocked ? 'bg-gray-100' : 'hover:bg-gray-50'}`} data-testid={`slot-${dateStr}-${hour}`}>
                        {/* Show blocked time indicator */}
                        {blockInfo && (
                          <div className="bg-gray-300 border-l-4 border-gray-600 rounded p-2 mb-2 text-xs">
                            <div className="font-semibold text-gray-700">🚫 Blocked</div>
                            <div className="text-gray-600">{blockInfo.reason || 'Unavailable'}</div>
                          </div>
                        )}
                        {/* Show bookings */}
                        {hourBookings.map((booking) => (
                          <div key={booking.id} className={`bg-${booking.color}-100 border-l-4 border-${booking.color}-600 rounded p-2 mb-2 text-xs`}>
                            <div className="font-semibold">{booking.start}</div>
                            <div className="font-medium">{booking.client}</div>
                            <div className="text-gray-600">{booking.service}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Time Modal */}
      <Dialog open={showBlockModal} onOpenChange={(open) => setShowBlockModal(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Block Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">Block time on your calendar to prevent bookings during specific periods.</p>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={blockForm.date}
                onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={blockForm.start_time}
                  onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={blockForm.end_time}
                  onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Lunch break, Personal appointment"
                value={blockForm.reason}
                onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <Button variant="outline" onClick={() => setShowBlockModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleBlockTime} className="flex-1" disabled={loading || !blockForm.date} data-testid="submit-block-time">
                {loading ? 'Blocking...' : 'Block Time'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-4 gap-6 mt-6">
        {(() => {
          // Calculate dynamic stats
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          
          // Bookings this week
          const weekBookings = bookings.filter(b => {
            const bookingDate = new Date(b.booking_date);
            return bookingDate >= weekStart && bookingDate < weekEnd && 
                   (b.status === 'confirmed' || b.status === 'pending');
          }).length;
          
          // Calculate blocked hours
          const totalBlockedHours = blocks.reduce((total, block) => {
            const start = new Date(block.start_datetime);
            const end = new Date(block.end_datetime);
            const hours = (end - start) / (1000 * 60 * 60);
            return total + hours;
          }, 0);
          
          // Available slots (assuming 9am-5pm, 6 days, minus blocked and booked)
          const workHoursPerDay = 8;
          const workDays = 6;
          const totalWeekSlots = workHoursPerDay * workDays * 2; // 30-min slots
          const bookedSlots = weekBookings;
          const blockedSlots = Math.round(totalBlockedHours * 2);
          const availableSlots = Math.max(0, totalWeekSlots - bookedSlots - blockedSlots);
          
          // Utilization rate
          const usedSlots = bookedSlots + blockedSlots;
          const utilization = totalWeekSlots > 0 ? Math.round((usedSlots / totalWeekSlots) * 100) : 0;
          
          const stats = [
            { label: 'This Week', value: `${weekBookings} booking${weekBookings !== 1 ? 's' : ''}` },
            { label: 'Available Slots', value: `${availableSlots}` },
            { label: 'Blocked Time', value: `${Math.round(totalBlockedHours)} hour${totalBlockedHours !== 1 ? 's' : ''}` },
            { label: 'Utilization', value: `${utilization}%` },
          ];
          
          return stats.map((stat, idx) => (
            <Card key={idx} className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </Card>
          ));
        })()}
      </div>
    </MasterLayout>
  );
};

export default Calendar;

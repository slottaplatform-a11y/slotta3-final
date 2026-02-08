import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MasterLayout } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { messagesAPI, bookingsAPI, servicesAPI, clientsAPI, authAPI } from '@/lib/api';
import { 
  Clock, Calendar, DollarSign, Shield, User, Phone, Mail, 
  AlertTriangle, CheckCircle, XCircle, Edit, MessageCircle, Loader2
} from 'lucide-react';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [booking, setBooking] = useState(null);
  const [service, setService] = useState(null);
  const [client, setClient] = useState(null);
  
  const master = authAPI.getMaster();
  const masterId = master?.id;

  useEffect(() => {
    if (id) {
      loadBookingDetails();
    }
  }, [id]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      
      // Get booking
      const bookingRes = await bookingsAPI.getById(id);
      const bookingData = bookingRes.data;
      setBooking(bookingData);
      
      // Get service details
      try {
        const serviceRes = await servicesAPI.getById(bookingData.service_id);
        setService(serviceRes.data);
      } catch (e) {
        console.error('Failed to load service:', e);
      }
      
      // Get client details
      try {
        const clientRes = await clientsAPI.getById(bookingData.client_id);
        setClient(clientRes.data);
      } catch (e) {
        console.error('Failed to load client:', e);
      }
      
    } catch (error) {
      console.error('Failed to load booking:', error);
      alert('Failed to load booking details');
      navigate('/master/bookings');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    confirmed: 'success',
    pending: 'warning',
    completed: 'info',
    cancelled: 'danger',
    'no-show': 'danger',
  };

  const reliabilityColors = {
    reliable: 'success',
    new: 'warning',
    'needs-protection': 'danger',
  };

  const handleComplete = async () => {
    try {
      await bookingsAPI.complete(id);
      alert('✅ Booking marked as completed!');
      navigate('/master/bookings');
    } catch (error) {
      console.error('Failed to complete booking:', error);
      alert('❌ Failed to update booking');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setSendingMessage(true);
      await messagesAPI.sendToClient({
        master_id: masterId,
        client_id: booking.client_id,
        booking_id: id,
        message: messageText
      });
      
      alert('✅ Message sent successfully!');
      setShowMessageModal(false);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('❌ Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNoShow = async () => {
    if (window.confirm('Mark this booking as no-show? The Slotta hold will be captured.')) {
      try {
        const response = await bookingsAPI.noShow(id);
        alert(`✅ No-show processed!\nMaster compensation: €${response.data.master_compensation}\nClient wallet credit: €${response.data.client_wallet_credit}`);
        navigate('/master/bookings');
      } catch (error) {
        console.error('Failed to mark no-show:', error);
        alert('❌ Failed to process no-show');
      }
    }
  };

  if (loading) {
    return (
      <MasterLayout active="bookings" title="Booking Details">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </MasterLayout>
    );
  }

  if (!booking) {
    return (
      <MasterLayout active="bookings" title="Booking Details">
        <div className="text-center py-12 text-gray-500">Booking not found</div>
      </MasterLayout>
    );
  }

  const bookingDate = booking.booking_date ? new Date(booking.booking_date) : new Date();

  return (
    <MasterLayout active="bookings" title="Booking Details">
      <div className="max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/master/bookings')} className="mb-6">
          ← Back to Bookings
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Booking Information</CardTitle>
                  <Badge variant={statusColors[booking.status] || 'default'}>
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Service</div>
                      <div className="font-semibold">{service?.name || 'Service'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Duration</div>
                      <div className="font-semibold">{booking.duration_minutes || service?.duration_minutes || 60} minutes</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Date & Time</div>
                      <div className="font-semibold flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {bookingDate.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="font-semibold flex items-center space-x-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Booked On</div>
                      <div className="font-semibold">
                        {booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-sm text-gray-500 mb-1">Notes</div>
                    <p className="text-gray-700">{booking.notes || 'No notes added'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{client?.name || 'Client'}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{client?.email || 'No email'}</span>
                      </div>
                      {client?.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={reliabilityColors[client?.reliability] || 'warning'} className="mb-2">
                      {client?.reliability === 'reliable' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {client?.reliability === 'needs-protection' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {client?.reliability || 'New'}
                    </Badge>
                    <div className="text-sm text-gray-500">
                      {client?.total_bookings || 0} bookings • {client?.no_shows || 0} no-shows
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowMessageModal(true)}
                    data-testid="message-client-btn"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle>Pricing & Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Service Price</span>
                    <span className="text-2xl font-bold">€{booking.service_price || service?.price || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center space-x-2 text-purple-600">
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">Slotta Amount</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">€{booking.slotta_amount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Risk Score</span>
                    <span>{booking.risk_score || 0}%</span>
                  </div>
                  {booking.stripe_payment_intent_id && (
                    <div className="flex items-center space-x-2 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Payment Authorized</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reschedule Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Reschedule Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Free Reschedule Until</span>
                    <span className="font-semibold">
                      {booking.reschedule_deadline 
                        ? new Date(booking.reschedule_deadline).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  {booking.reschedule_deadline && new Date() > new Date(booking.reschedule_deadline) && (
                    <div className="flex items-center space-x-2 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Reschedule deadline passed</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {(booking.status === 'confirmed' || booking.status === 'pending') && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={handleComplete}
                    data-testid="complete-booking-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-600 hover:bg-red-50"
                    onClick={handleNoShow}
                    data-testid="no-show-btn"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark as No-Show
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message {client?.name || 'Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              placeholder="Type your message here..."
              data-testid="message-textarea"
            />
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowMessageModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage} 
                className="flex-1"
                disabled={sendingMessage}
                data-testid="send-message-btn"
              >
                {sendingMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
};

export default BookingDetail;

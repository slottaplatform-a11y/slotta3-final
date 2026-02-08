import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Star, Shield, CheckCircle, Calendar, Info, Loader2, AlertCircle } from 'lucide-react';
import { mastersAPI, servicesAPI, bookingsAPI } from '@/lib/api';

// Initialize Stripe (Vite env)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// Stripe Card Form Component
const StripeCardForm = ({ onSubmit, loading, slottaAmount, masterName }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    
    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      // Pass payment method ID to parent for booking creation
      await onSubmit(paymentMethod.id);
    } catch (err) {
      setError(err.message || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">Payment Information</h3>
        <div className="p-4 border rounded-lg bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        {error && (
          <div className="mt-3 flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Your card will be authorized for €{slottaAmount}. This is a hold, not a charge.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full py-3"
        disabled={!stripe || processing || loading}
        data-testid="authorize-payment-btn"
      >
        {processing || loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Authorize €${slottaAmount}`
        )}
      </Button>
    </form>
  );
};

const BookingPage = () => {
  const { mastername } = useParams();
  const navigate = useNavigate();
  const [master, setMaster] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingBooking, setProcessingBooking] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Client form data
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Generate available time slots for the next 7 days
  const generateTimeSlots = () => {
    const slots = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      const daySlots = [];
      const startHour = 9;
      const endHour = 17;
      
      for (let hour = startHour; hour < endHour; hour++) {
        daySlots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < endHour - 1) {
          daySlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
      
      slots.push({
        date: date.toISOString().split('T')[0],
        slots: daySlots
      });
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    loadMasterData();
  }, [mastername]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load master by booking slug
      const masterResponse = await mastersAPI.getBySlug(mastername);
      const masterData = masterResponse.data;
      setMaster(masterData);
      
      // Load master's services
      const servicesResponse = await servicesAPI.getByMaster(masterData.id, true);
      setServices(servicesResponse.data || []);
      
    } catch (err) {
      console.error('Failed to load master:', err);
      setError('Professional not found. Please check the booking link.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = () => {
    if (!selectedService || !selectedSlot || !clientData.name || !clientData.email) {
      setFormError('Please complete all required fields before continuing.');
      return;
    }
    setFormError('');
    setShowPayment(true);
  };

  const handlePaymentSubmit = async (paymentMethodId) => {
    try {
      setProcessingBooking(true);
      setFormError('');
      
      const service = services.find(s => s.id === selectedService);
      const [date, time] = selectedSlot.split(' ');
      
      // Create booking with payment
      const bookingResponse = await bookingsAPI.createWithPayment({
        master_id: master.id,
        service_id: selectedService,
        booking_date: new Date(`${date}T${time}:00`).toISOString(),
        client_name: clientData.name,
        client_email: clientData.email,
        client_phone: clientData.phone,
        payment_method_id: paymentMethodId
      });
      
      setBookingDetails({
        ...bookingResponse.data,
        service_name: service.name,
        master_name: master.name,
        date: date,
        time: time,
        slotta_amount: service.base_slotta || Math.round(service.price * 0.3)
      });
      
      setBookingComplete(true);
      
    } catch (err) {
      console.error('Booking failed:', err);
      setFormError(err.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setProcessingBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  if (bookingComplete) {
    const service = services.find(s => s.id === selectedService);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-4" data-testid="booking-confirmed-title">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 mb-6">
            You're all set! A confirmation email has been sent to {clientData.email}.
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Service</span>
              <span className="font-semibold">{service?.name}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Date & Time</span>
              <span className="font-semibold">{selectedSlot}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">With</span>
              <span className="font-semibold">{master?.name}</span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="text-gray-600">Slotta Amount</span>
              <span className="font-semibold text-purple-600">
                €{service?.base_slotta || Math.round(service?.price * 0.3)} (held, not charged)
              </span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              <strong>Important:</strong> Show up on time and your card hold will be released immediately.
              If you need to reschedule, do so at least 24 hours before your appointment.
            </p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Button className="flex-1" onClick={() => navigate('/client/portal')}>
              View My Bookings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showPayment) {
    const service = services.find(s => s.id === selectedService);
    const slottaAmount = service?.base_slotta || Math.round(service?.price * 0.3);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-2xl mx-auto pt-12">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6" data-testid="payment-title">Authorize Payment</h2>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-3 mb-4">
                <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">How Slotta Works</h3>
                  <p className="text-sm text-purple-700 leading-relaxed">
                    We'll authorize <strong>€{slottaAmount}</strong> on your card to protect {master?.name}'s time.
                    This amount is <strong>held, not charged</strong>. If you show up, it's released immediately.
                    If you can't make it, please reschedule before the deadline to avoid charges.
                  </p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service</span>
                  <span className="font-semibold">{service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold">{service?.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time</span>
                  <span className="font-semibold">{selectedSlot}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-600">Full Price</span>
                  <span className="text-lg font-bold">€{service?.price}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span className="font-medium">Slotta Amount (Hold)</span>
                  <span className="text-lg font-bold">€{slottaAmount}</span>
                </div>
                <p className="text-xs text-gray-500 pt-2">
                  Full payment of €{service?.price} due at appointment. Slotta released when you arrive.
                </p>
              </div>
            </div>

            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCardForm
                  onSubmit={handlePaymentSubmit}
                  loading={processingBooking}
                  slottaAmount={slottaAmount}
                  masterName={master?.name}
                />
              </Elements>
            ) : (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-700">
                Payment is not available right now. Missing Stripe publishable key.
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowPayment(false)}
            >
              Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Slotta
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Master Profile */}
        <Card className="mb-8 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-8">
              <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                {master?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
            </div>
            <div className="md:w-2/3 p-8">
              <h1 className="text-3xl font-bold mb-2" data-testid="master-name">{master?.name}</h1>
              <p className="text-purple-600 font-medium mb-4">{master?.specialty || 'Professional'}</p>
              {master?.location && (
                <div className="flex items-center space-x-1 text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{master.location}</span>
                </div>
              )}
              <p className="text-gray-600 mb-4">{master?.bio || 'Book your appointment with confidence.'}</p>
              <Badge variant="purple">
                <Shield className="w-3 h-3 mr-1" />
                Slotta Protected
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Services */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold mb-4" data-testid="services-title">Select a Service</h2>
            {services.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                No services available at the moment.
              </Card>
            ) : (
              services.map((service) => {
                const slottaAmount = service.base_slotta || Math.round(service.price * 0.3);
                return (
                  <Card
                    key={service.id}
                    className={`p-6 cursor-pointer transition ${
                      selectedService === service.id
                        ? 'ring-2 ring-purple-600 bg-purple-50'
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => setSelectedService(service.id)}
                    data-testid={`service-${service.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration_minutes} min</span>
                          </div>
                          <div className="font-semibold text-lg text-gray-900">€{service.price}</div>
                        </div>
                        <div className="inline-flex items-center space-x-2 bg-purple-100 px-3 py-1 rounded-full">
                          <Shield className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">
                            Slotta: €{slottaAmount}
                          </span>
                        </div>
                      </div>
                      {selectedService === service.id && (
                        <CheckCircle className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                  </Card>
                );
              })
            )}

            {/* Time Slots */}
            {selectedService && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4" data-testid="timeslots-title">Select Date & Time</h2>
                {timeSlots.map((day, idx) => (
                  <Card key={idx} className="p-6 mb-4">
                    <h3 className="font-semibold mb-3">
                      {new Date(day.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {day.slots.map((slot) => {
                        const slotKey = `${day.date} ${slot}`;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slotKey)}
                            className={`px-3 py-2 rounded-lg border transition text-sm ${
                              selectedSlot === slotKey
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'border-gray-300 hover:border-purple-600'
                            }`}
                            data-testid={`slot-${slotKey}`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Client Information */}
            {selectedSlot && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Your Information</h2>
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        type="text"
                        value={clientData.name}
                        onChange={(e) => {
                          setClientData({ ...clientData, name: e.target.value });
                          if (formError) setFormError('');
                        }}
                        placeholder="John Doe"
                        required
                        data-testid="client-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={clientData.email}
                        onChange={(e) => {
                          setClientData({ ...clientData, email: e.target.value });
                          if (formError) setFormError('');
                        }}
                        placeholder="john@example.com"
                        required
                        data-testid="client-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone (optional)</Label>
                      <Input
                        type="tel"
                        value={clientData.phone}
                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                        placeholder="+44 7700 900000"
                        data-testid="client-phone"
                      />
                    </div>
                    {formError && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div>
            <Card className="p-6 sticky top-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              {!selectedService ? (
                <p className="text-gray-500 text-sm">Select a service to continue</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Service</div>
                    <div className="font-semibold">
                      {services.find(s => s.id === selectedService)?.name}
                    </div>
                  </div>
                  {selectedSlot && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Date & Time</div>
                      <div className="font-semibold">{selectedSlot}</div>
                    </div>
                  )}
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Price</span>
                      <span className="font-semibold">
                        €{services.find(s => s.id === selectedService)?.price}
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-600">
                      <span className="font-medium">Slotta (Hold)</span>
                      <span className="font-bold">
                        €{services.find(s => s.id === selectedService)?.base_slotta || 
                          Math.round(services.find(s => s.id === selectedService)?.price * 0.3)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-700">
                        Only Slotta amount will be authorized. Released when you arrive.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!selectedService || !selectedSlot || !clientData.name || !clientData.email}
                    onClick={handleContinueToPayment}
                    data-testid="continue-booking-btn"
                  >
                    Continue to Payment
                  </Button>
                  {formError && (
                    <div className="mt-3 flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{formError}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;

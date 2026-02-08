import React, { useState, useEffect } from 'react';
import { MasterLayout } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mastersAPI, authAPI, googleCalendarAPI, stripeAPI, walletAPI, telegramAPI } from '@/lib/api';
import { 
  User, Bell, Clock, Link as LinkIcon, CreditCard, Shield, Save, 
  Calendar, Upload, CheckCircle, AlertCircle, RefreshCw, Loader2, Camera,
  DollarSign, ExternalLink, Banknote, MessageCircle, Send
} from 'lucide-react';

const Settings = () => {
  const master = authAPI.getMaster();
  const masterId = master?.id;
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLastSync, setCalendarLastSync] = useState(null);
  const [calendarLastSyncStatus, setCalendarLastSyncStatus] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: master?.name || '',
    email: master?.email || '',
    phone: master?.phone || '',
    specialty: master?.specialty || '',
    bio: master?.bio || '',
    location: master?.location || '',
    photo_url: master?.photo_url || ''
  });
  
  const [settings, setSettings] = useState({
    daily_summary_enabled: master?.settings?.daily_summary_enabled !== false,
    summary_time: master?.settings?.summary_time || '08:00',
    timezone: master?.settings?.timezone || 'Europe/Lisbon'  // Default to Portugal
  });
  
  // Stripe Connect state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [payoutLoading, setPayoutLoading] = useState(false);
  
  // Notification Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    'new-booking': { email: true, telegram: false },
    'reschedule': { email: true, telegram: false },
    'no-show': { email: true, telegram: false },
    'payout': { email: true, telegram: false },
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsToast, setPrefsToast] = useState(false);
  
  const bookingLink = master?.booking_slug ? `${window.location.origin}/${master.booking_slug}` : '';

  useEffect(() => {
    if (masterId) {
      checkCalendarStatus();
      checkStripeStatus();
      checkTelegramStatus();
      loadWalletBalance();
      loadNotificationPrefs();
    }
  }, [masterId]);

  const loadNotificationPrefs = async () => {
    try {
      const response = await mastersAPI.getById(masterId);
      if (response.data?.notification_preferences) {
        setNotificationPrefs(response.data.notification_preferences);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    try {
      setPrefsSaving(true);
      await mastersAPI.update(masterId, { notification_preferences: notificationPrefs });
      setPrefsToast(true);
      setTimeout(() => setPrefsToast(false), 3000);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      alert('❌ Failed to save preferences. Please try again.');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleNotificationPrefChange = (notifId, channel, checked) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [notifId]: {
        ...prev[notifId],
        [channel]: checked
      }
    }));
  };

  const checkTelegramStatus = async () => {
    try {
      const response = await telegramAPI.getStatus(masterId);
      setTelegramConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check Telegram status:', error);
    }
  };

  const handleConnectTelegram = () => {
    // Open Telegram bot in new window
    const botUsername = 'slotta_booking_bot';
    window.open(`https://t.me/${botUsername}?start=${masterId}`, '_blank');
    
    // Show instructions
    const chatId = prompt(
      '📱 Telegram Connection Instructions:\n\n' +
      '1. Click OK to open Telegram\n' +
      '2. Send /start to the bot\n' +
      '3. The bot will give you your Chat ID\n' +
      '4. Enter that Chat ID here:\n\n' +
      '(Enter your Chat ID from the bot)'
    );
    
    if (chatId && chatId.trim()) {
      connectTelegramWithChatId(chatId.trim());
    }
  };

  const connectTelegramWithChatId = async (chatId) => {
    try {
      setTelegramLoading(true);
      await telegramAPI.connect(masterId, chatId);
      setTelegramConnected(true);
      alert('✅ Telegram connected successfully! You will now receive notifications.');
    } catch (error) {
      console.error('Failed to connect Telegram:', error);
      alert('❌ Failed to connect Telegram. Please check the Chat ID and try again.');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!window.confirm('Disconnect Telegram notifications?')) return;
    
    try {
      setTelegramLoading(true);
      await telegramAPI.disconnect(masterId);
      setTelegramConnected(false);
      alert('Telegram disconnected.');
    } catch (error) {
      console.error('Failed to disconnect Telegram:', error);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTelegramLoading(true);
      await telegramAPI.testNotification(masterId);
      alert('✅ Test notification sent! Check your Telegram.');
    } catch (error) {
      console.error('Failed to send test:', error);
      alert('❌ Failed to send test notification.');
    } finally {
      setTelegramLoading(false);
    }
  };

  const checkStripeStatus = async () => {
    try {
      const response = await stripeAPI.getConnectStatus(masterId);
      setStripeConnected(response.data.connected);
      setPayoutsEnabled(response.data.payouts_enabled);
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const response = await walletAPI.getWallet(masterId);
      setWalletBalance(response.data.wallet_balance || 0);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setStripeLoading(true);
      const response = await stripeAPI.getOnboardingLink(masterId);
      if (response.data.url) {
        window.location.href = response.data.url;
      } else if (response.data.mock) {
        alert('Stripe is in test mode. In production, you would be redirected to Stripe onboarding.');
      }
    } catch (error) {
      console.error('Failed to connect Stripe:', error);
      alert('❌ Failed to start Stripe onboarding.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    try {
      setStripeLoading(true);
      
      // If payouts not enabled, redirect to onboarding instead
      if (!payoutsEnabled) {
        const response = await stripeAPI.getOnboardingLink(masterId);
        if (response.data.url) {
          window.location.href = response.data.url;
        }
        return;
      }
      
      const response = await stripeAPI.getDashboardLink(masterId);
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      } else if (response.data.mock) {
        alert('Stripe dashboard would open in production.');
      }
    } catch (error) {
      console.error('Failed to open Stripe dashboard:', error);
      alert('❌ Failed to open Stripe dashboard. Please complete onboarding first.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (walletBalance < 30) {
      alert('Minimum payout is €30');
      return;
    }
    
    if (!window.confirm(`Request payout of €${walletBalance.toFixed(2)}?`)) {
      return;
    }
    
    try {
      setPayoutLoading(true);
      const response = await stripeAPI.requestPayout(masterId);
      alert(`✅ ${response.data.message}`);
      loadWalletBalance(); // Refresh balance
    } catch (error) {
      console.error('Failed to request payout:', error);
      alert(error.response?.data?.detail || '❌ Payout request failed.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const checkCalendarStatus = async () => {
    try {
      const response = await googleCalendarAPI.syncStatus(masterId);
      setCalendarConnected(response.data.connected);
      setCalendarLastSync(response.data.last_sync_at || null);
      setCalendarLastSyncStatus(response.data.last_sync_status || null);
    } catch (error) {
      console.error('Failed to check calendar status:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await mastersAPI.update(masterId, {
        ...profileData,
        settings: settings
      });
      authAPI.setMaster({ ...master, ...profileData, settings });
      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('❌ Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      setCalendarLoading(true);
      const response = await googleCalendarAPI.getAuthUrl(masterId);
      // Redirect to Google OAuth
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      alert('❌ Failed to connect Google Calendar.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!window.confirm('Disconnect Google Calendar? Your bookings will no longer sync.')) {
      return;
    }
    
    try {
      setCalendarLoading(true);
      await googleCalendarAPI.disconnect(masterId);
      setCalendarConnected(false);
      alert('✅ Google Calendar disconnected.');
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      alert('❌ Failed to disconnect.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleImportCalendarEvents = async () => {
    try {
      setCalendarLoading(true);
      const response = await googleCalendarAPI.importEvents(masterId);
      alert(`✅ Imported ${response.data.imported_count} events as blocked time!`);
    } catch (error) {
      console.error('Failed to import events:', error);
      alert('❌ Failed to import calendar events.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSyncToGoogle = async () => {
    try {
      setCalendarLoading(true);
      const response = await googleCalendarAPI.syncBookings(masterId);
      alert(`✅ Synced ${response.data.synced_count} bookings to Google Calendar!`);
    } catch (error) {
      console.error('Failed to sync to Google:', error);
      alert('❌ Failed to sync bookings to Google Calendar.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleFullSync = async () => {
    try {
      setCalendarLoading(true);
      const response = await googleCalendarAPI.fullSync(masterId);
      alert(`✅ Full sync completed!\n• ${response.data.bookings_synced_to_google} bookings → Google\n• ${response.data.events_imported_from_google} events → Slotta`);
    } catch (error) {
      console.error('Failed to perform full sync:', error);
      alert('❌ Failed to perform full sync.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setImageUploading(true);
      
      // Convert to base64 for storage (simple approach)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setProfileData({ ...profileData, photo_url: base64 });
        
        // Save to backend
        await mastersAPI.update(masterId, { photo_url: base64 });
        authAPI.setMaster({ ...master, photo_url: base64 });
        
        alert('✅ Profile photo updated!');
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('❌ Failed to upload image.');
      setImageUploading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingLink);
    alert('✅ Link copied to clipboard!');
  };

  return (
    <MasterLayout active="settings" title="Settings">
      {/* Profile Photo */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profileData.photo_url ? (
                <img 
                  src={profileData.photo_url} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-100"
                />
              ) : (
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold border-4 border-purple-200">
                  {profileData.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            </div>
            <div>
              <h3 className="font-semibold">{profileData.name || 'Your Name'}</h3>
              <p className="text-sm text-gray-600">{profileData.specialty || 'Add your specialty'}</p>
              {imageUploading && (
                <div className="flex items-center space-x-2 text-purple-600 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
              <input
                type="text"
                value={profileData.specialty}
                onChange={(e) => setProfileData({...profileData, specialty: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., London, UK"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                rows="3"
                value={profileData.bio}
                onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Tell clients about yourself and your services..."
              ></textarea>
            </div>
          </div>
          <Button className="mt-6" onClick={handleSaveProfile} disabled={loading} data-testid="save-profile-btn">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Booking Link */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Booking Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <div className="flex-1 flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-lg border">
              <LinkIcon className="w-5 h-5 text-gray-400" />
              <span className="font-mono text-purple-600" data-testid="booking-link">{bookingLink}</span>
            </div>
            <Button variant="outline" onClick={copyToClipboard}>Copy Link</Button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Share this link with clients for easy booking. It's your unique Slotta booking page.
          </p>
        </CardContent>
      </Card>

      {/* Google Calendar Sync */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Google Calendar Sync</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${calendarConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {calendarConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Calendar className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Google Calendar</div>
                  <div className="text-sm text-gray-600">
                    {calendarConnected ? 'Connected - Two-way sync enabled' : 'Not connected'}
                  </div>
                  {calendarLastSync && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last sync: {new Date(calendarLastSync).toLocaleString('en-GB')}
                      {calendarLastSyncStatus ? ` • ${calendarLastSyncStatus}` : ''}
                    </div>
                  )}
                </div>
              </div>
              {!calendarConnected && (
                <Button onClick={handleConnectCalendar} disabled={calendarLoading}>
                  {calendarLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                  Connect Calendar
                </Button>
              )}
            </div>
            
            {calendarConnected && (
              <>
                {/* Two-way Sync Controls */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Upload className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-800">Slotta → Google</span>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">
                      Push your Slotta bookings to Google Calendar
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleSyncToGoogle}
                      disabled={calendarLoading}
                      className="w-full"
                    >
                      {calendarLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Sync Bookings to Google
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Google → Slotta</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Import Google events as blocked time
                    </p>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={handleImportCalendarEvents}
                      disabled={calendarLoading}
                      className="w-full"
                    >
                      {calendarLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Import Events as Blocked Time
                    </Button>
                  </div>
                </div>
                
                {/* Full Sync Button */}
                <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">Full Two-Way Sync</div>
                      <p className="text-sm text-gray-600">Sync everything in both directions</p>
                    </div>
                    <Button 
                      onClick={handleFullSync}
                      disabled={calendarLoading}
                    >
                      {calendarLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Full Sync
                    </Button>
                  </div>
                </div>
                
                {/* Disconnect Option */}
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnectCalendar}
                    disabled={calendarLoading}
                  >
                    Disconnect Google Calendar
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Telegram Notifications */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Telegram Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${telegramConnected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {telegramConnected ? (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Telegram Bot</div>
                  <div className="text-sm text-gray-600">
                    {telegramConnected ? 'Connected - Instant notifications enabled' : 'Not connected'}
                  </div>
                </div>
              </div>
              {!telegramConnected ? (
                <Button onClick={handleConnectTelegram} disabled={telegramLoading}>
                  {telegramLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                  Connect Telegram
                </Button>
              ) : (
                <Badge variant="success">Connected</Badge>
              )}
            </div>
            
            {telegramConnected && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-medium text-blue-800">Test Your Connection</div>
                  <p className="text-sm text-blue-600">Send a test notification to verify it's working</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestTelegram}
                    disabled={telegramLoading}
                  >
                    {telegramLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                    Send Test
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnectTelegram}
                    disabled={telegramLoading}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
            
            {!telegramConnected && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium mb-2">How to connect:</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Click "Connect Telegram" button above</li>
                  <li>Open the Slotta bot in Telegram</li>
                  <li>Send <code className="bg-gray-200 px-1 rounded">/start</code> to the bot</li>
                  <li>Copy the Chat ID the bot gives you</li>
                  <li>Paste it when prompted</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Daily Summary Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Quick Stats Email</div>
                <div className="text-sm text-gray-600">
                  Receive a daily summary with your bookings, time protected, and pending payouts
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.daily_summary_enabled}
                  onChange={(e) => setSettings({...settings, daily_summary_enabled: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            {settings.daily_summary_enabled && (
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Send Time</label>
                  <select 
                    value={settings.summary_time}
                    onChange={(e) => setSettings({...settings, summary_time: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="06:00">6:00 AM</option>
                    <option value="07:00">7:00 AM</option>
                    <option value="08:00">8:00 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="20:00">8:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select 
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <optgroup label="🇪🇺 Europe">
                      <option value="Europe/Lisbon">Lisbon (WET)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Europe/Berlin">Berlin (CET)</option>
                      <option value="Europe/Oslo">Oslo (CET)</option>
                      <option value="Europe/Kyiv">Kyiv (EET)</option>
                    </optgroup>
                    <optgroup label="🇺🇸 USA">
                      <option value="America/New_York">New York (EST)</option>
                      <option value="America/Chicago">Chicago (CST)</option>
                      <option value="America/Los_Angeles">Los Angeles (PST)</option>
                    </optgroup>
                    <optgroup label="🌍 Other">
                      <option value="Asia/Dubai">Dubai (GST)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 'new-booking', label: 'New Booking', desc: 'Get notified when someone books' },
              { id: 'reschedule', label: 'Reschedule Requests', desc: 'Client wants to change their appointment' },
              { id: 'no-show', label: 'No-Show Alerts', desc: 'Client didn\'t show up for appointment' },
              { id: 'payout', label: 'Payout Confirmations', desc: 'Money transferred to your account' },
            ].map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{notif.label}</div>
                  <div className="text-sm text-gray-600">{notif.desc}</div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationPrefs[notif.id]?.email ?? true}
                      onChange={(e) => handleNotificationPrefChange(notif.id, 'email', e.target.checked)}
                      className="w-4 h-4 accent-purple-600" 
                    />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationPrefs[notif.id]?.telegram ?? false}
                      onChange={(e) => handleNotificationPrefChange(notif.id, 'telegram', e.target.checked)}
                      className="w-4 h-4 accent-purple-600" 
                    />
                    <span className="text-sm">Telegram</span>
                  </label>
                </div>
              </div>
            ))}
            
            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-500">
                Choose how you want to be notified for each event type
              </p>
              <Button 
                onClick={handleSaveNotificationPrefs} 
                disabled={prefsSaving}
                className="min-w-[140px]"
              >
                {prefsSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Success Toast */}
          {prefsToast && (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse z-50">
              <CheckCircle className="w-5 h-5" />
              <span>Preferences saved successfully</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Settings - Stripe Connect */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment & Payouts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stripe Connect Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stripeConnected && payoutsEnabled ? 'bg-green-100' : stripeConnected ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  {stripeConnected && payoutsEnabled ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : stripeConnected ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Stripe Connect</div>
                  <div className="text-sm text-gray-600">
                    {stripeConnected && payoutsEnabled 
                      ? 'Connected - Ready to receive payments' 
                      : stripeConnected 
                        ? 'Connected - Complete onboarding to receive payments'
                        : 'Not connected - Set up to receive payments'}
                  </div>
                </div>
              </div>
              {stripeConnected && payoutsEnabled ? (
                <Badge variant="success">Active</Badge>
              ) : stripeConnected ? (
                <Badge variant="warning">Pending Setup</Badge>
              ) : (
                <Button onClick={handleConnectStripe} disabled={stripeLoading}>
                  {stripeLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Connect Stripe
                </Button>
              )}
            </div>

            {stripeConnected && (
              <>
                {/* Wallet Balance & Payout */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Available Balance</div>
                      <div className="text-3xl font-bold text-purple-600">€{walletBalance.toFixed(2)}</div>
                    </div>
                    <Button 
                      onClick={handleRequestPayout}
                      disabled={payoutLoading || walletBalance < 30}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {payoutLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Banknote className="w-4 h-4 mr-2" />
                      )}
                      Request Payout
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum payout: €30 • Stripe fee: €0.25 per payout
                  </p>
                </div>

                {/* Payout Overview Card */}
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h4 className="font-semibold mb-3">Payout Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payout Method</span>
                      <span className="font-medium">Connected via Stripe</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Payout</span>
                      <span className="font-medium">€30</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stripe Payout Fee</span>
                      <span className="font-medium">€0.25 per payout</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payout Schedule</span>
                      <span className="font-medium">Managed directly in Stripe</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={handleStripeDashboard} className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage in Stripe
                    </Button>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 Your funds are safely held by Stripe. You can change your payout frequency anytime in your Stripe dashboard.
                    </p>
                  </div>
                </div>

                {/* Stripe Dashboard Link */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {payoutsEnabled ? 'Manage Stripe Account' : 'Complete Stripe Setup'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {payoutsEnabled 
                        ? 'View transactions, update bank details, manage payouts'
                        : 'Finish onboarding to start receiving payments'}
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleStripeDashboard} disabled={stripeLoading}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {payoutsEnabled ? 'Open Stripe Dashboard' : 'Complete Onboarding'}
                  </Button>
                </div>
              </>
            )}

            {!stripeConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <strong>Connect Stripe to:</strong>
                    <ul className="mt-1 list-disc list-inside">
                      <li>Accept card payments from clients</li>
                      <li>Receive automatic payouts to your bank</li>
                      <li>View all transaction history</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Account Status</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Member Since</span>
                <span className="font-semibold">
                  {master?.created_at ? new Date(master.created_at).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Button variant="outline" className="text-red-600 border-red-600" onClick={() => authAPI.logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </MasterLayout>
  );
};

export default Settings;

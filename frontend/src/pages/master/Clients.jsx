import React, { useState, useEffect } from 'react';
import { MasterLayout } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { clientsAPI, authAPI } from '@/lib/api';
import { Star, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const master = authAPI.getMaster();
  const masterId = master?.id;

  useEffect(() => {
    if (masterId) {
      loadClients();
    }
  }, [masterId]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await clientsAPI.getByMaster(masterId);
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
      setError('Unable to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reliabilityConfig = {
    reliable: { variant: 'success', icon: CheckCircle, label: 'Reliable' },
    new: { variant: 'warning', icon: Star, label: 'New Client' },
    'needs-protection': { variant: 'danger', icon: AlertTriangle, label: 'Needs Protection' },
  };

  return (
    <MasterLayout active="clients" title="Client Reliability">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Clients', value: clients.length, icon: Star },
          { label: 'Reliable Clients', value: clients.filter(c => c.reliability === 'reliable').length, icon: CheckCircle, color: 'green' },
          { label: 'New Clients', value: clients.filter(c => c.reliability === 'new').length, icon: TrendingUp, color: 'yellow' },
          { label: 'High Risk', value: clients.filter(c => c.reliability === 'needs-protection').length, icon: AlertTriangle, color: 'red' },
        ].map((stat, idx) => {
          const colorClass = stat.color === 'green'
            ? 'text-green-600'
            : stat.color === 'yellow'
              ? 'text-yellow-600'
              : stat.color === 'red'
                ? 'text-red-600'
                : 'text-purple-600';
          return (
          <Card key={idx} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${colorClass}`} />
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Card>
        );
        })}
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {error && !loading ? (
            <div className="text-center py-8 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg">
              {error}
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-gray-500">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No clients yet. They'll appear here after their first booking.</div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => {
                const config = reliabilityConfig[client.reliability] || reliabilityConfig.new;
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    data-testid={`client-${client.id}`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-purple-600">
                        {client.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{client.total_bookings || 0}</div>
                        <div className="text-xs text-gray-500">Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{client.completed_bookings || 0}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{client.no_shows || 0}</div>
                        <div className="text-xs text-gray-500">No-Shows</div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="font-semibold text-lg">€{client.wallet_balance || 0}</div>
                        <div className="text-xs text-gray-500">Wallet Balance</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Client credit balance: €{client.credit_balance || 0}
                        </div>
                      </div>
                      <Badge variant={config.variant} className="min-w-[140px] justify-center">
                        <config.icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reliability Explanation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Reliability Tags Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Reliable</h4>
              </div>
              <p className="text-sm text-gray-600">
                Excellent booking history with 0-1 no-shows. Slotta reduced by 20%.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Star className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold">New Client</h4>
              </div>
              <p className="text-sm text-gray-600">
                First-time or early bookings. Slotta increased by 20% as protection.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold">Needs Protection</h4>
              </div>
              <p className="text-sm text-gray-600">
                History of 2+ no-shows. Slotta increased by 30% to protect your time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MasterLayout>
  );
};

export default Clients;
